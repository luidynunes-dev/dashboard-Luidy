// Função serverless (roda no servidor da Vercel, nunca no navegador do visitante).
// O token da Meta fica SOMENTE aqui, lido da variável de ambiente META_ACCESS_TOKEN
// (sem prefixo VITE_, para não ir parar no bundle do front-end).
//
// O front chama:  /api/meta?path=/act_123/insights&fields=...&date_preset=last_7d
// e esta função repassa para https://graph.facebook.com/v21.0/act_123/insights?...&access_token=<token>

export const config = { runtime: 'edge' };

const GRAPH = 'https://graph.facebook.com/v21.0';

// Só aceita os formatos de caminho que o dashboard realmente usa:
//   /act_123            (saldo da conta)
//   /act_123/insights   /act_123/campaigns
//   /123/ads            (anúncios de uma campanha)
//   /123                (perfil do Instagram)
//   /123/insights       /123/stories   (Instagram e stories)
// Qualquer outra coisa (ex.: /me, /act_123/adaccounts, edges de escrita) é recusada.
const ALLOWED_PATH = /^\/(act_)?\d+(\/(insights|campaigns|ads|stories))?$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return json({ error: 'Método não permitido' }, 405);

  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return json({ error: 'META_ACCESS_TOKEN não configurada no servidor.' }, 500);

  const incoming = new URL(req.url).searchParams;
  const path = incoming.get('path') ?? '';
  if (!ALLOWED_PATH.test(path)) return json({ error: 'Caminho não permitido' }, 400);

  // Repassa todos os parâmetros, menos "path" e qualquer access_token vindo do navegador.
  const params = new URLSearchParams(incoming);
  params.delete('path');
  params.delete('access_token');
  params.set('access_token', token);

  try {
    const res = await fetch(`${GRAPH}${path}?${params.toString()}`);
    const body = await res.text();
    // Devolve o JSON da Meta como veio (inclusive o objeto "error"), para o front tratar igual a antes.
    return new Response(body, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    return json({ error: err?.message ?? 'Erro desconhecido' }, 502);
  }
}
