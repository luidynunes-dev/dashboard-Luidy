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

  // profile_views aceita metric_type=total_value
  try {
    const viewsRes = await apiFetch(
      `${BASE}/${igId}/insights?metric=profile_views&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${TOKEN}`
    );
    console.log('[INSTAGRAM] profile_views:', viewsRes);
    profileViews = viewsRes.data?.[0]?.total_value?.value ?? 0;
  } catch (err) {
    console.error('[INSTAGRAM] erro em profile_views:', err);
  }

  // follower_count NÃO aceita metric_type=total_value — vem como série diária, soma-se os valores
  try {
    const followersRes = await apiFetch(
      `${BASE}/${igId}/insights?metric=follower_count&period=day&since=${since}&until=${until}&access_token=${TOKEN}`
    );
    console.log('[INSTAGRAM] follower_count:', followersRes);
    const values = followersRes.data?.[0]?.values ?? [];
    followerVariation = values.reduce((sum: number, v: any) => sum + (v.value ?? 0), 0);
  } catch (err) {
    console.error('[INSTAGRAM] erro em follower_count:', err);
  }

  return {
    username: profile.username,
    followersCount: parseInt(profile.followers_count ?? '0', 10),
    profileViews,
    followerVariation,
  };
}
