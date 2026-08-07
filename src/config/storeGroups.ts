import { META_ACCOUNTS } from './metaAccounts';

export interface StoreEntry {
  key:             string;
  name:            string;
  accountId:       string;
  nameFilter?:     string;
  excludeFilters?: string[];
  noKommo?:        boolean;
}

export interface WhatsappGroup {
  id: string;
  name: string;
  storeKeys: string[];
}

// Nome de exibição para cada chave do META_ACCOUNTS
export const DISPLAY_NAMES: Record<string, string> = {
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
  'petite-jolie-sumauma':      'Petite Jolie Sumaúma',
  'petite-jolie-manauara':     'Petite Jolie Manauara',
  'petite-jolie-patio-belem':  'Petite Jolie Pátio Belém',
  'petite-jolie-boulevard':    'Petite Jolie Boulevard',
  'ferracini-manauara-gesta': 'Ferracini Manauara',
  'ferracini-belem-gesta':    'Ferracini Belém',
  'ferracini-amazonas-gesta': 'Ferracini Amazonas',
  // Clientes Avulsos
  'usaflex-araxa':       'Usaflex Araxá',
  'via-orlandia':        'Via Orlândia',
  'usaflex-patos-minas': 'Usaflex Patos de Minas',
  'fetiche-love-shop':   'Fetiche Love Shop',
  'swarovski-maringa':   'Swarovski Maringá Park',
  'swarovski-curitiba':  'Swarovski Curitiba',
  'swarovski-quiosque':  'Swarovski Maringá Quiosque',
  'usaflex-savassi':     'Usaflex Savassi',
  're-calcados':         'Rê Calçados',
  'santa-lolla':         'Santa Lolla',
  'usaflex-cascavel':    'Usaflex Cascavel',
};

// ─── Grupos de reunião (mesma divisão dos grupos de WhatsApp) ────────────────
export const WHATSAPP_GROUPS: WhatsappGroup[] = [
  { id: 'g-adidas-perf', name: 'Adidas Belém, Rio Branco, Porto Velho e Grão Pará',
    storeKeys: ['adidas-performance-belem','adidas-performance-rio-branco','adidas-performance-porto-velho','adidas-performance-grao-para'] },
  { id: 'g-adidas-kids', name: 'Adidas Kids', storeKeys: ['adidas-kids'] },
  { id: 'g-adidas-orig', name: 'Adidas Originals', storeKeys: ['adidas-originals-belem','adidas-originals-manauara'] },
  { id: 'g-atelier-capodarte', name: 'Atelier Mix / Capodarte', storeKeys: ['atelier-mix','capodarte-amazonas'] },
  { id: 'g-ferracini', name: 'Ferracini Amazonas, Belém e Manauara',
    storeKeys: ['ferracini-amazonas-gesta','ferracini-belem-gesta','ferracini-manauara-gesta'] },
  { id: 'g-loungerie', name: 'Loungerie Porto Velho, Ponta Negra e Manauara',
    storeKeys: ['loungerie-porto-velho','loungerie-ponta-negra','loungerie-manauara'] },
  { id: 'g-nacao', name: 'Nação RB',
    storeKeys: ['nacao-via-norte','nacao-ponta-negra','nacao-rio-branco','nacao-manaus','nacao-boa-vista','nacao-porto-velho'] },
  { id: 'g-petite-sumauma-manauara', name: 'Petite Jolie Sumaúma e Manauara',
    storeKeys: ['petite-jolie-sumauma','petite-jolie-manauara'] },
  { id: 'g-petite-boulevard-patio', name: 'Petite Jolie Boulevard e Pátio Belém',
    storeKeys: ['petite-jolie-boulevard','petite-jolie-patio-belem'] },
  { id: 'g-picc-belem', name: 'Piccadilly Pátio Belém, Boulevard Belém, Parque Belém',
    storeKeys: ['piccadilly-patio-belem','piccadilly-boulevard-belem','piccadilly-parque-belem'] },
  { id: 'g-picc-bv-rb', name: 'Piccadilly Boa Vista | Rio Branco',
    storeKeys: ['piccadilly-boa-vista','piccadilly-rio-branco'] },
  { id: 'g-picc-am', name: 'Piccadilly Amazonas, Manauara e Ponta Negra',
    storeKeys: ['piccadilly-amazonas','piccadilly-manauara','piccadilly-ponta-negra'] },
  { id: 'g-shoes-off', name: 'Shoes Off', storeKeys: ['shoes-off'] },
  { id: 'g-fetiche', name: 'Fetiche Love', storeKeys: ['fetiche-love-shop'] },
  { id: 'g-re', name: 'Rê Calçados', storeKeys: ['re-calcados'] },
  { id: 'g-santa-lolla', name: 'Santa Lolla Santo Antão', storeKeys: ['santa-lolla'] },
  { id: 'g-swarovski', name: 'Swarovski Maringá | Curitiba', storeKeys: ['swarovski-maringa','swarovski-curitiba','swarovski-quiosque'] },
  { id: 'g-usaflex-araxa', name: 'Usaflex Araxá', storeKeys: ['usaflex-araxa'] },
  { id: 'g-usaflex-cascavel', name: 'Usaflex Cascavel', storeKeys: ['usaflex-cascavel'] },
  { id: 'g-usaflex-patos', name: 'Usaflex Patos de Minas', storeKeys: ['usaflex-patos-minas'] },
  { id: 'g-usaflex-savassi', name: 'Usaflex Savassi', storeKeys: ['usaflex-savassi'] },
  { id: 'g-via-orlandia', name: 'Via Orlândia Calçados', storeKeys: ['via-orlandia'] },
];

