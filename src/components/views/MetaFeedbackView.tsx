import React, { useState, useCallback } from 'react';
import { Copy, Check, RefreshCw, MessageSquare } from 'lucide-react';
import { META_ACCOUNTS } from '../../config/metaAccounts';
import { getAccountFeedbackData, FeedbackData } from '../../services/metaService';
import { getStoreSales, mapWithConcurrency, KommoSales } from '../../services/kommoService';

// Nome de exibição para cada chave do META_ACCOUNTS
const DISPLAY_NAMES: Record<string, string> = {
  // Adidas (Nathália)
  'adidas-performance-porto-velho': 'Adidas Performance Porto Velho',
  'adidas-performance-rio-branco':  'Adidas Performance Rio Branco',
  'adidas-performance-grao-para':   'Adidas Performance Grão Pará',
  'adidas-performance-belem':       'Adidas Performance Belém',
  'adidas-kids':                    'Adidas Kids',
  'adidas-originals-belem':         'Adidas Originals Belém',
  'adidas-originals-manauara':      'Adidas Originals Manauara',
  // Nação (Alexandre)
  'nacao-via-norte':   'Nação Via Norte',
  'nacao-ponta-negra': 'Nação Ponta Negra',
  'nacao-rio-branco':  'Nação Rio Branco',
  'nacao-manaus':      'Nação Manaus',
  'nacao-boa-vista':   'Nação Boa Vista',
  'nacao-porto-velho': 'Nação Porto Velho',
  // Femininas (Patrícia)
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
  // Clientes Avulsos
  'usaflex-araxa':       'Usaflex Araxá',
  'via-orlandia':        'Via Orlândia',
  'brothers-shoes':      'Brothers Shoes',
  'usaflex-patos-minas': 'Usaflex Patos de Minas',
  'fetiche-love-shop':   'Fetiche Love Shop',
  'swarovski-maringa':   'Swarovski Maringá',
  'swarovski-curitiba':  'Swarovski Curitiba',
  'usaflex-savassi':     'Usaflex Savassi',
  're-calcados':         'Rê Calçados',
  'santa-lolla':         'Santa Lolla',
  'usaflex-cascavel':    'Usaflex Cascavel',
};

// Contas compartilhadas por mais de uma loja: cada loja filtra por keyword no nome de campanha.
// Ferracini Manauara e Amazonas usam o mesmo Act ID — ajuste os nameFilter abaixo
// para baterem com o padrão real usado nos nomes das campanhas dessas duas lojas.
const MULTI_STORE_GROUPS: { accountId: string; stores: { key: string; name: string; nameFilter: string }[] }[] = [
  {
    accountId: META_ACCOUNTS['ferracini-manauara-gesta'],
    stores: [
      { key: 'ferracini-manauara-gesta', name: 'Ferracini Manauara', nameFilter: 'MANAUARA' },
      { key: 'ferracini-amazonas-gesta', name: 'Ferracini Amazonas', nameFilter: 'AMAZONAS' },
    ],
  },
];

const MULTI_STORE_KEYS = new Set(
  MULTI_STORE_GROUPS.flatMap(g => g.stores.map(s => s.key)),
);

interface StoreEntry {
  key:         string;
  name:        string;
  accountId:   string;
  nameFilter?: string;
}

// Lojas de conta única
const SINGLE_STORE_ENTRIES: StoreEntry[] = Object.entries(META_ACCOUNTS)
  .filter(([key]) => !MULTI_STORE_KEYS.has(key))
  .map(([key, accountId]) => ({
    key,
    name: DISPLAY_NAMES[key] ?? key,
    accountId,
  }));

// Lojas de conta compartilhada (com filtro por nome de campanha)
const MULTI_STORE_ENTRIES: StoreEntry[] = MULTI_STORE_GROUPS.flatMap(g =>
  g.stores.map(s => ({ ...s, accountId: g.accountId })),
);

const ALL_STORES: StoreEntry[] = [
  ...SINGLE_STORE_ENTRIES,
  ...MULTI_STORE_ENTRIES,
].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

// ─── Formatação ───────────────────────────────────────────────────────────────

type StoreState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; data: FeedbackData; sales: KommoSales | null }
  | { status: 'empty' }
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

