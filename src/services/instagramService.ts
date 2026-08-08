const BASE  = 'https://graph.facebook.com/v21.0';
const TOKEN = import.meta.env.VITE_META_ACCESS_TOKEN as string;

export interface InstagramStory {
  id: string;
  mediaUrl?: string;
  timestamp: string;
  impressions: number;
  reach: number;
  replies: number;
  tapsForward: number;
  tapsBack: number;
  exits: number;
  retention: number; // %
}

export interface InstagramSummary {
  username?: string;
  followersCount: number;
  profileViews: number;
  followerVariation: number;
  stories: InstagramStory[];
}

async function apiFetch(url: string) {
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json;
}

async function fetchStories(igId: string): Promise<InstagramStory[]> {
  let list: any;
  try {
    list = await apiFetch(
      `${BASE}/${igId}/stories?fields=id,media_url,timestamp&access_token=${TOKEN}`
    );
    console.log('[INSTAGRAM] lista de stories (bruta):', list);
  } catch (err) {
    console.error('[INSTAGRAM] erro ao listar stories:', err);
    return [];
  }
  const items = list.data ?? [];
  console.log('[INSTAGRAM] quantidade de stories encontrados:', items.length);
  const stories: InstagramStory[] = [];
  for (const item of items) {
    try {
      // Chamada 1: metrics simples, sem breakdown
      const base = await apiFetch(
        `${BASE}/${item.id}/insights?metric=impressions,reach,replies&access_token=${TOKEN}`
      );
      // Chamada 2: navigation, exige breakdown, tem que ir separada
      const nav = await apiFetch(
        `${BASE}/${item.id}/insights?metric=navigation&breakdown=story_navigation_action_type&access_token=${TOKEN}`
      );
      console.log('[INSTAGRAM] insight bruto do story', item.id, { base, nav }); // TEMP: confirmar shape do breakdown, remover depois

      const get = (name: string) => base.data?.find((m: any) => m.name === name)?.values?.[0]?.value ?? 0;
      const impressions = get('impressions');

      const navMetric = nav.data?.find((m: any) => m.name === 'navigation');
      const navResults = navMetric?.total_value?.breakdowns?.[0]?.results ?? [];
      const navValue = (type: string) =>
        navResults.find((r: any) => r.dimension_values?.[0] === type)?.value ?? 0;

      const tapsForward = navValue('TAP_FORWARD');
      const tapsBack     = navValue('TAP_BACK');
      const exits        = navValue('TAP_EXIT');
      const retention     = impressions > 0 ? ((impressions - exits) / impressions) * 100 : 0;

      stories.push({
        id: item.id,
        mediaUrl: item.media_url,
        timestamp: item.timestamp,
        impressions,
        reach: get('reach'),
        replies: get('replies'),
        tapsForward,
        tapsBack,
        exits,
        retention,
      });
    } catch (err) {
      console.error('[INSTAGRAM] erro no insight de um story:', err);
    }
  }
  return stories;
}

export async function getInstagramSummary(
  igId: string,
  since: string,
  until: string,
): Promise<InstagramSummary> {
  const profile = await apiFetch(
    `${BASE}/${igId}?fields=username,followers_count&access_token=${TOKEN}`
  );

  let profileViews = 0;
  let followerVariation = 0;

  try {
    const viewsRes = await apiFetch(
      `${BASE}/${igId}/insights?metric=profile_views&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${TOKEN}`
    );
    profileViews = viewsRes.data?.[0]?.total_value?.value ?? 0;
  } catch (err) {
    console.error('[INSTAGRAM] erro em profile_views:', err);
  }

  try {
    const followersRes = await apiFetch(
      `${BASE}/${igId}/insights?metric=follower_count&period=day&since=${since}&until=${until}&access_token=${TOKEN}`
    );
    const values = followersRes.data?.[0]?.values ?? [];
    followerVariation = values.reduce((sum: number, v: any) => sum + (v.value ?? 0), 0);
  } catch (err) {
    console.error('[INSTAGRAM] erro em follower_count:', err);
  }

  const stories = await fetchStories(igId);

  return {
    username: profile.username,
    followersCount: parseInt(profile.followers_count ?? '0', 10),
    profileViews,
    followerVariation,
    stories,
  };
}
