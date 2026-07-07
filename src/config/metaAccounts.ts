// Mapeamento storeId → Ad Account ID do Meta
// Preencha com os Act IDs reais de cada loja (ex: 'act_123456789012345')
// O storeId deve ser exatamente igual ao "id" usado em src/data/gesta.ts e src/data/avulsos.ts

export const META_ACCOUNTS: Record<string, string> = {
  // ── Grupo GESTA — Adidas (Nathália) ──────────────────────────────────────
  'adidas-performance-porto-velho': '',
  'adidas-performance-rio-branco':  '',
  'adidas-performance-grao-para':   '',
  'adidas-performance-belem':       '',
  'adidas-kids':                    '',
  'adidas-originals-belem':         '',
  'adidas-originals-manauara':      '',

  // ── Grupo GESTA — Nação (Alexandre) ──────────────────────────────────────
  'nacao-via-norte':   '',
  'nacao-ponta-negra': '',
  'nacao-rio-branco':  '',
  'nacao-manaus':      '',
  'nacao-boa-vista':   '',
  'nacao-porto-velho': '',

  // ── Grupo GESTA — Femininas (Patrícia) ───────────────────────────────────
  'shoes-off':          '',
  'capodarte-amazonas': '',
  'atelier-mix':        '',
  'piccadilly-ponta-negra':     '',
  'piccadilly-rio-branco':      '',
  'piccadilly-manauara':        '',
  'piccadilly-amazonas':        '',
  'piccadilly-boa-vista':       '',
  'piccadilly-patio-belem':     '',
  'piccadilly-parque-belem':    '',
  'piccadilly-boulevard-belem': '',
  'loungerie-ponta-negra': '',
  'loungerie-manauara':    '',
  'loungerie-porto-velho': '',
  'petite-jolie-sumauma':  '',
  'petite-jolie-manauara': '',
  'petite-jolie-belem':    '',
  'ferracini-manauara-gesta': '',
  'ferracini-belem-gesta':    '',
  'ferracini-amazonas-gesta': '',

  // ── Clientes Avulsos ──────────────────────────────────────────────────────
  'usaflex-araxa':       '',
  'via-orlandia':        '',
  'brothers-shoes':      '',
  'usaflex-patos-minas': '',
  'fetiche-love-shop':   '',
  'swarovski-maringa':   '',
  'swarovski-curitiba':  '',
  'usaflex-savassi':     '',
  're-calcados':         '',
  'santa-lolla':         '',
  'usaflex-cascavel':    '',
};
