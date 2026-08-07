import React, { useState, useCallback } from 'react';
import { Copy, Check, RefreshCw, MessageSquare, Users, Store } from 'lucide-react';
import { getAccountFeedbackData, FeedbackData } from '../../services/metaService';
import { getStoreSales, mapWithConcurrency, KommoSales } from '../../services/kommoService';
import { DISPLAY_NAMES, WHATSAPP_GROUPS, ALL_STORES, STORE_BY_KEY } from '../../config/storeGroups';

// ─── Formatação ───────────────────────────────────────────────────────────────

type StoreState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; data: FeedbackData; sales: KommoSales | null }
  | { status: 'empty'; sales: KommoSales | null }
  | { status: 'error'; message: string };

function fmtBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNumber(n: number): string {
  return n.toLocaleString('pt-BR');
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function buildHeader(since: string, until: string): string {
  return [
    `Muito bom dia pessoal! Excelente sexta-feira.😁`,
    ``,
    `📆 Passando agora, para mostrar os resultados das campanhas nesse período.`,
    `(${fmtDate(since)} a ${fmtDate(until)})`,
  ].join('\n');
}

// Bloco de UMA loja (sem cabeçalho)
function buildStoreBlock(name: string, state: StoreState, noKommo?: boolean): string {
  const lines: string[] = [``, `─────${name}─────`, ``];

  if (state.status === 'done') {
    const { data, sales } = state;
    lines.push(`Total investido: R$ ${fmtBRL(data.totalSpend)}`);
    lines.push(``);
    lines.push(`🔵 No Meta Ads 🔵`);

    for (const c of data.campaigns) {
      if (c.tipo === 'mensagem') {
        lines.push(`📣 Campanha de mensagem`);
        lines.push(`Nome da campanha: ${c.name}`);
        lines.push(`💵 Investimento Mensagem: R$ ${fmtBRL(c.spend)}`);
        lines.push(`🎯 Mensagens: ${fmtNumber(c.mensagens ?? 0)}`);
        lines.push(`💲 Custo por mensagem: R$ ${fmtBRL(c.custoMensagem ?? 0)}`);
        lines.push(``);
      } else if (c.tipo === 'seguidores') {
        lines.push(`📣 Campanha de seguidores`);
        lines.push(`Nome da campanha: ${c.name}`);
        lines.push(`💵 Investimento Seguidores: R$ ${fmtBRL(c.spend)}`);
        lines.push(`🎯 Visitas ao perfil: ${fmtNumber(c.visitasPerfil ?? 0)}`);
        lines.push(`💲 Custo por visita: R$ ${fmtBRL(c.custoVisita ?? 0)}`);
        lines.push(``);
      } else if (c.tipo === 'live') {
        lines.push(`📣 Campanha de live`);
        lines.push(`Nome da campanha: ${c.name}`);
        lines.push(`💵 Investimento: R$ ${fmtBRL(c.spend)}`);
        lines.push(`🎯 ThruPlays: ${fmtNumber(c.thruPlays ?? 0)}`);
        lines.push(`💲 Custo por ThruPlays: R$ ${fmtBRL(c.custoThruPlay ?? 0)}`);
        lines.push(``);
      } else if (c.tipo === 'engajamento') {
        lines.push(`📣 Campanha de engajamento com o post`);
        lines.push(`Nome da campanha: ${c.name}`);
        lines.push(`💵 Investimento: R$ ${fmtBRL(c.spend)}`);
        lines.push(`🎯 Engajamentos com o post: ${fmtNumber(c.engajamentos ?? 0)}`);
        lines.push(`💲 Custo por engajamento: R$ ${fmtBRL(c.custoEngajamento ?? 0)}`);
        lines.push(``);
      } else if (c.tipo === 'leads') {
        lines.push(`📣 Campanha de leads`);
        lines.push(`Nome da campanha: ${c.name}`);
        lines.push(`💵 Investimento: R$ ${fmtBRL(c.spend)}`);
        lines.push(`🎯 Leads no site: ${fmtNumber(c.leads ?? 0)}`);
        lines.push(`💲 Custo por lead: R$ ${fmtBRL(c.custoLead ?? 0)}`);
        lines.push(``);
      } else {
        lines.push(`📣 Campanha`);
        lines.push(`Nome da campanha: ${c.name}`);
        lines.push(`💵 Investimento: R$ ${fmtBRL(c.spend)}`);
        lines.push(``);
      }
    }

    if (!noKommo) {
      lines.push(`🟢 Resultados (Kommo) 🟢`);
      if (sales) {
        lines.push(`🛍️ Vendas realizadas: ${fmtNumber(sales.vendas)}`);
        lines.push(`💰 Valor em vendas: R$ ${fmtBRL(sales.valorVendas)}`);
      } else {
        lines.push(`🛍️ Vendas realizadas: —`);
        lines.push(`💰 Valor em vendas: R$ —`);
      }
    }
  } else if (state.status === 'empty') {
    lines.push(`Sem campanhas ativas nesse período.`);
    if (!noKommo && state.sales) {
      lines.push(``);
      lines.push(`🟢 Resultados (Kommo) 🟢`);
      lines.push(`🛍️ Vendas realizadas: ${fmtNumber(state.sales.vendas)}`);
      lines.push(`💰 Valor em vendas: R$ ${fmtBRL(state.sales.valorVendas)}`);
    }
  }

  return lines.join('\n');
}

// ─── Componente ───────────────────────────────────────────────────────────────

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function MetaFeedbackView() {
  const [states, setStates] = useState<Record<string, StoreState>>(() =>
    Object.fromEntries(ALL_STORES.map(s => [s.key, { status: 'idle' }])),
  );
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [viewMode, setViewMode]     = useState<'grupo' | 'loja'>('grupo');
  const [periodMode, setPeriodMode] = useState<'last7' | 'custom'>('last7');
  const [dateFrom, setDateFrom] = useState(todayISO(-7));
  const [dateTo, setDateTo]     = useState(todayISO(-1));

  // "Últimos 7 dias" no padrão do Gerenciador de Anúncios: 7 dias terminando ONTEM
  const effectiveFrom = periodMode === 'last7' ? todayISO(-7) : dateFrom;
  const effectiveTo   = periodMode === 'last7' ? todayISO(-1) : dateTo;

  const setStore = useCallback((key: string, state: StoreState) => {
    setStates(prev => ({ ...prev, [key]: state }));
  }, []);

  const fetchAll = useCallback(async () => {
    setRunning(true);
    setStates(Object.fromEntries(ALL_STORES.map(s => [s.key, { status: 'loading' }])));

    // Lotes de 5 lojas por vez, com 400ms de intervalo — bem abaixo do limite do Kommo (7 req/s)
    await mapWithConcurrency(ALL_STORES, 5, 400, async ({ key, accountId, nameFilter, excludeFilters, noKommo }) => {
      try {
        const [data, sales] = await Promise.all([
          getAccountFeedbackData(accountId, nameFilter, effectiveFrom, effectiveTo, excludeFilters),
          noKommo ? Promise.resolve(null) : getStoreSales(key, effectiveFrom, effectiveTo).catch(() => null),
        ]);
        setStore(key, data ? { status: 'done', data, sales } : { status: 'empty', sales });
      } catch (err: any) {
        setStore(key, { status: 'error', message: err?.message ?? 'Erro desconhecido' });
      }
    });

    setRunning(false);
  }, [setStore, effectiveFrom, effectiveTo]);

  // Busca só UMA loja — usado pelo botão de refresh individual em "Por loja"
  const fetchOne = useCallback(async (key: string) => {
    const store = STORE_BY_KEY[key];
    if (!store) return;

    setStore(key, { status: 'loading' });
    try {
      const [data, sales] = await Promise.all([
        getAccountFeedbackData(store.accountId, store.nameFilter, effectiveFrom, effectiveTo, store.excludeFilters),
        store.noKommo ? Promise.resolve(null) : getStoreSales(key, effectiveFrom, effectiveTo).catch(() => null),
      ]);
      setStore(key, data ? { status: 'done', data, sales } : { status: 'empty', sales });
    } catch (err: any) {
      setStore(key, { status: 'error', message: err?.message ?? 'Erro desconhecido' });
    }
  }, [setStore, effectiveFrom, effectiveTo]);

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
  };

  const doneCount  = ALL_STORES.filter(s => states[s.key]?.status === 'done').length;
  const emptyCount = ALL_STORES.filter(s => states[s.key]?.status === 'empty').length;
  const errorCount = ALL_STORES.filter(s => states[s.key]?.status === 'error').length;

  const anyLoaded = doneCount + emptyCount + errorCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Feedbacks Meta</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gera as mensagens de resultado do período selecionado, por grupo de WhatsApp ou por loja.
            </p>
          </div>
          <button
            onClick={fetchAll}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-purple hover:bg-brand-purple/80 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Buscando…' : 'Gerar Feedbacks'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle visão */}
          <div className="flex items-center gap-1 bg-brand-dark border border-brand-light rounded-lg p-1">
            <button
              onClick={() => setViewMode('grupo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'grupo' ? 'bg-brand-purple text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Por grupo
            </button>
            <button
              onClick={() => setViewMode('loja')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'loja' ? 'bg-brand-purple text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" /> Por loja
            </button>
          </div>

          {/* Toggle período */}
          <div className="flex items-center gap-1 bg-brand-dark border border-brand-light rounded-lg p-1">
            <button
              onClick={() => setPeriodMode('last7')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                periodMode === 'last7' ? 'bg-brand-purple text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => setPeriodMode('custom')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                periodMode === 'custom' ? 'bg-brand-purple text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Personalizado
            </button>
          </div>

          {periodMode === 'last7' && (
            <span className="text-xs text-gray-600">
              {fmtDate(effectiveFrom)} a {fmtDate(effectiveTo)} (até ontem, igual ao Gerenciador)
            </span>
          )}

          {periodMode === 'custom' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 font-bold">De</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                max={dateTo}
                className="bg-brand-dark border border-brand-light rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
              />
              <label className="text-xs text-gray-500 font-bold">até</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                min={dateFrom}
                max={todayISO(0)}
                className="bg-brand-dark border border-brand-light rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brand-purple"
              />
            </div>
          )}
        </div>
      </div>

      {/* Resumo */}
      {!running && anyLoaded && (
        <div className="flex gap-4 text-xs">
          <span className="text-green-400 font-bold">{doneCount} com campanhas</span>
          {emptyCount > 0 && <span className="text-gray-500 font-bold">{emptyCount} sem gasto</span>}
          {errorCount > 0 && <span className="text-red-400 font-bold">{errorCount} com erro</span>}
        </div>
      )}

      {/* ── VISÃO POR GRUPO ── */}
      {viewMode === 'grupo' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {WHATSAPP_GROUPS.map(group => {
            const storeStates = group.storeKeys.map(k => ({ key: k, name: DISPLAY_NAMES[k] ?? k, state: states[k] }));
            const loaded  = storeStates.filter(s => s.state?.status === 'done' || s.state?.status === 'empty');
            const loading = storeStates.some(s => s.state?.status === 'loading');
            const errors  = storeStates.filter(s => s.state?.status === 'error');

            const message = loaded.length > 0
              ? buildHeader(effectiveFrom, effectiveTo) + '\n' +
                loaded.map(s => buildStoreBlock(s.name, s.state, STORE_BY_KEY[s.key]?.noKommo)).join('\n')
              : '';

            return (
              <div key={group.id} className="bg-brand-medium border border-brand-light rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="w-4 h-4 text-brand-purple shrink-0" />
                    <span className="text-sm font-bold text-white truncate">{group.name}</span>
                    <span className="text-[10px] text-gray-600 shrink-0">({group.storeKeys.length} loja{group.storeKeys.length > 1 ? 's' : ''})</span>
                  </div>
                  {message && (
                    <button
                      onClick={() => copyText(group.id, message)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-light hover:bg-brand-light/80 text-xs font-bold transition-all shrink-0"
                    >
                      {copied[group.id]
                        ? <><Check className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Copiado!</span></>
                        : <><Copy className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-300">Copiar</span></>
                      }
                    </button>
                  )}
                </div>

                {!anyLoaded && !loading && (
                  <p className="text-xs text-gray-600 italic">Clique em "Gerar Feedbacks" para buscar.</p>
                )}
                {loading && (
                  <div className="space-y-2 animate-pulse">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-3 bg-brand-light rounded" style={{ width: `${55 + (i % 3) * 15}%` }} />
                    ))}
                  </div>
                )}
                {errors.length > 0 && (
                  <div className="text-xs text-red-400">
                    {errors.map(e => (
                      <p key={e.key}>Erro em {e.name}: {(e.state as any).message}</p>
                    ))}
                  </div>
                )}
                {message && (
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed font-sans bg-brand-dark/50 rounded-lg p-3 border border-brand-light max-h-96 overflow-y-auto">
                    {message}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── VISÃO POR LOJA ── */}
      {viewMode === 'loja' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {ALL_STORES.map(({ key, name }) => {
            const state = states[key];
            const message = (state.status === 'done' || state.status === 'empty')
              ? buildHeader(effectiveFrom, effectiveTo) + '\n' + buildStoreBlock(name, state, STORE_BY_KEY[key]?.noKommo)
              : '';

            return (
              <div key={key} className="bg-brand-medium border border-brand-light rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-brand-purple shrink-0" />
                    <span className="text-sm font-bold text-white">{name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => fetchOne(key)}
                      disabled={state.status === 'loading'}
                      title="Gerar feedback só desta loja"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-light hover:bg-brand-light/80 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${state.status === 'loading' ? 'animate-spin' : ''}`} />
                    </button>
                    {message && (
                      <button
                        onClick={() => copyText(key, message)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-light hover:bg-brand-light/80 text-xs font-bold transition-all"
                      >
                        {copied[key]
                          ? <><Check className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Copiado!</span></>
                          : <><Copy className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-300">Copiar</span></>
                        }
                      </button>
                    )}
                  </div>
                </div>

                {state.status === 'idle' && (
                  <p className="text-xs text-gray-600 italic">Clique em "Gerar Feedbacks" para buscar.</p>
                )}
                {state.status === 'loading' && (
                  <div className="space-y-2 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-3 bg-brand-light rounded" style={{ width: `${60 + (i % 3) * 15}%` }} />
                    ))}
                  </div>
                )}
                {state.status === 'error' && (
                  <p className="text-xs text-red-400">Erro: {state.message}</p>
                )}
                {message && (
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed font-sans bg-brand-dark/50 rounded-lg p-3 border border-brand-light max-h-96 overflow-y-auto">
                    {message}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
