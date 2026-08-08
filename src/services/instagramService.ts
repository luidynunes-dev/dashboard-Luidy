const BASE  = 'https://graph.facebook.com/v21.0';
const TOKEN = import.meta.env.VITE_META_ACCESS_TOKEN as string;

export interface InstagramSummary {
  username?: string;
  followersCount: number;
  profileViews: number;
  followerVariation: number;
}

async function apiFetch(url: string) {
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json;
}

export async function getInstagramSummary(
  igId: string,
  since: string,
  until: string,
): Promise<InstagramSummary> {
  const profile = await apiFetch(
    `${BASE}/${igId}?fields=username,followers_count&access_token=${TOKEN}`
  );
  console.log('[INSTAGRAM] perfil:', profile);

  let profileViews = 0;
  let followerVariation = 0;

  try {
    const insights = await apiFetch(
      `${BASE}/${igId}/insights?metric=profile_views,follower_count&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${TOKEN}`
    );
    console.log('[INSTAGRAM] insights:', insights);
    for (const item of insights.data ?? []) {
      const total = item.total_value?.value ?? 0;
      if (item.name === 'profile_views')  profileViews = total;
      if (item.name === 'follower_count') followerVariation = total;
    }
  } catch (err) {
    console.error('[INSTAGRAM] erro nos insights:', err);
  }

  return {
    username: profile.username,
    followersCount: parseInt(profile.followers_count ?? '0', 10),
    profileViews,
    followerVariation,
  };
}
