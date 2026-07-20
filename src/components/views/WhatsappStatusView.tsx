import React, { useState, useCallback } from 'react';
import { RefreshCw, Wifi } from 'lucide-react';
import { META_ACCOUNTS } from '../../config/metaAccounts';
import { getWhatsappStatus, mapWithConcurrency, WhatsappStatus } from '../../services/kommoService';

// Nomes de exibição (mesma base da tela de Feedbacks)
const DISPLAY_NAMES: Record<string, string> = {
  'adidas-performance-porto-velho': 'Adidas Performance Porto Velho',
  'adidas-performance-rio-branco':  'Adidas Performance Rio Branco',
  'adidas-performance-grao-para':   'Adidas Performance Grão Pará',
  'adidas-performance-belem':       'Adidas Performance Belém',
  'adidas-kids':                    'Adidas Kids',
  'adidas-originals-belem':         'Adidas Originals Belém',
  'adidas-originals-manauara':      'Adidas Originals Manauara',
  'nacao-via-norte':   'Nação Via Norte',
  'nacao-ponta-negra': 'Nação Ponta Negra',
  'nacao-rio-branco':  'Nação Rio Branco',
  'nacao-manaus':      'Nação Manaus',
  'nacao-boa-vista':   'Nação Boa Vista',
  'nacao-porto-velho': 'Nação Porto Velho',
  'shoes-off':          'Shoes Off',
  'capodarte-amazonas': 'Capodarte Amazonas',
  'atelier-mix':        'Atelier Mix',
  'piccadilly-ponta-negra':     'Piccadilly Ponta Negra',
  'piccadilly-rio-branco':      'Piccadilly Rio Branco',
  'piccadilly-manauara':        'Piccadilly Manauara',
  'piccadilly-amazonas':        'Piccadilly Amazonas',
  'piccadilly-boa-vista':       'Piccadilly Boa Vista',
  'piccadilly-patio-belem':     'Piccadilly Pátio Belém',
  'piccadilly-parque-belem':    'Piccadilly Parque Shopping Belém',
  'piccadilly-boulevard-belem': 'Piccadilly Boulevard Belém',
  'loungerie-ponta-negra': 'Loungerie Ponta Negra',
  'loungerie-manauara':    'Loungerie Manauara',
  'loungerie-porto-velho': 'Loungerie Porto Velho',
  'petite-jolie-sumauma':  'Petite Jolie Sumaúma',
  'petite-jolie-manauara': 'Petite Jolie Manauara',
  'petite-jolie-belem':    'Petite Jolie Belém',
  'ferracini-manauara-gesta': 'Ferracini Manauara',
  'ferracini-belem-gesta':    'Ferracini Belém',
  'ferracini-amazonas-gesta': 'Ferracini Amazonas',
  'usaflex-araxa':       'Usaflex Araxá',
  'via-orlandia':        'Via Orlândia',
  'brothers-shoes':      'Brothers Shoes',
  'usaflex-patos-minas': 'Usaflex Patos de Minas',
  'fetiche-love-shop':   'Fetiche Love Shop',
  'swarovski-maringa':   'Swarovski Maringá Park',
  'swarovski-curitiba':  'Swarovski Curitiba',
  'usaflex-savassi':     'Usaflex Savassi',
  're-calcados':         'Rê Calçados',
  'santa-lolla':         'Santa Lolla',
  'usaflex-cascavel':    'Usaflex Cascavel',
};

// Todas as lojas com Kommo (as chaves do META_ACCOUNTS que têm conta no Kommo)
const STORES = Object.keys(META_ACCOUNTS)
  .filter(key => DISPLAY_NAMES[key])
  .map(key => ({ key, name: DISPLAY_NAMES[key] }))
  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

type WppState = { status: 'loading' } | { status: 'done'; data: WhatsappStatus } | { status: 'error' };

