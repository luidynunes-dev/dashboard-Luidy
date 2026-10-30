import React, { useState, useCallback } from 'react';
import { RefreshCw, MessageCircle, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { getAccountFeedbackData } from '../../services/metaService';
import { mapWithConcurrency } from '../../services/kommoService';
import { ALL_STORES, StoreEntry } from '../../config/storeGroups';
import { thresholdFor, THRESHOLDS, CampaignKind } from '../../config/costThresholds';
import type { CampaignFeedback } from '../../services/metaService';

// ─── Período (mesmos atalhos do Gerenciador de Anúncios) ────────────────────

type PresetKey =
  | 'today' | 'yesterday' | 'today_yesterday'
  | 'last_7d' | 'last_14d' | 'last_28d' | 'last_30d'
  | 'this_month' | 'last_month' | 'custom';

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today',           label: 'Hoje' },
  { key: 'yesterday',       label: 'Ontem' },
  { key: 'today_yesterday', label: 'Hoje e ontem' },
  { key: 'last_7d',         label: 'Últimos 7 dias' },
  { key: 'last_14d',        label: 'Últimos 14 dias' },
  { key: 'last_28d',        label: 'Últimos 28 dias' },
  { key: 'last_30d',        label: 'Últimos 30 dias' },
  { key: 'this_month',      label: 'Este mês' },
  { key: 'last_month',      label: 'Mês passado' },
  { key: 'custom',          label: 'Personalizado' },
];

// Data local (não UTC): depois das 21h no horário de Brasília, toISOString() já cai no dia seguinte.
function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

