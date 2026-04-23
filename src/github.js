// ══════════════════════════════════════════════════════
// DRIFT — GitHub API Client v3
// Proxied through Cloudflare Worker. No secrets here.
// Worker handles PAT + caching server-side.
// ══════════════════════════════════════════════════════

// ── Replace with YOUR worker deploy URL ──
const API = 'https://drift-proxy.vrtxomega.workers.dev';

const PER_PAGE = 100;
const MAX_REPOS = 60;
const MAX_COMMITS_PER_REPO = 200;

const API_HEADERS = {
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
};

/**
 * Fetch through the DRIFT proxy.
 * Handles CORS, PAT, and rate-limit headers transparently.
 * @param {string} url — path + query (e.g. `/users/VrtxOmega`)
 * @returns {Promise<any>}
 */
async function ghFetch(endpoint) {
  const url = API + endpoint;
  const res = await fetch(url, { headers: API_HEADERS });

  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('X-RateLimit-Remaining');
    const reset = res.headers.get('X-RateLimit-Reset');
    const wait = reset ? Math.ceil((parseInt(reset) * 1000 - Date.now()) / 1000) : 60;
    throw new Error(`RATE_LIMITED: retry in ${wait}s (remaining: ${remaining || '0'})`);
  }
  if (res.status === 404) throw new Error('USER_NOT_FOUND');
  if (!res.ok) throw new Error(`HTTP_${res.status}`);

  return res.json();
}

/**
 * Fetch all pages of a paginated endpoint.
 * @param {string} endpoint — path without page param
 * @param {number} maxItems
 * @returns {Promise<any[]>}
 */
async function ghFetchAll(endpoint, maxItems = PER_PAGE) {
  const items = [];
  let page = 1;
  const sep = endpoint.includes('?') ? '&' : '?';
  while (items.length < maxItems) {
    const data = await ghFetch(`${endpoint}${sep}per_page=${PER_PAGE}&page=${page}`);
    if (!data.length) break;
    items.push(...data);
    if (data.length < PER_PAGE) break;
    page++;
  }
  return items.slice(0, maxItems);
}

/**
 * Fetch user profile.
 * @param {string} username
 * @returns {Promise<object>}
 */
export async function fetchUser(username) {
  return ghFetch(`/users/${username}`);
}

/**
 * Fetch user's public repositories (non-fork, sorted by push date).
 * @param {string} username
 * @param {function} onProgress
 * @returns {Promise<object[]>}
 */
export async function fetchRepos(username, onProgress) {
  if (onProgress) onProgress('Fetching repositories...');
  const repos = await ghFetchAll(
    `/users/${username}/repos?type=owner&sort=pushed`,
    MAX_REPOS
  );
  return repos
    .filter(r => !r.fork && r.size > 0)
    .sort((a, b) => (b.stargazers_count + b.size) - (a.stargazers_count + a.size));
}

/**
 * Fetch recent commits for a single repo.
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<object[]>}
 */
export async function fetchCommits(owner, repo) {
  try {
    const since = new Date();
    since.setFullYear(since.getFullYear() - 1);
    return await ghFetchAll(
      `/repos/${owner}/${repo}/commits?since=${since.toISOString()}`,
      MAX_COMMITS_PER_REPO
    );
  } catch {
    return [];
  }
}

/**
 * Fetch all commit data for all repos, with progress callback.
 * @param {string} username
 * @param {object[]} repos
 * @param {function} onProgress
 * @returns {Promise<Map<string, object[]>>}
 */
export async function fetchAllCommits(username, repos, onProgress) {
  const commitMap = new Map();
  const batchSize = 4;
  for (let i = 0; i < repos.length; i += batchSize) {
    const batch = repos.slice(i, i + batchSize);
    if (onProgress) {
      const pct = Math.round((i / repos.length) * 100);
      onProgress(`Scanning commits... ${pct}% (${i}/${repos.length} repos)`);
    }
    const results = await Promise.all(
      batch.map(r => fetchCommits(username, r.name))
    );
    batch.forEach((r, j) => {
      if (results[j].length > 0) {
        commitMap.set(r.name, results[j]);
      }
    });
  }
  return commitMap;
}

/**
 * Compute user stats from repo + commit data.
 * @param {object[]} repos
 * @param {Map<string, object[]>} commitMap
 * @returns {object}
 */
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

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const sortedDesc = Object.keys(dailyCommits).sort().reverse();

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
        } else {
          break;
        }
      }
    }
  }

  let maxStreak = 0;
  let cur = 0;
  const allDates = Object.keys(dailyCommits).sort();
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) {
      cur = 1;
    } else {
      const prev = new Date(allDates[i - 1]);
      const curr = new Date(allDates[i]);
      const gap = Math.floor((curr - prev) / 86400000);
      cur = gap === 1 ? cur + 1 : 1;
    }
    maxStreak = Math.max(maxStreak, cur);
  }

  const topLang = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])[0];

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
    topLanguage: topLang ? topLang[0] : 'Unknown',
    topLanguagePct: topLang ? Math.round((topLang[1] / totalSize) * 100) : 0,
    languages,
    dailyCommits,
    activeDays: Object.keys(dailyCommits).length
  };
}
