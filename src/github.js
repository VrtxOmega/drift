// ══════════════════════════════════════════════════════
// DRIFT — GitHub API Client
// Fetches repos, commits, contribution data.
// All public endpoints, no auth required.
// ══════════════════════════════════════════════════════

const API = 'https://api.github.com';
const PER_PAGE = 100;
const MAX_REPOS = 60;
const MAX_COMMITS_PER_REPO = 200;

/**
 * Fetch a GitHub API endpoint with error handling.
 * @param {string} url
 * @returns {Promise<any>}
 */
async function ghFetch(url) {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/vnd.github+json' }
  });
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('X-RateLimit-Reset');
    const wait = reset ? Math.ceil((parseInt(reset) * 1000 - Date.now()) / 1000) : 60;
    throw new Error(`RATE_LIMITED: retry in ${wait}s`);
  }
  if (res.status === 404) throw new Error('USER_NOT_FOUND');
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  return res.json();
}

/**
 * Fetch all pages of a paginated endpoint.
 * @param {string} url - Base URL (without page param)
 * @param {number} maxItems
 * @returns {Promise<any[]>}
 */
async function ghFetchAll(url, maxItems = PER_PAGE) {
  const items = [];
  let page = 1;
  const sep = url.includes('?') ? '&' : '?';
  while (items.length < maxItems) {
    const data = await ghFetch(`${url}${sep}per_page=${PER_PAGE}&page=${page}`);
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
  return ghFetch(`${API}/users/${username}`);
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
    `${API}/users/${username}/repos?type=owner&sort=pushed`,
    MAX_REPOS
  );
  // Filter out forks and empty repos
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
      `${API}/repos/${owner}/${repo}/commits?since=${since.toISOString()}`,
      MAX_COMMITS_PER_REPO
    );
  } catch {
    return []; // Empty repos, permission issues
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
  // Process in batches of 4 to be respectful of rate limits
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

  // ── Current streak ──
  // Walk back from today (or yesterday if no commit today yet).
  // Each step must be exactly the previous calendar day — no skips allowed.
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const sortedDesc = Object.keys(dailyCommits).sort().reverse();

  let streak = 0;
  if (sortedDesc.length > 0) {
    // Streak is alive if the most recent commit was today or yesterday
    const anchor = sortedDesc[0] === todayStr ? todayStr
                 : sortedDesc[0] === yesterdayStr ? yesterdayStr
                 : null;

    if (anchor) {
      let cursor = new Date(anchor);
      for (const d of sortedDesc) {
        if (d === cursor.toISOString().slice(0, 10)) {
          streak++;
          cursor.setDate(cursor.getDate() - 1); // step back one day
        } else {
          break; // gap in streak — stop
        }
      }
    }
  }

  // ── Max streak (longest consecutive run in history) ──
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
      cur = gap === 1 ? cur + 1 : 1; // strictly consecutive days only
    }
    maxStreak = Math.max(maxStreak, cur);
  }

  // Top language
  const topLang = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])[0];

  // Language percentages
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