function buildMessage(name: string, data: FeedbackData, sales: KommoSales | null): string {
  const lines: string[] = [
    `Muito bom dia pessoal! Excelente sexta-feira.😁`,
    `📆 Passando agora, para mostrar os resultados das campanhas nesses últimos 7 dias.`,
    `(${fmtDate(data.dateStart)} a ${fmtDate(data.dateStop)})`,
    ``,
    `─────${name}─────`,
    ``,
    `Total investido: R$ ${fmtBRL(data.totalSpend)}`,
    ``,
    `🔵 No Meta Ads 🔵`,
  ];

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
    } else {
      lines.push(`📣 Campanha`);
      lines.push(`Nome da campanha: ${c.name}`);
      lines.push(`💵 Investimento: R$ ${fmtBRL(c.spend)}`);
      lines.push(``);
    }
  }

  lines.push(`🟢 Resultados (Kommo) 🟢`);
  if (sales) {
    lines.push(`🛍️ Vendas realizadas: ${fmtNumber(sales.vendas)}`);
    lines.push(`💰 Valor em vendas: R$ ${fmtBRL(sales.valorVendas)}`);
  } else {
    lines.push(`🛍️ Vendas realizadas: —`);
    lines.push(`💰 Valor em vendas: R$ —`);
  }

  return lines.join('\n');
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function MetaFeedbackView() {
  const [states, setStates] = useState<Record<string, StoreState>>(() =>
    Object.fromEntries(ALL_STORES.map(s => [s.key, { status: 'idle' }])),
  );
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);

  const setStore = useCallback((key: string, state: StoreState) => {
    setStates(prev => ({ ...prev, [key]: state }));
  }, []);

  const fetchAll = useCallback(async () => {
    setRunning(true);
    setStates(Object.fromEntries(ALL_STORES.map(s => [s.key, { status: 'loading' }])));

    // Lotes de 5 lojas por vez, com 400ms de intervalo — bem abaixo do limite
    // do Kommo (7 req/s), mesmo considerando que cada loja é uma conta separada.
    await mapWithConcurrency(ALL_STORES, 5, 400, async ({ key, accountId, nameFilter }) => {
      try {
        const [data, sales] = await Promise.all([
          getAccountFeedbackData(accountId, nameFilter),
          getStoreSales(key).catch(() => null), // se o Kommo falhar, segue só com o Meta
        ]);
        setStore(key, data ? { status: 'done', data, sales } : { status: 'empty' });
      } catch (err: any) {
        setStore(key, { status: 'error', message: err?.message ?? 'Erro desconhecido' });
      }
    });

    setRunning(false);
  }, [setStore]);

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
  };

  const doneCount  = ALL_STORES.filter(s => states[s.key]?.status === 'done').length;
  const emptyCount = ALL_STORES.filter(s => states[s.key]?.status === 'empty').length;
  const errorCount = ALL_STORES.filter(s => states[s.key]?.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Feedbacks Meta</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gera as mensagens de resultado dos últimos 7 dias para todos os clientes.
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

      {/* Resumo */}
      {!running && doneCount > 0 && (
        <div className="flex gap-4 text-xs">
          <span className="text-green-400 font-bold">{doneCount} gerados</span>
          {emptyCount > 0 && <span className="text-gray-500 font-bold">{emptyCount} sem gasto</span>}
          {errorCount > 0 && <span className="text-red-400 font-bold">{errorCount} com erro</span>}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {ALL_STORES.map(({ key, name }) => {
          const state = states[key];
          const message = state.status === 'done' ? buildMessage(name, state.data, state.sales) : '';

          return (
            <div
              key={key}
              className="bg-brand-medium border border-brand-light rounded-xl p-4 flex flex-col gap-3"
            >
              {/* Store header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-purple shrink-0" />
                  <span className="text-sm font-bold text-white">{name}</span>
                </div>
                {state.status === 'done' && (
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

              {/* Content */}
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
              {state.status === 'empty' && (
                <p className="text-xs text-gray-500 italic">Sem gasto nos últimos 7 dias.</p>
              )}
              {state.status === 'error' && (
                <p className="text-xs text-red-400">Erro: {state.message}</p>
              )}
              {state.status === 'done' && (
                <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed font-sans bg-brand-dark/50 rounded-lg p-3 border border-brand-light">
                  {message}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
