/** Live GitHub telemetry — public REST API, no auth, cached in localStorage
 *  (6h TTL) so the 60 req/hr anonymous limit never bites. Everything is
 *  best-effort: failures return null and the UI shows graceful fallbacks. */

const TTL = 6 * 60 * 60 * 1000;

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T | null> {
  const k = `gh:${key}`;
  try {
    const hit = localStorage.getItem(k);
    if (hit) {
      const { t, data } = JSON.parse(hit);
      if (Date.now() - t < TTL) return data as T;
    }
  } catch {
    /* storage unavailable — fall through to network */
  }
  try {
    const data = await fetcher();
    try {
      localStorage.setItem(k, JSON.stringify({ t: Date.now(), data }));
    } catch {
      /* quota — fine */
    }
    return data;
  } catch {
    return null;
  }
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json() as Promise<T>;
}

export type RepoStats = {
  stars: number;
  forks: number;
  language: string | null;
  pushedAt: string;
  openIssues: number;
};

export function repoStats(fullName: string): Promise<RepoStats | null> {
  return cached(`repo:${fullName}`, async () => {
    const r = await gh<{
      stargazers_count: number;
      forks_count: number;
      language: string | null;
      pushed_at: string;
      open_issues_count: number;
    }>(`/repos/${fullName}`);
    return {
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language,
      pushedAt: r.pushed_at,
      openIssues: r.open_issues_count,
    };
  });
}

export type SeasonStats = {
  publicRepos: number;
  followers: number;
  topLanguages: { lang: string; count: number }[];
  memberSince: number;
};

export function seasonStats(user: string): Promise<SeasonStats | null> {
  return cached(`season:${user}`, async () => {
    const [profile, repos] = await Promise.all([
      gh<{ public_repos: number; followers: number; created_at: string }>(`/users/${user}`),
      gh<{ language: string | null; fork: boolean }[]>(`/users/${user}/repos?per_page=100`),
    ]);
    const counts = new Map<string, number>();
    for (const r of repos) {
      if (r.fork || !r.language) continue;
      counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
    }
    const topLanguages = [...counts.entries()]
      .map(([lang, count]) => ({ lang, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    return {
      publicRepos: profile.public_repos,
      followers: profile.followers,
      topLanguages,
      memberSince: new Date(profile.created_at).getFullYear(),
    };
  });
}
