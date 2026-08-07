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

function firstValue(list: { action_type: string; value: string }[] | undefined): number {
  return parseFloat(list?.[0]?.value ?? '0');
}

function actionsContaining(actions: { action_type: string; value: string }[] | undefined, substr: string): number {
  return (actions ?? [])
    .filter(a => a.action_type.toLowerCase().includes(substr))
    .reduce((sum, a) => sum + parseFloat(a.value ?? '0'), 0);
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
  tipo: 'mensagem' | 'seguidores' | 'live' | 'engajamento' | 'leads' | 'outro';
  name: string;
  spend: number;
  mensagens?: number;
  custoMensagem?: number;
  visitasPerfil?: number;
  custoVisita?: number;
  thruPlays?: number;
  custoThruPlay?: number;
  engajamentos?: number;
  custoEngajamento?: number;
  leads?: number;
  custoLead?: number;
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
  const insFields = 'spend,reach,clicks,actions,cost_per_action_type,video_thruplay_watched_actions,date_start,date_stop';
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

    const thruPlays    = firstValue(ins?.video_thruplay_watched_actions);
    const engajamentos = action(ins?.actions, 'post_engagement');
    const leads        = actionsContaining(ins?.actions, 'lead');

    const visitasPerfil =
      action(ins?.actions, 'visit_instagram_profile') ||
      action(ins?.actions, 'link_click')              ||
      parseInt(ins?.clicks ?? '0', 10);

    totalSpend += spend;

    // Classificação por nome de campanha (prioridade sobre objetivo)
    const nameHasLive     = nameLower.includes('live');
    const nameHasLeads    = nameLower.includes('[leads]') || nameLower.includes('[site]');
    const nameHasEngaj    = nameLower.includes('[post]') || nameLower.includes('[eng]')
                         || nameLower.includes('engagement');
    const nameHasMensagem = nameLower.includes('msg') || nameLower.includes('whatsapp') || nameLower.includes('message');
    const nameHasPerfil   = nameLower.includes('[ig]') || nameLower.includes('perfil') || nameLower.includes('trafego') || nameLower.includes('tráfego') || nameLower.includes('seguidores');

    if (nameHasLive) {
      campaigns.push({
        tipo: 'live',
        name: c.name,
        spend,
        thruPlays,
        custoThruPlay: thruPlays > 0 ? spend / thruPlays : 0,
      });
    } else if (nameHasLeads) {
      campaigns.push({
        tipo: 'leads',
        name: c.name,
        spend,
        leads,
        custoLead: leads > 0 ? spend / leads : 0,
      });
    } else if (nameHasEngaj) {
      campaigns.push({
        tipo: 'engajamento',
        name: c.name,
        spend,
        engajamentos,
        custoEngajamento: engajamentos > 0 ? spend / engajamentos : 0,
      });
    } else if (nameHasMensagem || (!nameHasPerfil && mensagens > 0)) {
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

// Diagnóstico temporário: retorna os campos crus da conta para identificar
// onde cada tipo de conta (pré-paga, fundos, cartão) guarda o saldo.
export async function debugAccountFunding(adAccountId: string): Promise<any> {
  const fields = [
    'name','balance','amount_spent','spend_cap','currency','account_status',
    'funding_source','funding_source_details','is_prepay_account',
  ].join(',');
  const url = `${BASE}/${adAccountId}?fields=${fields}&access_token=${TOKEN}`;
  return apiFetch(url);
}

// ─── Relatório individual por loja (Reportei Reuniões) ──────────────────────

export interface AdHighlight {
  id: string;
  name: string;
  thumbnailUrl?: string;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  mensagens: number;
}

export interface ReportCampaign {
  id: string;
  name: string;
  tipo: 'mensagem' | 'seguidores' | 'live' | 'engajamento' | 'leads' | 'outro';
  spend: number;
  reach: number;
  impressions: number;
  mensagens?: number;
  custoMensagem?: number;
  visitasPerfil?: number;
  custoVisita?: number;
  thruPlays?: number;
  custoThruPlay?: number;
  engajamentos?: number;
  custoEngajamento?: number;
  leads?: number;
  custoLead?: number;
  topAds?: AdHighlight[];
}

export interface StoreReport {
  totalSpend: number;
  totalReach: number;
  totalImpressions: number;
  totalMensagens: number;
  campaigns: ReportCampaign[];
}

async function fetchTopAds(campaignId: string, since?: string, until?: string): Promise<AdHighlight[]> {
  const insFields = 'spend,reach,impressions,clicks,actions';
  const timeRange = since && until
    ? `insights.time_range({"since":"${since}","until":"${until}"}){${insFields}}`
    : `insights.date_preset(last_7d){${insFields}}`;
  const fields = `id,name,creative{thumbnail_url},${timeRange}`;
  const url = `${BASE}/${campaignId}/ads?fields=${encodeURIComponent(fields)}&limit=50&access_token=${TOKEN}`;

  let json: any;
  try {
    json = await apiFetch(url);
  } catch {
    return []; // não deixa o relatório inteiro cair por causa de um erro nos anúncios
  }

  const ads: AdHighlight[] = (json.data ?? []).map((a: any) => {
    const ins = a.insights?.data?.[0];
    return {
      id: a.id,
      name: a.name,
      thumbnailUrl: a.creative?.thumbnail_url,
      spend: parseFloat(ins?.spend ?? '0'),
      reach: parseInt(ins?.reach ?? '0', 10),
      impressions: parseInt(ins?.impressions ?? '0', 10),
      clicks: parseInt(ins?.clicks ?? '0', 10),
      mensagens: action(ins?.actions, 'onsite_conversion.messaging_conversation_started_7d'),
    };
  });

  const withSpend = ads.filter(a => a.spend > 0);
  withSpend.sort((a, b) => (b.mensagens - a.mensagens) || (b.spend - a.spend));
  return withSpend.slice(0, 3);
}

export async function getStoreReport(
  adAccountId: string,
  nameFilter?: string,
  since?: string,
  until?: string,
  excludeFilters?: string[],
): Promise<StoreReport> {
  const insFields = 'spend,reach,impressions,clicks,actions,cost_per_action_type,video_thruplay_watched_actions,date_start,date_stop';
  const timeRange = since && until
    ? `insights.time_range({"since":"${since}","until":"${until}"}){${insFields}}`
    : `insights.date_preset(last_7d){${insFields}}`;
  const fields = `id,name,objective,effective_status,${timeRange}`;
  const url = `${BASE}/${adAccountId}/campaigns?fields=${encodeURIComponent(fields)}&limit=50&access_token=${TOKEN}`;
  const json = await apiFetch(url);

  let candidates: any[] = json.data ?? [];

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

  // Campanhas com veiculação no período (mesmo padrão do feedback de sexta)
  const active = candidates.filter(
    (c: any) => parseFloat(c.insights?.data?.[0]?.spend ?? '0') > 0,
  );

  let totalSpend = 0, totalReach = 0, totalImpressions = 0, totalMensagens = 0;
  const campaigns: ReportCampaign[] = [];

  for (const c of active) {
    const ins          = c.insights?.data?.[0];
    const spend        = parseFloat(ins?.spend ?? '0');
    const reach        = parseInt(ins?.reach ?? '0', 10);
    const impressions  = parseInt(ins?.impressions ?? '0', 10);
    const mensagens    = action(ins?.actions, 'onsite_conversion.messaging_conversation_started_7d');
    const nameLower    = (c.name ?? '').toLowerCase();

    const thruPlays    = firstValue(ins?.video_thruplay_watched_actions);
    const engajamentos = action(ins?.actions, 'post_engagement');
    const leads        = actionsContaining(ins?.actions, 'lead');
    const visitasPerfil =
      action(ins?.actions, 'visit_instagram_profile') ||
      action(ins?.actions, 'link_click')              ||
      parseInt(ins?.clicks ?? '0', 10);

    totalSpend       += spend;
    totalReach        += reach;
    totalImpressions  += impressions;
    totalMensagens    += mensagens;

    const topAds = await fetchTopAds(c.id, since, until);

    const nameHasLive     = nameLower.includes('live');
    const nameHasLeads    = nameLower.includes('[leads]') || nameLower.includes('[site]');
    const nameHasEngaj    = nameLower.includes('[post]') || nameLower.includes('[eng]') || nameLower.includes('engagement');
    const nameHasMensagem = nameLower.includes('msg') || nameLower.includes('whatsapp') || nameLower.includes('message');
    const nameHasPerfil   = nameLower.includes('[ig]') || nameLower.includes('perfil') || nameLower.includes('trafego') || nameLower.includes('tráfego') || nameLower.includes('seguidores');

    const base = { id: c.id, name: c.name, spend, reach, impressions, topAds };

    if (nameHasLive) {
      campaigns.push({ ...base, tipo: 'live', thruPlays, custoThruPlay: thruPlays > 0 ? spend / thruPlays : 0 });
    } else if (nameHasLeads) {
      campaigns.push({ ...base, tipo: 'leads', leads, custoLead: leads > 0 ? spend / leads : 0 });
    } else if (nameHasEngaj) {
      campaigns.push({ ...base, tipo: 'engajamento', engajamentos, custoEngajamento: engajamentos > 0 ? spend / engajamentos : 0 });
    } else if (nameHasMensagem || (!nameHasPerfil && mensagens > 0)) {
      campaigns.push({ ...base, tipo: 'mensagem', mensagens, custoMensagem: mensagens > 0 ? spend / mensagens : 0 });
    } else if (nameHasPerfil || visitasPerfil > 0) {
      campaigns.push({ ...base, tipo: 'seguidores', visitasPerfil, custoVisita: visitasPerfil > 0 ? spend / visitasPerfil : 0 });
    } else {
      campaigns.push({ ...base, tipo: 'outro' });
    }
  }

  return { totalSpend, totalReach, totalImpressions, totalMensagens, campaigns };
}