// "Últimos N dias" segue o Gerenciador: N dias terminando ONTEM (hoje não entra).
function rangeFor(preset: PresetKey, customFrom: string, customTo: string): { since: string; until: string } {
  const today = new Date();
  switch (preset) {
    case 'today':           return { since: iso(today), until: iso(today) };
    case 'yesterday':       return { since: iso(addDays(today, -1)), until: iso(addDays(today, -1)) };
    case 'today_yesterday': return { since: iso(addDays(today, -1)), until: iso(today) };
    case 'last_7d':         return { since: iso(addDays(today, -7)),  until: iso(addDays(today, -1)) };
    case 'last_14d':        return { since: iso(addDays(today, -14)), until: iso(addDays(today, -1)) };
    case 'last_28d':        return { since: iso(addDays(today, -28)), until: iso(addDays(today, -1)) };
    case 'last_30d':        return { since: iso(addDays(today, -30)), until: iso(addDays(today, -1)) };
    case 'this_month':      return { since: iso(new Date(today.getFullYear(), today.getMonth(), 1)), until: iso(today) };
    case 'last_month':      return {
      since: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      until: iso(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
    case 'custom':          return { since: customFrom, until: customTo };
  }
}

// ─── Tipos de campanha acompanhados ─────────────────────────────────────────

const KINDS: { key: CampaignKind; label: string; unidade: string; plural: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp',       unidade: 'msg',    plural: 'mensagens' },
  { key: 'vip',      label: 'Grupo VIP',      unidade: 'msg',    plural: 'mensagens' },
  { key: 'perfil',   label: 'Perfil do IG',   unidade: 'visita', plural: 'visitas'   },
];

// Classificação pelo nome (padrão [AURE] [OBJETIVO] [TAG]):
// - CONTRATAÇÃO (vaga de emprego) fica de fora: não é resultado de venda e puxa o custo para baixo.
// - [GRUPO VIP] vira "vip" — o resultado também é conversa iniciada, então sem isso cairia em WhatsApp.
// - Perfil do IG usa as visitas ao perfil.
// - O resto que os Feedbacks Meta já tratam como "mensagem" é WhatsApp.
function kindOf(c: CampaignFeedback): CampaignKind | null {
  const n = c.name.toLowerCase();
  if (n.includes('contrata')) return null;
  if (n.includes('grupo vip') || n.includes('[vip]')) return 'vip';
  if (c.tipo === 'seguidores' || n.includes('perfil')) return 'perfil';
  if (c.tipo === 'mensagem') return 'whatsapp';
  return null;
}

// ─── Operações críticas ──────────────────────────────────────────────────────
// Peso por prioridade: WhatsApp > Grupo VIP > Perfil do IG.
const PESO: Record<CampaignKind, number> = { whatsapp: 3, vip: 2, perfil: 1 };

// Quanto o custo passou da régua ideal (0 = dentro da régua).
// Ex.: ideal R$ 3 e custo R$ 7,50 → 1,5 (150% acima). Gasto sem nenhum resultado conta como 3 (pior caso).
function excesso(kind: CampaignKind, storeKey: string, sum: KindSummary | undefined): number {
  if (!sum || sum.spend <= 0) return 0;
  if (sum.resultado === 0) return 3;
  return Math.max(0, sum.custo / thresholdFor(kind, storeKey).ideal - 1);
}

function resultOf(kind: CampaignKind, c: CampaignFeedback): number {
  return kind === 'perfil' ? (c.visitasPerfil ?? 0) : (c.mensagens ?? 0);
}

// ─── Estado por loja ─────────────────────────────────────────────────────────

interface KindCampaign { name: string; spend: number; resultado: number; custo: number }
interface KindSummary  { spend: number; resultado: number; custo: number; campaigns: KindCampaign[] }

type RowState =
  | { status: 'loading' }
  | { status: 'done'; data: Partial<Record<CampaignKind, KindSummary>> } // tipo ausente = sem campanha no período
  | { status: 'error'; message: string };

type Level = 'bad' | 'warn' | 'ok' | 'none' | 'unknown';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (v: number) => v.toLocaleString('pt-BR');
const fmtDate = (s: string) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };

function summaryOf(kind: CampaignKind, st: RowState | undefined): KindSummary | undefined {
  return st?.status === 'done' ? st.data[kind] : undefined;
}

function levelOf(kind: CampaignKind, storeKey: string, st: RowState | undefined): Level {
  if (!st || st.status === 'loading') return 'unknown';
  if (st.status === 'error') return 'unknown';
  const sum = st.data[kind];
  if (!sum) return 'none';
  const { ideal, caro } = thresholdFor(kind, storeKey);
  const { spend, resultado, custo } = sum;
  if (resultado === 0) return spend > 0 ? 'bad' : 'none'; // gastou e não trouxe resultado
  if (custo > caro) return 'bad';
  if (custo > ideal) return 'warn';
  return 'ok';
}

const LEVEL_ORDER: Record<Level, number> = { bad: 0, warn: 1, ok: 2, unknown: 3, none: 4 };
const LEVEL_ICON:  Record<Level, string> = { bad: '🔴', warn: '⚠️', ok: '✅', unknown: '⏳', none: '⚪' };

// ─── Componente ─────────────────────────────────────────────────────────────

export function MessageCostView() {
  const [tab, setTab]             = useState<CampaignKind | 'criticas'>('whatsapp');
  const kind: CampaignKind        = tab === 'criticas' ? 'whatsapp' : tab;
  const [preset, setPreset]       = useState<PresetKey>('last_7d');
  const [customFrom, setFrom]     = useState(iso(addDays(new Date(), -7)));
  const [customTo, setTo]         = useState(iso(addDays(new Date(), -1)));
  const [states, setStates]       = useState<Record<string, RowState>>({});
  const [running, setRunning]     = useState(false);
  const [queried, setQueried]     = useState<{ since: string; until: string } | null>(null);
  const [open, setOpen]           = useState<Record<string, boolean>>({});

  const checkAll = useCallback(async () => {
    const { since, until } = rangeFor(preset, customFrom, customTo);
    if (!since || !until || since > until) return;

    setRunning(true);
    setQueried({ since, until });
    setOpen({});
    setStates(Object.fromEntries(ALL_STORES.map(s => [s.key, { status: 'loading' } as RowState])));

    await mapWithConcurrency(ALL_STORES, 5, 300, async (store: StoreEntry) => {
      try {
        const data = await getAccountFeedbackData(store.accountId, store.nameFilter, since, until, store.excludeFilters);
        const byKind: Partial<Record<CampaignKind, KindSummary>> = {};
        for (const c of data?.campaigns ?? []) {
          const k = kindOf(c);
          if (!k) continue;
          const resultado = resultOf(k, c);
          const sum = (byKind[k] ??= { spend: 0, resultado: 0, custo: 0, campaigns: [] });
          sum.campaigns.push({ name: c.name, spend: c.spend, resultado, custo: resultado > 0 ? c.spend / resultado : 0 });
          sum.spend     += c.spend;
          sum.resultado += resultado;
        }
        for (const sum of Object.values(byKind)) {
          if (!sum) continue;
          sum.custo = sum.resultado > 0 ? sum.spend / sum.resultado : 0;
          sum.campaigns.sort((a, b) =>
            (a.resultado === 0 ? Infinity : a.custo) < (b.resultado === 0 ? Infinity : b.custo) ? 1 : -1);
        }
        setStates(prev => ({ ...prev, [store.key]: { status: 'done', data: byKind } }));
      } catch (err: any) {
        setStates(prev => ({ ...prev, [store.key]: { status: 'error', message: err?.message ?? 'Erro' } }));
      }
    });

    setRunning(false);
  }, [preset, customFrom, customTo]);

  const kindInfo = KINDS.find(k => k.key === kind)!;
  const padrao   = THRESHOLDS[kind].padrao;
  const rows = ALL_STORES.map(s => ({
    ...s, state: states[s.key], sum: summaryOf(kind, states[s.key]), level: levelOf(kind, s.key, states[s.key]),
  }));
  // Investimento sem nenhum resultado é o pior caso: vai para o topo dos vermelhos.
  const custoDe = (r: typeof rows[number]) => (!r.sum ? 0 : r.sum.resultado === 0 ? Infinity : r.sum.custo);
  const criticas = ALL_STORES
    .map(s => {
      const st = states[s.key];
      const itens = KINDS.map(k => {
        const sum = summaryOf(k.key, st);
        return { ...k, sum, level: levelOf(k.key, s.key, st), excesso: excesso(k.key, s.key, sum) };
      });
      const score = itens.reduce((acc, i) => acc + PESO[i.key] * i.excesso, 0);
      const pior  = [...itens].sort((a, b) => PESO[b.key] * b.excesso - PESO[a.key] * a.excesso)[0];
      const gastoEmAlerta = itens.filter(i => i.excesso > 0).reduce((acc, i) => acc + (i.sum?.spend ?? 0), 0);
      return { ...s, itens, score, pior, gastoEmAlerta };
    })
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score || b.gastoEmAlerta - a.gastoEmAlerta);
  const comErro = ALL_STORES.filter(s => states[s.key]?.status === 'error');
  const criticasVermelhas = criticas.filter(c => c.itens.some(i => i.level === 'bad')).length;

  const alertCount = (k: CampaignKind) =>
    ALL_STORES.filter(s => ['bad', 'warn'].includes(levelOf(k, s.key, states[s.key]))).length;
  const sorted = [...rows].sort((a, b) =>
    LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || custoDe(b) - custoDe(a) || a.name.localeCompare(b.name, 'pt-BR'),
  );

  const checked   = Object.keys(states).length > 0;
  const totSpend  = rows.reduce((s, r) => s + (r.sum?.spend ?? 0), 0);
  const totRes    = rows.reduce((s, r) => s + (r.sum?.resultado ?? 0), 0);
  const count     = (l: Level) => rows.filter(r => r.level === l).length;
  const errCount  = rows.filter(r => r.state?.status === 'error').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Custo por Mensagem</h1>
          <p className="text-sm text-gray-500 mt-1">
            Investimento, resultado e custo por resultado das campanhas de WhatsApp, Grupo VIP e Perfil do IG.
          </p>
        </div>
        <button
          onClick={checkAll}
          disabled={running || (preset === 'custom' && (!customFrom || !customTo || customFrom > customTo))}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-purple hover:bg-brand-purple/80 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Consultando…' : 'Consultar'}
        </button>
      </div>

      {/* Tipo de campanha */}
      <div className="flex gap-1 border-b border-brand-light">
        {KINDS.map(k => {
          const n = checked && !running ? alertCount(k.key) : 0;
          return (
            <button
              key={k.key}
              onClick={() => { setTab(k.key); setOpen({}); }}
              className={`px-4 py-2 text-sm font-bold -mb-px border-b-2 transition-all ${
                tab === k.key ? 'border-brand-purple text-white' : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              {k.label}{n > 0 && <span className="ml-1.5 text-[10px] text-red-400">{n}</span>}
            </button>
          );
        })}
        <button
          onClick={() => setTab('criticas')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold -mb-px border-b-2 transition-all ${
            tab === 'criticas' ? 'border-red-500 text-white' : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Operações Críticas
          {checked && !running && criticasVermelhas > 0 && <span className="text-[10px] text-red-400">{criticasVermelhas}</span>}
        </button>
      </div>

      {/* Período */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            disabled={running}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              preset === p.key
                ? 'bg-brand-purple text-white'
                : 'bg-brand-medium border border-brand-light text-gray-400 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <input type="date" value={customFrom} max={customTo} onChange={e => setFrom(e.target.value)}
              className="bg-brand-medium border border-brand-light rounded-lg px-2 py-1.5 text-white" />
            <span>até</span>
            <input type="date" value={customTo} min={customFrom} onChange={e => setTo(e.target.value)}
              className="bg-brand-medium border border-brand-light rounded-lg px-2 py-1.5 text-white" />
          </div>
        )}
      </div>

      {tab !== 'criticas' && <p className="text-xs text-gray-600">
        ✅ até R$ {fmtBRL(padrao.ideal)} · ⚠️ de R$ {fmtBRL(padrao.ideal + 0.01)} a R$ {fmtBRL(padrao.caro)} · 🔴 acima de R$ {fmtBRL(padrao.caro)} ou investimento sem resultado · ⚪ sem campanha de {kindInfo.label} no período
        <br />Algumas lojas têm régua própria (passe o mouse no valor para ver).
      </p>}

      {tab !== 'criticas' && checked && queried && !running && (
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="text-gray-300 font-bold">
            {fmtDate(queried.since)}{queried.since !== queried.until ? ` a ${fmtDate(queried.until)}` : ''}
          </span>
          <span className="text-gray-300 font-bold">
            Total: R$ {fmtBRL(totSpend)} · {fmtInt(totRes)} {kindInfo.plural} · R$ {fmtBRL(totRes > 0 ? totSpend / totRes : 0)} por {kindInfo.unidade}
          </span>
          {count('bad')  > 0 && <span className="text-red-400 font-bold">🔴 {count('bad')} caro</span>}
          {count('warn') > 0 && <span className="text-yellow-400 font-bold">⚠️ {count('warn')} médio</span>}
          {count('ok')   > 0 && <span className="text-green-400 font-bold">✅ {count('ok')} bom</span>}
          {errCount      > 0 && <span className="text-gray-400 font-bold">⏳ {errCount} com erro</span>}
        </div>
      )}

      {!checked && (
        <div className="bg-brand-medium border border-brand-light rounded-xl p-8 text-center">
          <MessageCircle className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Escolha o período e clique em "Consultar".</p>
        </div>
      )}

      {tab === 'criticas' && (
        <p className="text-xs text-gray-600">
          Ordem por gravidade: para cada tipo acima da régua ideal, soma quanto o custo passou dela, com peso pela prioridade
          (WhatsApp ×3 · Grupo VIP ×2 · Perfil do IG ×1). Investimento sem nenhum resultado conta como o pior caso.
        </p>
      )}

      {tab === 'criticas' && checked && !running && (
        <div className="space-y-2">
          {queried && (
            <p className="text-xs text-gray-300 font-bold">
              {fmtDate(queried.since)}{queried.since !== queried.until ? ` a ${fmtDate(queried.until)}` : ''} ·{' '}
              {criticas.length === 0 ? 'nenhuma operação acima da régua 🎉' : `🔴 ${criticasVermelhas} com custo caro · ⚠️ ${criticas.length - criticasVermelhas} só com custo médio`}
            </p>
          )}
          {criticas.map((c, idx) => {
            const p = c.pior;
            const th = thresholdFor(p.key, c.key);
            const motivo = p.sum && p.sum.resultado === 0
              ? `${p.label}: R$ ${fmtBRL(p.sum.spend)} investidos sem nenhum resultado`
              : `${p.label}: R$ ${fmtBRL(p.sum?.custo ?? 0)}/${p.unidade} — ${Math.round(p.excesso * 100)}% acima da régua ideal (R$ ${fmtBRL(th.ideal)})`;
            const top = idx < 3;
            return (
              <div key={c.key}
                className={`flex flex-col md:flex-row md:items-center gap-3 px-4 py-3 rounded-xl bg-brand-medium border ${top ? 'border-red-900/60' : 'border-brand-light'}`}>
                <div className="flex items-center gap-3 md:w-80 shrink-0">
                  <span className={`text-lg font-black w-7 text-center ${top ? 'text-red-400' : 'text-gray-500'}`}>{idx + 1}</span>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">{c.name}</p>
                    <p className="text-[11px] text-gray-500">R$ {fmtBRL(c.gastoEmAlerta)} investidos em campanhas fora da régua</p>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-gray-300 mb-1.5">⚑ {motivo}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.itens.map(i => {
                      const cls = i.level === 'bad' ? 'bg-red-950/40 border-red-900/60 text-red-300'
                        : i.level === 'warn' ? 'bg-yellow-950/30 border-yellow-900/60 text-yellow-300'
                        : i.level === 'ok' ? 'bg-green-950/30 border-green-900/50 text-green-300'
                        : 'bg-transparent border-brand-light text-gray-600';
                      const val = !i.sum ? '—' : i.sum.resultado === 0 ? 'sem resultado' : `R$ ${fmtBRL(i.sum.custo)}/${i.unidade}`;
                      return (
                        <button key={i.key} onClick={() => setTab(i.key)}
                          className={`text-[11px] font-bold px-2 py-1 rounded-md border ${cls}`}
                          title={`Abrir aba ${i.label}`}>
                          {LEVEL_ICON[i.level]} {i.label} · {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          {comErro.length > 0 && (
            <p className="text-[11px] text-gray-500 pt-2">
              ⏳ Não foi possível consultar: {comErro.map(s => s.name).join(', ')} (conta desativada, sem permissão ou erro da API).
            </p>
          )}
        </div>
      )}

      {tab !== 'criticas' && checked && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 items-start">
          {sorted.map(r => {
            const border = r.level === 'bad' ? 'border-red-900/60' : r.level === 'warn' ? 'border-yellow-900/60' : 'border-brand-light';
            const color  = r.level === 'bad' ? 'text-red-400' : r.level === 'warn' ? 'text-yellow-400' : r.level === 'ok' ? 'text-green-400' : 'text-gray-500';
            const th = thresholdFor(kind, r.key);
            const st = r.state;
            const sum = r.sum;
            const canOpen = !!sum && sum.campaigns.length > 0;
            const u = kindInfo.unidade;

            return (
              <div key={r.key} className={`rounded-xl bg-brand-medium border ${border}`}>
                <button
                  type="button"
                  onClick={() => canOpen && setOpen(o => ({ ...o, [r.key]: !o[r.key] }))}
                  className={`w-full flex items-center gap-2.5 text-sm px-3 py-3 text-left ${canOpen ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span className="text-base">{LEVEL_ICON[r.level]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-bold text-xs truncate">{r.name}</p>
                    {st?.status === 'loading' && <p className="text-gray-500 text-[11px]">consultando…</p>}
                    {st?.status === 'error'   && <p className="text-gray-500 text-[11px] truncate">erro: {st.message}</p>}
                    {st?.status === 'done' && !sum && <p className="text-gray-500 text-[11px]">sem campanha de {kindInfo.label} no período</p>}
                    {sum && (
                      <p className="text-gray-500 text-[11px]">
                        R$ {fmtBRL(sum.spend)} · {fmtInt(sum.resultado)} {kindInfo.plural} ·{' '}
                        <span className={`font-bold ${color}`} title={`Régua: bom até R$ ${fmtBRL(th.ideal)} · caro acima de R$ ${fmtBRL(th.caro)}`}>
                          {sum.resultado > 0 ? `R$ ${fmtBRL(sum.custo)}/${u}` : `sem ${kindInfo.plural}`}
                        </span>
                      </p>
                    )}
                  </div>
                  {canOpen && (open[r.key]
                    ? <ChevronDown className="w-4 h-4 text-gray-600 shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />)}
                </button>

                {canOpen && open[r.key] && sum && (
                  <div className="border-t border-brand-light px-3 py-2 space-y-1.5">
                    {sum.campaigns.map(c => (
                      <div key={c.name} className="text-[11px]">
                        <p className="text-gray-300 truncate" title={c.name}>{c.name}</p>
                        <p className="text-gray-500">
                          R$ {fmtBRL(c.spend)} · {fmtInt(c.resultado)} {kindInfo.plural} · {c.resultado > 0 ? `R$ ${fmtBRL(c.custo)}/${u}` : `sem ${kindInfo.plural}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
