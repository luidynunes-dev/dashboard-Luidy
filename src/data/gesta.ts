// ─── GRUPO GESTA ─────────────────────────────────────────────────────────────
// 33 lojas ativas — Nathália (Adidas), Alexandre (Nação), Patrícia (Femininas)
// Para preencher o histórico: copie um objeto MonthData e atualize os campos.
// historico começa vazio — preencher com dados reais de vendas/Meta Ads/Kommo.

import { GroupData } from '../types';

export const GESTA: GroupData = {
  id: 'gesta',
  name: 'Grupo GESTA',
  color: '#7c3aed',
  fee: 1500,
  stores: [

    // ── NATHÁLIA — ADIDAS (7 lojas) ──────────────────────────────────────────
    { id: 'adidas-performance-porto-velho', name: 'Adidas Performance Porto Velho', color: '#000000', fee: 1500, historico: [], planos: [] },
    { id: 'adidas-performance-rio-branco',  name: 'Adidas Performance Rio Branco',  color: '#000000', fee: 1500, historico: [], planos: [] },
    { id: 'adidas-performance-grao-para',   name: 'Adidas Performance Grão Pará',   color: '#000000', fee: 1500, historico: [], planos: [] },
    { id: 'adidas-performance-belem',       name: 'Adidas Performance Belém',       color: '#000000', fee: 1500, historico: [], planos: [] },
    { id: 'adidas-kids',                    name: 'Adidas Kids',                    color: '#000000', fee: 1500, historico: [], planos: [] },
    { id: 'adidas-originals-belem',         name: 'Adidas Originals Belém',         color: '#000000', fee: 1500, historico: [], planos: [] },
    { id: 'adidas-originals-manauara',      name: 'Adidas Originals Manauara',      color: '#000000', fee: 1500, historico: [], planos: [] },

    // ── ALEXANDRE — NAÇÃO (6 lojas) ──────────────────────────────────────────
    { id: 'nacao-via-norte',   name: 'Nação Via Norte',   color: '#f59e0b', fee: 1500, historico: [], planos: [] },
    { id: 'nacao-ponta-negra', name: 'Nação Ponta Negra', color: '#f59e0b', fee: 1500, historico: [], planos: [] },
    { id: 'nacao-rio-branco',  name: 'Nação Rio Branco',  color: '#f59e0b', fee: 1500, historico: [], planos: [] },
    { id: 'nacao-manaus',      name: 'Nação Manaus',      color: '#f59e0b', fee: 1500, historico: [], planos: [] },
    { id: 'nacao-boa-vista',   name: 'Nação Boa Vista',   color: '#f59e0b', fee: 1500, historico: [], planos: [] },
    { id: 'nacao-porto-velho', name: 'Nação Porto Velho', color: '#f59e0b', fee: 1500, historico: [], planos: [] },

    // ── PATRÍCIA — LOJAS FEMININAS (20 lojas) ────────────────────────────────
    { id: 'shoes-off',          name: 'Shoes Off',          color: '#ec4899', fee: 1500, historico: [], planos: [] },
    { id: 'capodarte-amazonas', name: 'Capodarte Amazonas', color: '#ec4899', fee: 1500, historico: [], planos: [] },
    { id: 'atelier-mix',        name: 'Atelier Mix',        color: '#ec4899', fee: 1500, historico: [], planos: [] },

    // Piccadilly (8 lojas) — fee R$1.200
    { id: 'piccadilly-ponta-negra',       name: 'Piccadilly Ponta Negra',        color: '#3b82f6', fee: 1200, historico: [], planos: [] },
    { id: 'piccadilly-rio-branco',        name: 'Piccadilly Rio Branco',         color: '#3b82f6', fee: 1200, historico: [], planos: [] },
    { id: 'piccadilly-manauara',          name: 'Piccadilly Manauara',           color: '#3b82f6', fee: 1200, historico: [], planos: [] },
    { id: 'piccadilly-amazonas',          name: 'Piccadilly Amazonas',           color: '#3b82f6', fee: 1200, historico: [], planos: [] },
    { id: 'piccadilly-boa-vista',         name: 'Piccadilly Boa Vista',          color: '#3b82f6', fee: 1200, historico: [], planos: [] },
    { id: 'piccadilly-patio-belem',       name: 'Piccadilly Pátio Belém',        color: '#3b82f6', fee: 1200, historico: [], planos: [] },
    { id: 'piccadilly-parque-belem',      name: 'Piccadilly Parque Shopping Belém', color: '#3b82f6', fee: 1200, historico: [], planos: [] },
    { id: 'piccadilly-boulevard-belem',   name: 'Piccadilly Boulevard Belém',    color: '#3b82f6', fee: 1200, historico: [], planos: [] },

    // Loungerie (3 lojas)
    { id: 'loungerie-ponta-negra', name: 'Loungerie Ponta Negra', color: '#a855f7', fee: 1500, historico: [], planos: [] },
    { id: 'loungerie-manauara',    name: 'Loungerie Manauara',    color: '#a855f7', fee: 1500, historico: [], planos: [] },
    { id: 'loungerie-porto-velho', name: 'Loungerie Porto Velho', color: '#a855f7', fee: 1500, historico: [], planos: [] },

    // Petite Jolie (3 lojas)
    { id: 'petite-jolie-sumauma',  name: 'Petite Jolie Sumaúma',  color: '#22c55e', fee: 1500, historico: [], planos: [] },
    { id: 'petite-jolie-manauara', name: 'Petite Jolie Manauara', color: '#22c55e', fee: 1500, historico: [], planos: [] },
    { id: 'petite-jolie-belem',    name: 'Petite Jolie Belém',    color: '#22c55e', fee: 1500, historico: [], planos: [] },

    // Ferracini (3 lojas — GESTA)
    { id: 'ferracini-manauara-gesta', name: 'Ferracini Manauara', color: '#ef4444', fee: 1500, historico: [], planos: [] },
    { id: 'ferracini-belem-gesta',    name: 'Ferracini Belém',    color: '#ef4444', fee: 1500, historico: [], planos: [] },
    { id: 'ferracini-amazonas-gesta', name: 'Ferracini Amazonas', color: '#ef4444', fee: 1500, historico: [], planos: [] },
  ],
};
