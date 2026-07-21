import React, { useState, useCallback } from 'react';
import { RefreshCw, Wallet } from 'lucide-react';
import { META_ACCOUNTS } from '../../config/metaAccounts';
import { getAccountBalance, AccountBalance } from '../../services/metaService';
import { mapWithConcurrency } from '../../services/kommoService';

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

// Contas únicas (várias lojas podem compartilhar o mesmo Act ID)
const ACCOUNTS = Array.from(
  new Map(
    Object.entries(META_ACCOUNTS)
      .filter(([key, id]) => DISPLAY_NAMES[key] && id)
      .map(([key, id]) => [id, { key, id, name: DISPLAY_NAMES[key] }]),
  ).values(),
).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

// Abaixo disso, o saldo entra em alerta
const LIMITE_ALERTA = 100;

type BalState = { status: 'loading' } | { status: 'done'; data: AccountBalance } | { status: 'error'; message: string };

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_LABEL: Record<number, string> = {
  1: 'Ativa', 2: 'Desabilitada', 3: 'Não confirmada',
  7: 'Em revisão', 8: 'Pendente', 9: 'Em período de graça', 101: 'Fechada',
};

export function AccountBalanceView() {
  const [states, setStates] = useState<Record<string, BalState>>({});
  const [running, setRunning] = useState(false);

  const checkAll = useCallback(async () => {
    setRunning(true);
    setStates(Object.fromEntries(ACCOUNTS.map(a => [a.id, { status: 'loading' }])));

    await mapWithConcurrency(ACCOUNTS, 5, 300, async ({ id }) => {
      try {
        const data = await getAccountBalance(id);
        setStates(prev => ({ ...prev, [id]: { status: 'done', data } }));
      } catch (err: any) {
        setStates(prev => ({ ...prev, [id]: { status: 'error', message: err?.message ?? 'Erro' } }));
      }
    });

    setRunning(false);
  }, []);

  const entries = ACCOUNTS.map(a => {
    const st = states[a.id];
    let level: 'ok' | 'warn' | 'bad' | 'unknown' = 'unknown';
    if (st?.status === 'done') {
      const contaOk = st.data.accountStatus === 1;
      if (!contaOk) level = 'bad';
      else if (st.data.balance <= 0) level = 'bad';
      else if (st.data.balance < LIMITE_ALERTA) level = 'warn';
      else level = 'ok';
    } else if (st?.status === 'error') {
      level = 'bad';
    }
    return { ...a, state: st, level };
  });

  const checked = Object.keys(states).length > 0;
  const order = { bad: 0, warn: 1, unknown: 2, ok: 3 } as const;
  const sorted = [...entries].sort((a, b) => order[a.level] - order[b.level] || a.name.localeCompare(b.name, 'pt-BR'));

  const totalSaldo = entries.reduce((sum, e) => sum + (e.state?.status === 'done' ? e.state.data.balance : 0), 0);
  const badCount   = entries.filter(e => e.level === 'bad').length;
  const warnCount  = entries.filter(e => e.level === 'warn').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Saldo das Contas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Saldo disponível e status de cada conta de anúncios no Meta.
          </p>
        </div>
        <button
          onClick={checkAll}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-purple hover:bg-brand-purple/80 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Consultando…' : 'Consultar saldos'}
        </button>
      </div>

      <p className="text-xs text-gray-600">
        🔴 sem saldo ou conta com problema · ⚠️ abaixo de R$ {LIMITE_ALERTA} · ✅ saldo normal
      </p>

      {checked && !running && (
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="text-gray-300 font-bold">Total em conta: R$ {fmtBRL(totalSaldo)}</span>
          {badCount > 0 && <span className="text-red-400 font-bold">🔴 {badCount} crítico</span>}
          {warnCount > 0 && <span className="text-yellow-400 font-bold">⚠️ {warnCount} saldo baixo</span>}
        </div>
      )}

      {!checked && (
        <div className="bg-brand-medium border border-brand-light rounded-xl p-8 text-center">
          <Wallet className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Clique em "Consultar saldos" para verificar todas as contas.</p>
        </div>
      )}

      {checked && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {sorted.map(e => {
            const icon = e.level === 'ok' ? '✅' : e.level === 'warn' ? '⚠️' : e.level === 'bad' ? '🔴' : '⏳';
            const border = e.level === 'bad' ? 'border-red-900/60' : e.level === 'warn' ? 'border-yellow-900/60' : 'border-brand-light';

            let detail = 'consultando…';
            if (e.state?.status === 'error') {
              detail = `erro: ${e.state.message}`;
            } else if (e.state?.status === 'done') {
              const d = e.state.data;
              const statusTxt = d.accountStatus === 1 ? '' : ` · ${STATUS_LABEL[d.accountStatus] ?? 'status ' + d.accountStatus}`;
              detail = `R$ ${fmtBRL(d.balance)} disponível${statusTxt}`;
            }

            return (
              <div key={e.id} className={`flex items-center gap-2.5 text-sm px-3 py-3 rounded-xl bg-brand-medium border ${border}`}>
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
