const BASE  = 'https://graph.facebook.com/v21.0';
const TOKEN = import.meta.env.VITE_META_ACCESS_TOKEN as string;

export type DatePreset = 'last_7d' | 'last_30d' | 'this_month' | 'last_month';

export interface MetaInsights {
  spend:         number;
  reach:         number;
  impressions:   number;
  clicks:        number;
  mensagens:     number;
  custoMensagem: number;
  likes:         number;
  dateStart:     string;
  dateStop:      string;
}

export interface MetaDailyInsight {
  date:      string;
  spend:     number;
  reach:     number;
  mensagens: number;
}

export interface MetaCampaign {
  id:          string;
  name:        string;
  status:      string;
  spend:       number;
  reach:       number;
  impressions: number;
  mensagens:   number;
  custoMensagem: number;
}

function action(actions: { action_type: string; value: string }[] | undefined, type: string): number {
  return parseFloat(actions?.find(a => a.action_type === type)?.value ?? '0');
}

function costPer(list: { action_type: string; value: string }[] | undefined, type: string): number {
  return parseFloat(list?.find(a => a.action_type === type)?.value ?? '0');
}

async function apiFetch(url: string) {
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json;
}

export async function getAccountInsights(
  adAccountId: string,
  datePreset: DatePreset
): Promise<MetaInsights | null> {
  const fields = 'spend,reach,impressions,clicks,actions,cost_per_action_type';
  const url = `${BASE}/${adAccountId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${TOKEN}`;
  const json = await apiFetch(url);
  const d = json.data?.[0];
  if (!d) return null;

  return {
    spend:         parseFloat(d.spend  ?? '0'),
    reach:         parseInt(d.reach    ?? '0'),
    impressions:   parseInt(d.impressions ?? '0'),
    clicks:        parseInt(d.clicks   ?? '0'),
    mensagens:     action(d.actions, 'onsite_conversion.messaging_conversation_started_7d'),
    custoMensagem: costPer(d.cost_per_action_type, 'onsite_conversion.messaging_conversation_started_7d'),
    likes:         action(d.actions, 'like'),
    dateStart:     d.date_start,
    dateStop:      d.date_stop,
  };
}

export async function getAccountTimeSeries(
  adAccountId: string,
  datePreset: DatePreset
): Promise<MetaDailyInsight[]> {
  const url = `${BASE}/${adAccountId}/insights?fields=spend,reach,actions&date_preset=${datePreset}&time_increment=1&access_token=${TOKEN}`;
  const json = await apiFetch(url);
  return (json.data ?? []).map((d: any) => ({
    date:      d.date_start,
    spend:     parseFloat(d.spend ?? '0'),
    reach:     parseInt(d.reach  ?? '0'),
    mensagens: action(d.actions, 'onsite_conversion.messaging_conversation_started_7d'),
  }));
}

export async function getCampaigns(
  adAccountId: string,
  datePreset: DatePreset
): Promise<MetaCampaign[]> {
  const insFields = `spend,reach,impressions,actions,cost_per_action_type`;
  const fields = `id,name,effective_status,insights.date_preset(${datePreset}){${insFields}}`;
  const url = `${BASE}/${adAccountId}/campaigns?fields=${encodeURIComponent(fields)}&limit=20&access_token=${TOKEN}`;
  const json = await apiFetch(url);

  return (json.data ?? []).map((c: any) => {
    const ins = c.insights?.data?.[0];
    return {
      id:            c.id,
      name:          c.name,
      status:        c.effective_status,
      spend:         parseFloat(ins?.spend ?? '0'),
      reach:         parseInt(ins?.reach   ?? '0'),
      impressions:   parseInt(ins?.impressions ?? '0'),
      mensagens:     action(ins?.actions, 'onsite_conversion.messaging_conversation_started_7d'),
      custoMensagem: costPer(ins?.cost_per_action_type, 'onsite_conversion.messaging_conversation_started_7d'),
    };
  });
}

// ─── Feedback semanal (por campanha individual) ─────────────────────────────

export interface CampaignFeedback {
  tipo: 'mensagem' | 'seguidores' | 'outro';
  name: string;
  spend: number;
  mensagens?: number;
  custoMensagem?: number;
  visitasPerfil?: number;
  custoVisita?: number;
}

export interface FeedbackData {
  dateStart: string;
  dateStop:  string;
  totalSpend: number;
  campaigns: CampaignFeedback[];
}

