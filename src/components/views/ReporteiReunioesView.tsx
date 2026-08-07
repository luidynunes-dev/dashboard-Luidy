import React, { useState, useCallback } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { getStoreReport, StoreReport } from '../../services/metaService';
import { WHATSAPP_GROUPS, DISPLAY_NAMES, STORE_BY_KEY } from '../../config/storeGroups';

type ReportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; data: StoreReport }
  | { status: 'error'; message: string };

function fmtBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNumber(n: number): string {
  return n.toLocaleString('pt-BR');
}
function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function ReporteiReunioesView() {
  const [groupId, setGroupId]   = useState(WHATSAPP_GROUPS[0].id);
  const group = WHATSAPP_GROUPS.find(g => g.id === groupId) ?? WHATSAPP_GROUPS[0];

  const [storeKey, setStoreKey] = useState(group.storeKeys[0]);
  const [report, setReport]     = useState<ReportState>({ status: 'idle' });

  const [dateFrom, setDateFrom] = useState(todayISO(-7));
  const [dateTo, setDateTo]     = useState(todayISO(-1));

  const handleGroupChange = (id: string) => {
    const g = WHATSAPP_GROUPS.find(x => x.id === id) ?? WHATSAPP_GROUPS[0];
    setGroupId(id);
    setStoreKey(g.storeKeys[0]);
    setReport({ status: 'idle' });
  };

  const handleStoreChange = (key: string) => {
    setStoreKey(key);
    setReport({ status: 'idle' });
  };

  const fetchReport = useCallback(async () => {
    const store = STORE_BY_KEY[storeKey];
    if (!store) return;
    setReport({ status: 'loading' });
    try {
      const data = await getStoreReport(store.accountId, store.nameFilter, dateFrom, dateTo, store.excludeFilters);
      setReport({ status: 'done', data });
    } catch (err: any) {
      setReport({ status: 'error', message: err?.message ?? 'Erro desconhecido' });
    }
  }, [storeKey, dateFrom, dateTo]);

  const storeName = DISPLAY_NAMES[storeKey] ?? storeKey;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reportei Reuniões</h1>
        <p className="text-sm text-gray-500 mt-1">Painel individual por loja, para apresentar em reunião.</p>
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
          <ChevronDown className="w-4 h-4 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

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
          <h2 className="text-lg font-bold text-white">{storeName}</h2>

          {/* Resumo geral */}
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
                    <>
                      <div>
                        <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Conversas</p>
                        <p className="text-white font-bold">{fmtNumber(c.mensagens ?? 0)}</p>
                      </div>
                    </>
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
