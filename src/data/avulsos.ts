// ─── CLIENTES AVULSOS ────────────────────────────────────────────────────────
// 11 clientes standalone, cada um com fee próprio a confirmar.
// historico começa vazio — preencher com dados reais de vendas/Meta Ads/Kommo.

import { GroupData } from '../types';

export const AVULSOS: GroupData = {
  id: 'avulsos',
  name: 'Clientes Avulsos',
  color: '#0ea5e9',
  fee: 1500,
  stores: [
    { id: 'usaflex-araxa',        name: 'Usaflex Araxá',           color: '#0ea5e9', fee: 1697, historico: [], planos: [] },
    { id: 'via-orlandia',         name: 'Via Orlândia',            color: '#0ea5e9', fee: 1500, historico: [], planos: [] },
    { id: 'brothers-shoes',       name: 'Brothers Shoes',          color: '#0ea5e9', fee: 1500, historico: [], planos: [] },
    { id: 'usaflex-patos-minas',  name: 'Usaflex Patos de Minas',  color: '#0ea5e9', fee: 1440, historico: [], planos: [] },
    { id: 'fetiche-love-shop',    name: 'Fetiche Love Shop',       color: '#0ea5e9', fee: 1440, historico: [], planos: [] },
    { id: 'swarovski-maringa',    name: 'Swarovski Maringá',       color: '#0ea5e9', fee: 1674, historico: [], planos: [] },
    { id: 'swarovski-curitiba',   name: 'Swarovski Curitiba',      color: '#0ea5e9', fee: 1674, historico: [], planos: [] },
    { id: 'usaflex-savassi',      name: 'Usaflex Savassi',         color: '#0ea5e9', fee: 1500, historico: [], planos: [] },
    { id: 're-calcados',          name: 'Rê Calçados',             color: '#0ea5e9', fee: 1500, historico: [], planos: [] },
    { id: 'santa-lolla',          name: 'Santa Lolla',             color: '#0ea5e9', fee: 1500, historico: [], planos: [] },
    { id: 'usaflex-cascavel',     name: 'Usaflex Cascavel',        color: '#0ea5e9', fee: 1674, historico: [], planos: [] },
  ],
};