// nameFilter: keyword do nome da campanha (ex: 'MANAUARA') — usado em contas compartilhadas por mais de uma loja
// excludeFilters: keywords que EXCLUEM campanhas (ex: ['CURITIBA','QUIOSQUE'] para pegar "todo o resto")
// since/until: formato 'YYYY-MM-DD'. Se não informado, usa os últimos 7 dias.
export async function getAccountFeedbackData(
  adAccountId: string,
  nameFilter?: string,
  since?: string,
  until?: string,
  excludeFilters?: string[],
): Promise<FeedbackData | null> {
  const insFields = 'spend,reach,clicks,actions,cost_per_action_type,date_start,date_stop';
  const timeRange = since && until
    ? `insights.time_range({"since":"${since}","until":"${until}"}){${insFields}}`
    : `insights.date_preset(last_7d){${insFields}}`;
  const fields = `id,name,objective,effective_status,${timeRange}`;
  const url = `${BASE}/${adAccountId}/campaigns?fields=${encodeURIComponent(fields)}&limit=50&access_token=${TOKEN}`;
  const json = await apiFetch(url);

  let candidates: any[] = json.data ?? [];

  // Em contas compartilhadas por mais de uma loja, filtra apenas campanhas desta loja
  if (nameFilter) {
    const kw = nameFilter.toUpperCase();
    candidates = candidates.filter((c: any) => (c.name ?? '').toUpperCase().includes(kw));
  }
  if (excludeFilters && excludeFilters.length > 0) {
    const kws = excludeFilters.map(k => k.toUpperCase());
    candidates = candidates.filter((c: any) => {
      const n = (c.name ?? '').toUpperCase();
      return !kws.some(kw => n.includes(kw));
    });
  }

  // Apenas campanhas com gasto no período
  const active = candidates.filter(
    (c: any) => parseFloat(c.insights?.data?.[0]?.spend ?? '0') > 0,
  );
  if (active.length === 0) return null;

  const firstIns  = active[0].insights?.data?.[0];
  const dateStart = firstIns?.date_start ?? '';
  const dateStop  = firstIns?.date_stop  ?? '';

  let totalSpend = 0;
  const campaigns: CampaignFeedback[] = [];

  for (const c of active) {
    const ins      = c.insights?.data?.[0];
    const spend    = parseFloat(ins?.spend ?? '0');
    const mensagens = action(ins?.actions, 'onsite_conversion.messaging_conversation_started_7d');
    const nameLower = (c.name ?? '').toLowerCase();

    const visitasPerfil =
      action(ins?.actions, 'visit_instagram_profile') ||
      action(ins?.actions, 'link_click')              ||
      parseInt(ins?.clicks ?? '0', 10);

    totalSpend += spend;

    // Classificação por nome de campanha (prioridade sobre objetivo)
    // Aceita variações como [MSG], [WHATSAPP], [CONTRATAÇÃO WHATSAPP], [IG], [PERFIL], [TRAFEGO]
    const nameHasMensagem = nameLower.includes('msg') || nameLower.includes('whatsapp') || nameLower.includes('message');
    const nameHasPerfil   = nameLower.includes('[ig]') || nameLower.includes('perfil') || nameLower.includes('trafego') || nameLower.includes('tráfego') || nameLower.includes('seguidores');

    const isMensagem = nameHasMensagem || (!nameHasPerfil && mensagens > 0);

    if (isMensagem) {
      campaigns.push({
        tipo: 'mensagem',
        name: c.name,
        spend,
        mensagens,
        custoMensagem: mensagens > 0 ? spend / mensagens : 0,
      });
    } else if (nameHasPerfil || visitasPerfil > 0) {
      campaigns.push({
        tipo: 'seguidores',
        name: c.name,
        spend,
        visitasPerfil,
        custoVisita: visitasPerfil > 0 ? spend / visitasPerfil : 0,
      });
    } else {
      campaigns.push({ tipo: 'outro', name: c.name, spend });
    }
  }

  return { dateStart, dateStop, totalSpend, campaigns };
}
// ─── Saldo / status da conta de anúncios ────────────────────────────────────

export interface AccountBalance {
  name:          string;
  balance:       number;  // saldo disponível (contas pré-pagas), em reais
  amountSpent:   number;  // gasto acumulado no ciclo, em reais
  spendCap:      number;  // teto de gasto (0 = sem teto), em reais
  currency:      string;
  accountStatus: number;  // 1 = ativa, 2 = desabilitada, 3 = não confirmada, 7 = em revisão, 9 = fechada
  disableReason: number;  // 0 = nenhum
}

export async function getAccountBalance(adAccountId: string): Promise<AccountBalance> {
  const fields = 'name,balance,amount_spent,spend_cap,currency,account_status,disable_reason';
  const url = `${BASE}/${adAccountId}?fields=${fields}&access_token=${TOKEN}`;
  const d = await apiFetch(url);

  // A API retorna valores monetários em centavos
  return {
    name:          d.name ?? '',
    balance:       parseFloat(d.balance ?? '0') / 100,
    amountSpent:   parseFloat(d.amount_spent ?? '0') / 100,
    spendCap:      parseFloat(d.spend_cap ?? '0') / 100,
    currency:      d.currency ?? 'BRL',
    accountStatus: parseInt(d.account_status ?? '0', 10),
    disableReason: parseInt(d.disable_reason ?? '0', 10),
  };
}
