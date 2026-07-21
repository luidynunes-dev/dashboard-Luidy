// Serviço client-side — NUNCA chama o Kommo diretamente.
// Sempre passa pela função serverless em /api/kommo, que é quem guarda os tokens.

export interface KommoSales {
  vendas: number;
  valorVendas: number;
}

export interface WhatsappStatus {
  lastActivity: number | null; // timestamp Unix da última conversa
  hoursSince:   number | null; // horas desde a última atividade
}

export async function getWhatsappStatus(storeId: string): Promise<WhatsappStatus> {
  const res = await fetch(`/api/kommo?storeId=${encodeURIComponent(storeId)}&action=whatsapp-status`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Erro ao verificar status do WhatsApp');
  return json;
}

export async function getStoreSales(storeId: string, since?: string, until?: string): Promise<KommoSales | null> {
  const params = new URLSearchParams({ storeId, action: 'sales' });
  if (since) params.set('since', since);
  if (until) params.set('until', until);
  const res = await fetch(`/api/kommo?${params.toString()}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Erro ao buscar vendas no Kommo');
  return json;
}

// ─── Controle de concorrência ────────────────────────────────────────────────
// Mesmo que o limite do Kommo seja por conta (cada loja é uma conta/subdomínio
// diferente, então rodar tudo em paralelo não estoura o limite de UMA conta),
// mantemos isso propositalmente conservador: processa em lotes pequenos com
// um intervalo entre eles, para nunca chegar perto do limite de 7 req/s.

export async function mapWithConcurrency<T, R>(
  items: T[],
  batchSize: number,
  delayMs: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return results;
}
