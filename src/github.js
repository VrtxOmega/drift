// ══════════════════════════════════════════════════════════════════
// DRIFT — GitHub API Client v4 (GraphQL)
// Single-call user+repos. Batched commit fetch. Zero REST chatter.
// Token injected at build time via VITE_GITHUB_PAT env var.
// ══════════════════════════════════════════════════════════════════

const GQL  = 'https://api.github.com/graphql';

const HEADERS = {
  'Content-Type': 'application/json',
  'Accept':       'application/vnd.github+json',
  'Authorization': `bearer ${import.meta.env.VITE_GITHUB_PAT || ''}`,
  'X-GitHub-Api-Version': '2022-11-28'
};

/* ── localStorage ETag cache keys ── */
const etagKey = (u) => `drift_etag_${btoa(u)}`;
const bodyKey = (u) => `drift_body_${btoa(u)}`;

async function gqlFetch(query, variables = {}) {
  const url = GQL;
  const storedEtag = localStorage.getItem(etagKey(url));
  const storedBody = storedEtag ? localStorage.getItem(bodyKey(url)) : null;

  const opts = {
    method: 'POST',
    headers: { ...HEADERS },
    body: JSON.stringify({ query, variables })
  };
  if (storedEtag) opts.headers['If-None-Match'] = storedEtag;

  const res = await fetch(url, opts);

  if (res.status === 304 && storedBody) {
    return JSON.parse(storedBody);
  }

  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('X-RateLimit-Reset');
    const wait = reset ? Math.ceil((parseInt(reset) * 1000 - Date.now()) / 1000) : 60;
    throw new Error(`RATE_LIMITED: retry in ${wait}s`);
  }
  if (!res.ok) throw new Error(`HTTP_${res.status}`);

  const etag = res.headers.get('ETag');
  const json = await res.json();
  if (etag) {
    try {
      localStorage.setItem(etagKey(url), etag);
      localStorage.setItem(bodyKey(url), JSON.stringify(json));
    } catch { purgeCache(); }
  }
  return json;
}

function purgeCache() {
  Object.keys(localStorage).filter(k => k.startsWith('drift_')).forEach(k => localStorage.removeItem(k));
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════════════════════════════ */

export async function fetchUser(username) {
  const q = `
    query($login: String!) {
      user(login: $login) {
        login
        avatarUrl
        name
        bio
        followers { totalCount }
        following { totalCount }
      }
    }
  `;
  const data = await gqlFetch(q, { login: username });
  const u = data?.data?.user;
  if (!u) throw new Error('USER_NOT_FOUND');
  return {
    login:      u.login,
    avatar_url: u.avatarUrl,
    name:       u.name,
    bio:        u.bio,
    followers:  u.followers?.totalCount,
    following:  u.following?.totalCount
  };
}

export async function fetchRepos(username, onProgress) {
  if (onProgress) onProgress('Fetching repositories...');

  const allRepos = [];
  let cursor = null;
  const perPage = 30;

  while (allRepos.length < 60) {
    const q = `
      query($login: String!, $first: Int!, $after: String) {
        user(login: $login) {
          repositories(first: $first, after: $after, ownerAffiliations: OWNER, orderBy: {field: PUSHED_AT, direction: DESC}) {
            pageInfo { hasNextPage endCursor }
            nodes {
              name
              description
              stargazerCount
              forkCount
              isFork
              diskUsage
              pushedAt
              primaryLanguage { name }
              languages(first: 6) { nodes { name } }
              defaultBranchRef {
                target {
                  ... on Commit {
                    history(first: 100) {
                      totalCount
                      nodes { oid committedDate message author { name } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const data = await gqlFetch(q, { login: username, first: perPage, after: cursor });
    const repos = data?.data?.user?.repositories;
    if (!repos) break;

    for (const r of repos.nodes) {
      if (!r.isFork && r.diskUsage > 0) {
        const rawNodes = r.defaultBranchRef?.target?.history?.nodes || [];
        const commits = rawNodes.map(node => ({
          sha: node.oid,
          commit: {
            message: node.message,
            author: {
              date: node.committedDate,
              name: node.author?.name || ''
            }
          }
        }));

        allRepos.push({
          name:         r.name,
          description:  r.description,
          stargazers_count: r.stargazerCount,
          forkCount:    r.forkCount,
          size:         r.diskUsage,
          pushedAt:     r.pushedAt,
          html_url:     `https://github.com/${username}/${r.name}`,
          language:     r.primaryLanguage?.name || null,
          languages:    r.languages?.nodes.map(l => l.name) || [],
          commits,
          totalCommits: r.defaultBranchRef?.target?.history?.totalCount || 0
        });
      }
    }

    if (!repos.pageInfo.hasNextPage) break;
    cursor = repos.pageInfo.endCursor;
    if (allRepos.length >= 60) break;
  }

  return allRepos
    .sort((a, b) => (b.stargazers_count + b.size) - (a.stargazers_count + a.size))
    .slice(0, 60);
}

export async function fetchCommits(owner, repo) {
  return [];
}

export async function fetchAllCommits(username, repos, onProgress) {
  const commitMap = new Map();
  let i = 0;
  for (const r of repos) {
    if (onProgress) {
      const pct = Math.round((i / repos.length) * 100);
      onProgress(`Scanning commits... ${pct}% (${i}/${repos.length} repos)`);
    }
    if (r.commits && r.commits.length) {
      commitMap.set(r.name, r.commits);
    }
    i++;
  }
  return commitMap;
}

export function computeStats(repos, commitMap) {
  let totalCommits = 0;
  const languageCounts = {};
  const dailyCommits = {};

  for (const [, commits] of commitMap) {
    totalCommits += commits.length;
    for (const c of commits) {
      const date = c.commit?.author?.date?.slice(0, 10);
      if (date) dailyCommits[date] = (dailyCommits[date] || 0) + 1;
    }
  }

  for (const r of repos) {
    if (r.language) {
      languageCounts[r.language] = (languageCounts[r.language] || 0) + r.size;
    }
  }

  const todayStr     = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const sortedDesc   = Object.keys(dailyCommits).sort().reverse();

  let streak = 0;
  if (sortedDesc.length > 0) {
    const anchor = sortedDesc[0] === todayStr ? todayStr
                 : sortedDesc[0] === yesterdayStr ? yesterdayStr
                 : null;
    if (anchor) {
      let cursor = new Date(anchor);
      for (const d of sortedDesc) {
        if (d === cursor.toISOString().slice(0, 10)) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        } else { break; }
      }
    }
  }

  let maxStreak = 0, cur = 0;
  const allDates = Object.keys(dailyCommits).sort();
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) { cur = 1; }
    else {
      const prev = new Date(allDates[i - 1]);
      const curr = new Date(allDates[i]);
      const gap  = Math.floor((curr - prev) / 86400000);
      cur = gap === 1 ? cur + 1 : 1;
    }
    maxStreak = Math.max(maxStreak, cur);
  }

  const topLang = Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0];
  const totalSize = Object.values(languageCounts).reduce((a, b) => a + b, 0) || 1;
  const languages = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, size]) => ({ name, pct: Math.round((size / totalSize) * 100) }));

  return {
    totalCommits,
    totalRepos: repos.length,
    streak,
    maxStreak,
    topLanguage:    topLang ? topLang[0] : 'Unknown',
    topLanguagePct: topLang ? Math.round((topLang[1] / totalSize) * 100) : 0,
    languages,
    dailyCommits,
    activeDays: Object.keys(dailyCommits).length
  };
}