export function WhatsappStatusView() {
  const [states, setStates] = useState<Record<string, WppState>>({});
  const [running, setRunning] = useState(false);

  const checkAll = useCallback(async () => {
    setRunning(true);
    setStates(Object.fromEntries(STORES.map(s => [s.key, { status: 'loading' }])));

    await mapWithConcurrency(STORES, 5, 400, async ({ key }) => {
      try {
        const data = await getWhatsappStatus(key);
        setStates(prev => ({ ...prev, [key]: { status: 'done', data } }));
      } catch {
        setStates(prev => ({ ...prev, [key]: { status: 'error' } }));
      }
    });

    setRunning(false);
  }, []);

  const entries = STORES.map(s => {
    const st = states[s.key];
    let level: 'ok' | 'warn' | 'bad' | 'unknown' = 'unknown';
    let hours: number | null = null;
    if (st?.status === 'done') {
      hours = st.data.hoursSince;
      if (hours === null) level = 'bad';
      else if (hours <= 24) level = 'ok';
      else if (hours <= 48) level = 'warn';
      else level = 'bad';
    } else if (st?.status === 'error') {
      level = 'bad';
    }
    return { key: s.key, name: s.name, state: st, level, hours };
  });

  const checked = Object.keys(states).length > 0;
  const order = { bad: 0, warn: 1, unknown: 2, ok: 3 } as const;
  const sorted = [...entries].sort((a, b) => order[a.level] - order[b.level] || a.name.localeCompare(b.name, 'pt-BR'));
  const badCount  = entries.filter(e => e.level === 'bad').length;
  const warnCount = entries.filter(e => e.level === 'warn').length;
  const okCount   = entries.filter(e => e.level === 'ok').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Conexão WhatsApp</h1>
          <p className="text-sm text-gray-500 mt-1">
            Verifica a conexão dos WhatsApps com os Kommos pela última atividade de conversa.
          </p>
        </div>
        <button
          onClick={checkAll}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-purple hover:bg-brand-purple/80 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Verificando…' : 'Verificar conexões'}
        </button>
      </div>

      <p className="text-xs text-gray-600">
        Baseado na última conversa registrada no Kommo: ✅ até 24h · ⚠️ 24–48h · 🔴 mais de 48h sem atividade (provável WhatsApp desconectado).
      </p>

      {checked && !running && (
        <div className="flex gap-4 text-xs">
          {badCount > 0 && <span className="text-red-400 font-bold">🔴 {badCount} provável desconexão</span>}
          {warnCount > 0 && <span className="text-yellow-400 font-bold">⚠️ {warnCount} atenção</span>}
          <span className="text-green-400 font-bold">✅ {okCount} ativos</span>
        </div>
      )}

      {!checked && (
        <div className="bg-brand-medium border border-brand-light rounded-xl p-8 text-center">
          <Wifi className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Clique em "Verificar conexões" para checar todas as lojas.</p>
        </div>
      )}

      {checked && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {sorted.map(e => {
            const icon = e.level === 'ok' ? '✅' : e.level === 'warn' ? '⚠️' : e.level === 'bad' ? '🔴' : '⏳';
            const detail = e.state?.status === 'loading' ? 'verificando…'
              : e.state?.status === 'error' ? 'erro na consulta'
              : e.hours === null ? 'sem conversas registradas'
              : e.hours < 1 ? 'ativo há menos de 1h'
              : e.hours < 48 ? `última atividade há ${Math.round(e.hours)}h`
              : `última atividade há ${Math.round(e.hours / 24)} dias`;
            const border = e.level === 'bad' ? 'border-red-900/60' : e.level === 'warn' ? 'border-yellow-900/60' : 'border-brand-light';
            return (
              <div key={e.key} className={`flex items-center gap-2.5 text-sm px-3 py-3 rounded-xl bg-brand-medium border ${border}`}>
                <span className="text-base">{icon}</span>
                <div className="min-w-0">
                  <p className="text-white font-bold text-xs truncate">{e.name}</p>
                  <p className="text-gray-500 text-[11px]">{detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
