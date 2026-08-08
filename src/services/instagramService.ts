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
      const ins = await apiFetch(
        `${BASE}/${item.id}/insights?metric=impressions,reach,replies,taps_forward,taps_back,exits&access_token=${TOKEN}`
      );
      const get = (name: string) => ins.data?.find((m: any) => m.name === name)?.values?.[0]?.value ?? 0;
      const impressions = get('impressions');
      const exits       = get('exits');
      const retention    = impressions > 0 ? ((impressions - exits) / impressions) * 100 : 0;

      stories.push({
        id: item.id,
        mediaUrl: item.media_url,
        timestamp: item.timestamp,
        impressions,
        reach: get('reach'),
        replies: get('replies'),
        tapsForward: get('taps_forward'),
        tapsBack: get('taps_back'),
        exits,
        retention,
      });
    } catch (err) {
      console.error('[INSTAGRAM] erro no insight de um story:', err);
    }
  }

  return stories;
}
