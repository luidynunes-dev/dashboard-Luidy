// Réguas de custo por resultado usadas na tela "Custo por Mensagem".
//
//   custo <= ideal          → verde   (bom)
//   ideal < custo <= caro   → amarelo (médio)
//   custo > caro            → vermelho (caro — chamar o gestor)
//
// Para mudar a régua de uma loja específica, adicione a chave dela (mesma chave de
// metaAccounts.ts / storeGroups.ts) em porLoja do tipo de campanha.

export type CampaignKind = 'whatsapp' | 'vip' | 'perfil';

export interface CostThreshold {
  ideal: number;
  caro:  number;
}

interface KindConfig {
  padrao:  CostThreshold;
  porLoja: Record<string, CostThreshold>;
}

export const THRESHOLDS: Record<CampaignKind, KindConfig> = {
  // Definido pelo Luidy: até R$ 3 bom, acima de R$ 6 caro.
  whatsapp: {
    padrao: { ideal: 3, caro: 6 },
    porLoja: {
      // Swarovski (ticket alto) — aprovado pelo Luidy em 30/10/26, com base na DRE 2026:
      // margem de contribuição de 45% sobre ticket de ~R$ 1.700–1.840, conversão de 7–12% e
      // verba de WhatsApp de ~R$ 570/mês. Acima de ~R$ 22 por conversa as vendas deixam de
      // cobrir mídia + fee. O Quiosque não tem DRE e segue a régua de Maringá.
      'swarovski-maringa':  { ideal: 15, caro: 22 },
      'swarovski-curitiba': { ideal: 15, caro: 22 },
      'swarovski-quiosque': { ideal: 15, caro: 22 },
      // 'luiza-barcelos':     { ideal: 0, caro: 0 },  // definir quando a conta estiver no ar
    },
  },
  // PROVISÓRIO — tirado do histórico de 90 dias (jul–out/26) de 6 contas da GESTA:
  // custo por conversa das campanhas [GRUPO VIP] entre R$ 0,75 e R$ 4,32, mediana ~R$ 1,45.
  vip: {
    padrao: { ideal: 1.5, caro: 3 },
    porLoja: {},
  },
  // PROVISÓRIO — histórico de 90 dias de 7 contas: custo por visita entre R$ 0,11 e R$ 0,94,
  // mediana ~R$ 0,37.
  perfil: {
    padrao: { ideal: 0.4, caro: 0.7 },
    porLoja: {},
  },
};

export function thresholdFor(kind: CampaignKind, storeKey: string): CostThreshold {
  return THRESHOLDS[kind].porLoja[storeKey] ?? THRESHOLDS[kind].padrao;
}