// Contas compartilhadas por mais de uma loja: cada loja filtra por keyword no nome de campanha.
const MULTI_STORE_GROUPS: { accountId: string; stores: { key: string; name: string; nameFilter?: string; excludeFilters?: string[]; noKommo?: boolean }[] }[] = [
  {
    accountId: META_ACCOUNTS['ferracini-manauara-gesta'],
    stores: [
      { key: 'ferracini-manauara-gesta', name: 'Ferracini Manauara', nameFilter: 'MANAUARA' },
      { key: 'ferracini-amazonas-gesta', name: 'Ferracini Amazonas', nameFilter: 'AMAZONAS' },
    ],
  },
  {
    accountId: META_ACCOUNTS['swarovski-maringa'],
    stores: [
      { key: 'swarovski-maringa',  name: 'Swarovski Maringá Park',     excludeFilters: ['CURITIBA', 'QUIOSQUE'] },
      { key: 'swarovski-curitiba', name: 'Swarovski Curitiba',         nameFilter: 'CURITIBA' },
      { key: 'swarovski-quiosque', name: 'Swarovski Maringá Quiosque', nameFilter: 'QUIOSQUE', noKommo: true },
    ],
  },
];

const MULTI_STORE_KEYS = new Set(
  MULTI_STORE_GROUPS.flatMap(g => g.stores.map(s => s.key)),
);

const SINGLE_STORE_ENTRIES: StoreEntry[] = Object.entries(META_ACCOUNTS)
  .filter(([key]) => !MULTI_STORE_KEYS.has(key))
  .map(([key, accountId]) => ({
    key,
    name: DISPLAY_NAMES[key] ?? key,
    accountId,
  }));

const MULTI_STORE_ENTRIES: StoreEntry[] = MULTI_STORE_GROUPS.flatMap(g =>
  g.stores.map(s => ({ ...s, accountId: g.accountId })),
);

export const ALL_STORES: StoreEntry[] = [
  ...SINGLE_STORE_ENTRIES,
  ...MULTI_STORE_ENTRIES,
].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

export const STORE_BY_KEY: Record<string, StoreEntry> = Object.fromEntries(ALL_STORES.map(s => [s.key, s]));
