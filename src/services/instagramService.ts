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

  let profileViews = 0;
  let followerVariation = 0;

  try {
    const insights = await apiFetch(
      `${BASE}/${igId}/insights?metric=profile_views,follower_count&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${TOKEN}`
    );
    for (const item of insights.data ?? []) {
      const total = item.total_value?.value ?? 0;
      if (item.name === 'profile_views')  profileViews = total;
      if (item.name === 'follower_count') followerVariation = total;
    }
  } catch {
    // Segue sem esses dois campos se a API rejeitar — parâmetros do Instagram Insights
    // mudam com frequência; melhor mostrar o que der certo do que quebrar tudo.
  }

  return {
    username: profile.username,
    followersCount: parseInt(profile.followers_count ?? '0', 10),
    profileViews,
    followerVariation,
  };
}
