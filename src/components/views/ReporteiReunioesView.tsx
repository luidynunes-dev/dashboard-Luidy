import React, { useState, useCallback } from 'react';
import { RefreshCw, Pencil, Eye, EyeOff } from 'lucide-react';
import { getStoreReport, StoreReport } from '../../services/metaService';
import { getStoreSales, KommoSales } from '../../services/kommoService';
import { WHATSAPP_GROUPS, DISPLAY_NAMES, STORE_BY_KEY } from '../../config/storeGroups';
import { DateRangePicker } from '../DateRangePicker';

interface Props {
  presentationMode: boolean;
  onTogglePresentationMode: () => void;
}

type ReportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; data: StoreReport; sales: KommoSales | null }
  | { status: 'error'; message: string };

function fmtBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNumber(n: number): string {
  return n.toLocaleString('pt-BR');
}
function fmtDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function ReporteiReunioesView({ presentationMode, onTogglePresentationMode }: Props) {
  const [groupId, setGroupId]   = useState(WHATSAPP_GROUPS[0].id);
  const group = WHATSAPP_GROUPS.find(g => g.id === groupId) ?? WHATSAPP_GROUPS[0];

  const [storeKey, setStoreKey] = useState(group.storeKeys[0]);
  const [report, setReport]     = useState<ReportState>({ status: 'idle' });

  const [dateFrom, setDateFrom] = useState(todayISO(-7));
  const [dateTo, setDateTo]     = useState(todayISO(-1));

  // Edição manual das vendas — vale só nessa sessão, não persiste
  const [vendasOverride, setVendasOverride]     = useState<number | null>(null);
  const [valorVendasOverride, setValorVendasOverride] = useState<number | null>(null);

  const handleGroupChange = (id: string) => {
    const g = WHATSAPP_GROUPS.find(x => x.id === id) ?? WHATSAPP_GROUPS[0];
    setGroupId(id);
    setStoreKey(g.storeKeys[0]);
    setReport({ status: 'idle' });
    setVendasOverride(null);
    setValorVendasOverride(null);
  };

  const handleStoreChange = (key: string) => {
    setStoreKey(key);
    setReport({ status: 'idle' });
    setVendasOverride(null);
    setValorVendasOverride(null);
  };

  const fetchReport = useCallback(async () => {
    const store = STORE_BY_KEY[storeKey];
    if (!store) return;
    setReport({ status: 'loading' });
    setVendasOverride(null);
    setValorVendasOverride(null);
    try {
      const [data, sales] = await Promise.all([
        getStoreReport(store.accountId, store.nameFilter, dateFrom, dateTo, store.excludeFilters),
        store.noKommo ? Promise.resolve(null) : getStoreSales(storeKey, dateFrom, dateTo).catch(() => null),
      ]);
      setReport({ status: 'done', data, sales });
    } catch (err: any) {
      setReport({ status: 'error', message: err?.message ?? 'Erro desconhecido' });
    }
  }, [storeKey, dateFrom, dateTo]);

  const storeName = DISPLAY_NAMES[storeKey] ?? storeKey;
  const currentStore = STORE_BY_KEY[storeKey];

  // Valores efetivos: override manual tem prioridade sobre o que veio do Kommo
  const effectiveVendas = report.status === 'done'
    ? vendasOverride ?? report.sales?.vendas ?? 0
    : 0;
  const effectiveValorVendas = report.status === 'done'
    ? valorVendasOverride ?? report.sales?.valorVendas ?? 0
    : 0;
  const totalSpend = report.status === 'done' ? report.data.totalSpend : 0;
  const roas   = totalSpend > 0 ? effectiveValorVendas / totalSpend : 0;
  const ticket = effectiveVendas > 0 ? effectiveValorVendas / effectiveVendas : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reportei Reuniões</h1>
          <p className="text-sm text-gray-500 mt-1">Painel individual por loja, para apresentar em reunião.</p>
        </div>
        <button
          onClick={onTogglePresentationMode}
          title={presentationMode ? 'Mostrar menu' : 'Ocultar menu (útil antes de salvar em PDF)'}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-light hover:bg-brand-light/80 text-xs font-bold text-gray-300 hover:text-white transition-all shrink-0"
        >
          {presentationMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {presentationMode ? 'Mostrar menu' : 'Ocultar menu'}
        </button>
      </div>

      {/* Seletor de grupo */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={groupId}
            onChange={e => handleGroupChange(e.target.value)}
            className="appearance-none bg-brand-dark border border-brand-light rounded-lg pl-3 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-brand-purple"
          >
            {WHATSAPP_GROUPS.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
          maxDate={todayISO(0)}
        />
      </div>

      {/* Abas das lojas do grupo */}
      <div className="flex flex-wrap gap-2">
        {group.storeKeys.map(key => (
          <button
            key={key}
            onClick={() => handleStoreChange(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              storeKey === key ? 'bg-brand-purple text-white' : 'bg-brand-light text-gray-400 hover:text-white'
            }`}
          >
            {DISPLAY_NAMES[key] ?? key}
          </button>
        ))}
      </div>

      <button
        onClick={fetchReport}
        disabled={report.status === 'loading'}
        className="flex items-center gap-2 px-4 py-2.5 bg-brand-purple hover:bg-brand-purple/80 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all"
      >
        <RefreshCw className={`w-4 h-4 ${report.status === 'loading' ? 'animate-spin' : ''}`} />
        {report.status === 'loading' ? 'Buscando…' : 'Gerar Relatório'}
      </button>

      {/* Conteúdo */}
      {report.status === 'idle' && (
        <p className="text-sm text-gray-600 italic">Selecione o grupo, a loja e o período, depois clique em "Gerar Relatório".</p>
      )}
      {report.status === 'error' && (
        <p className="text-sm text-red-400">Erro: {report.message}</p>
      )}
      {report.status === 'done' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">{storeName}</h2>
            <p className="text-xs text-gray-500">{fmtDateBR(dateFrom)} a {fmtDateBR(dateTo)}</p>
          </div>

          {/* Resumo geral — Meta Ads */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-brand-medium border border-brand-light rounded-xl p-4">
              <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Valor investido</p>
              <p className="text-xl font-bold text-white">R$ {fmtBRL(report.data.totalSpend)}</p>
            </div>
            <div className="bg-brand-medium border border-brand-light rounded-xl p-4">
              <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Alcance Total</p>
              <p className="text-xl font-bold text-white">{fmtNumber(report.data.totalReach)}</p>
            </div>
            <div className="bg-brand-medium border border-brand-light rounded-xl p-4">
              <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Impressões Totais</p>
              <p className="text-xl font-bold text-white">{fmtNumber(report.data.totalImpressions)}</p>
            </div>
            <div className="bg-brand-medium border border-brand-light rounded-xl p-4">
              <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Conversas por mensagem</p>
              <p className="text-xl font-bold text-white">{fmtNumber(report.data.totalMensagens)}</p>
            </div>
          </div>

          {/* Vendas / ROAS / Ticket Médio — Kommo, editável */}
          {!currentStore?.noKommo && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase font-bold mb-2">Resultados de vendas (Kommo)</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-brand-medium border border-brand-light rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-[10px] text-gray-600 uppercase font-bold">Vendas</p>
                    <Pencil className="w-3 h-3 text-gray-600" />
                  </div>
                  <input
                    type="number"
                    value={Number(vendasOverride ?? report.sales?.vendas ?? 0)}
                    onChange={e => setVendasOverride(Number(e.target.value))}
                    className="w-full bg-transparent text-xl font-bold text-white focus:outline-none border-b border-transparent focus:border-brand-purple"
                  />
                </div>
                <div className="bg-brand-medium border border-brand-light rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-[10px] text-gray-600 uppercase font-bold">Valor em vendas</p>
                    <Pencil className="w-3 h-3 text-gray-600" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-bold text-white">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={Number(valorVendasOverride ?? report.sales?.valorVendas ?? 0)}
                      onChange={e => setValorVendasOverride(Number(e.target.value))}
                      className="w-full bg-transparent text-xl font-bold text-white focus:outline-none border-b border-transparent focus:border-brand-purple"
                    />
                  </div>
                </div>
                <div className="bg-brand-medium border border-brand-light rounded-xl p-4">
                  <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">ROAS</p>
                  <p className="text-xl font-bold text-white">{roas.toFixed(2)}</p>
                </div>
                <div className="bg-brand-medium border border-brand-light rounded-xl p-4">
                  <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Ticket Médio</p>
                  <p className="text-xl font-bold text-white">R$ {fmtBRL(ticket)}</p>
                </div>
              </div>
              {(vendasOverride !== null || valorVendasOverride !== null) && (
                <p className="text-[10px] text-amber-400 mt-2">
                  ✏️ Valores editados manualmente nesta sessão — não foram salvos permanentemente.
                </p>
              )}
            </div>
          )}

          {/* Campanhas */}
          {report.data.campaigns.length === 0 && (
            <p className="text-sm text-gray-600 italic">Nenhuma campanha com veiculação nesse período.</p>
          )}
          <div className="space-y-4">
            {report.data.campaigns.map(c => (
              <div key={c.id} className="bg-brand-medium border border-brand-light rounded-xl p-4">
                <p className="text-sm font-bold text-white mb-3">{c.name}</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Valor investido</p>
                    <p className="text-white font-bold">R$ {fmtBRL(c.spend)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Alcance</p>
                    <p className="text-white font-bold">{fmtNumber(c.reach)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Impressões</p>
                    <p className="text-white font-bold">{fmtNumber(c.impressions)}</p>
                  </div>
                  {c.tipo === 'mensagem' && (
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Conversas</p>
                      <p className="text-white font-bold">{fmtNumber(c.mensagens ?? 0)}</p>
                    </div>
                  )}
                  {c.tipo === 'seguidores' && (
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Cliques no link</p>
                      <p className="text-white font-bold">{fmtNumber(c.visitasPerfil ?? 0)}</p>
                    </div>
                  )}
                  {c.tipo === 'leads' && (
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Leads</p>
                      <p className="text-white font-bold">{fmtNumber(c.leads ?? 0)}</p>
                    </div>
                  )}
                </div>

                {c.topAds && c.topAds.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-brand-light">
                    <p className="text-[10px] text-gray-600 uppercase font-bold mb-3">Anúncios em Destaque</p>
                    <div className="space-y-3">
                      {c.topAds.map(ad => (
                        <div key={ad.id} className="flex items-center gap-3 bg-brand-dark/50 rounded-lg p-3">
                          {ad.thumbnailUrl ? (
                            <img src={ad.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-brand-light shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{ad.name}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[11px] text-gray-400">
                              <span>Alcance: <b className="text-gray-200">{fmtNumber(ad.reach)}</b></span>
                              <span>Impressões: <b className="text-gray-200">{fmtNumber(ad.impressions)}</b></span>
                              <span>Cliques: <b className="text-gray-200">{fmtNumber(ad.clicks)}</b></span>
                              <span>Investido: <b className="text-gray-200">R$ {fmtBRL(ad.spend)}</b></span>
                              {c.tipo === 'mensagem' && (
                                <span>Conversas: <b className="text-gray-200">{fmtNumber(ad.mensagens)}</b></span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
