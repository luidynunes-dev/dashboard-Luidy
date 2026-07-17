// Função serverless (roda no servidor da Vercel, nunca no navegador do visitante).
// Os tokens do Kommo ficam SOMENTE aqui, lidos de uma variável de ambiente
// (KOMMO_ACCOUNTS) configurada direto no painel da Vercel — nunca no GitHub,
// nunca no bundle do front-end.
//
// KOMMO_ACCOUNTS deve ser uma string JSON no formato:
// { "storeId": { "subdomain": "xxx", "token": "xxx", "wonStatusId": 142 }, ... }

export const config = { runtime: 'edge' };

interface KommoAccount {
  subdomain: string;
  token: string;
  wonStatusId?: number; // status_id do estágio "Venda ganha" no funil (padrão Kommo: 142)
}

function loadAccounts(): Record<string, KommoAccount> {
  const raw = process.env.KOMMO_ACCOUNTS;
  if (!raw) throw new Error('KOMMO_ACCOUNTS não configurada no servidor.');
  return JSON.parse(raw);
}

async function kommoFetch(subdomain: string, token: string, path: string) {
  const res = await fetch(`https://${subdomain}.kommo.com/api/v4/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Kommo retorna 204 (sem corpo) quando não há nenhum resultado — não é erro
  if (res.status === 204) return { _embedded: { leads: [] } };

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Kommo ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// Vendas fechadas (status "Venda ganha") no período informado (timestamps Unix, em segundos)
async function getSales(account: KommoAccount, from: number, to: number) {
  const wonStatusId = account.wonStatusId ?? 142; // 142 = status padrão "Venda ganha" no Kommo

  let vendas = 0;
  let valorVendas = 0;
  let page = 1;

  // Pagina até esgotar os resultados (o filtro de status é aplicado aqui no
  // código, lead a lead — o filtro de status da API do Kommo exige pipeline_id
  // junto e pode ser ignorado silenciosamente sem ele, contando leads perdidos)
  while (page <= 20) { // trava de segurança: máx. 20 páginas (5.000 leads)
    const json = await kommoFetch(
      account.subdomain,
      account.token,
      `leads?filter[closed_at][from]=${from}&filter[closed_at][to]=${to}&limit=250&page=${page}`,
    );

    const leads = json._embedded?.leads ?? [];
    if (leads.length === 0) break;

    for (const l of leads) {
      if (l.status_id === wonStatusId) {
        vendas += 1;
        valorVendas += (l.price ?? 0);
      }
    }

    if (leads.length < 250) break; // última página
    page += 1;
  }

  return { vendas, valorVendas };
}

// Handler HTTP (padrão Vercel Serverless Function)
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const storeId = url.searchParams.get('storeId');
  const action  = url.searchParams.get('action') ?? 'sales';
  // since/until no formato 'YYYY-MM-DD'. Se não vierem, usa os últimos 7 dias.
  const sinceParam = url.searchParams.get('since');
  const untilParam = url.searchParams.get('until');

  // Interpreta as datas no fuso de Brasília (-03:00), que é como as vendas
  // são registradas na operação — não em UTC.
  const to   = untilParam ? Math.floor(new Date(`${untilParam}T23:59:59-03:00`).getTime() / 1000) : Math.floor(Date.now() / 1000);
  const from = sinceParam ? Math.floor(new Date(`${sinceParam}T00:00:00-03:00`).getTime() / 1000) : to - 7 * 86400;

  if (!storeId) {
    return new Response(JSON.stringify({ error: 'storeId é obrigatório' }), { status: 400 });
  }

  try {
    const accounts = loadAccounts();
    const account = accounts[storeId];
    if (!account) {
      return new Response(JSON.stringify({ error: `Loja "${storeId}" não encontrada em KOMMO_ACCOUNTS` }), { status: 404 });
    }

    if (action === 'sales') {
      const data = await getSales(account, from, to);
      return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: `action "${action}" não suportada` }), { status: 400 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Erro desconhecido' }), { status: 500 });
  }
}
