// Hub product update-check (v1.10.2) — newest release tags for our own images.
// Public Docker Hub API; no token required. Cached in-process (TTL) to respect rate limits.
// Repos are fixed product images — not a generic SSRF proxy.

const REPOS = {
  dashboard: 'piggyoriginal/hobbithole-dashboard',
  configApi: 'piggyoriginal/hobbithole-config-api',
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const NEG_CACHE_TTL_MS = 5 * 60 * 1000; // failures: don't stampede Hub
const REFRESH_MIN_INTERVAL_MS = 60 * 1000; // ?refresh=1 throttle (auth often off)
const FETCH_TIMEOUT_MS = 8000;
const MAX_PAGES = 5;

/** @type {Map<string, { t: number, data: any, negative?: boolean }>} */
const cache = new Map();
/** Last time a refresh=1 actually bypassed cache (success or fail attempt). */
let lastRefreshAt = 0;

function withTimeout(promiseFactory, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return Promise.resolve()
    .then(() => promiseFactory(controller.signal))
    .finally(() => clearTimeout(timer));
}

function normalizeTag(name) {
  return String(name || '')
    .trim()
    .replace(/^v/i, '');
}

/** Release tags only: 1.10.1 or 1.9.9-build-1 — not latest / *-dev / digests. */
function isReleaseTag(name) {
  const n = normalizeTag(name);
  if (!n || n === 'latest') return false;
  if (/-dev\b/i.test(n)) return false;
  // plain semver or semver-build label
  return /^\d+\.\d+(\.\d+)?(-build-\d+)?$/i.test(n);
}

function compareSemver(a, b) {
  if (!a) return b ? -1 : 0;
  if (!b) return 1;
  const strip = (v) => {
    const s = normalizeTag(v);
    const m = s.match(/^(\d+\.\d+(?:\.\d+)?)(?:-build-(\d+))?$/i);
    if (!m) return { core: [0], build: 0, raw: s };
    return {
      core: m[1].split('.').map((n) => parseInt(n, 10) || 0),
      build: m[2] ? parseInt(m[2], 10) : 0,
      raw: s,
    };
  };
  const pa = strip(a);
  const pb = strip(b);
  const len = Math.max(pa.core.length, pb.core.length);
  for (let i = 0; i < len; i++) {
    const da = pa.core[i] || 0;
    const db = pb.core[i] || 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  if (pa.build !== pb.build) return pa.build < pb.build ? -1 : 1;
  return 0;
}

async function fetchNewestForRepo(repoPath, signal) {
  let newest = null;
  let page = 1;
  let pagesFetched = 0;
  let truncated = false;

  while (page <= MAX_PAGES) {
    const url =
      `https://hub.docker.com/v2/repositories/${repoPath}/tags` +
      `?page_size=100&page=${page}`;
    const res = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`hub_http_${res.status}`);
    }
    const data = await res.json();
    pagesFetched++;
    const results = Array.isArray(data.results) ? data.results : [];
    for (const row of results) {
      const tag = normalizeTag(row && row.name);
      if (!isReleaseTag(tag)) continue;
      if (!newest || compareSemver(tag, newest) > 0) newest = tag;
    }
    if (!data.next) break;
    if (page === MAX_PAGES) {
      // More pages exist but we stop — make it loud in logs + response
      truncated = true;
      console.warn(
        `[hubupdates] ${repoPath}: tag list truncated at MAX_PAGES=${MAX_PAGES} ` +
          `(~${MAX_PAGES * 100} tags); newest so far=${newest}`
      );
      break;
    }
    page++;
  }

  return { newest, pagesFetched, truncated };
}

/**
 * @param {{ refresh?: boolean }} opts
 * @returns {Promise<{
 *   ok: boolean,
 *   checkedAt: string,
 *   cached: boolean,
 *   repos: Record<string, { newest: string|null, path: string, truncated?: boolean }>,
 *   newest: string|null,
 *   skew?: boolean,
 *   truncated?: boolean,
 *   error?: string,
 *   refreshThrottled?: boolean
 * }>}
 */
async function checkUpdates(opts = {}) {
  let refresh = !!(opts && opts.refresh);
  const cacheKey = 'hub-updates';

  if (refresh) {
    const since = Date.now() - lastRefreshAt;
    if (lastRefreshAt && since < REFRESH_MIN_INTERVAL_MS) {
      const hit = cache.get(cacheKey);
      if (hit) {
        return {
          ...hit.data,
          cached: true,
          refreshThrottled: true,
        };
      }
      // No cache yet — fall through but don't mark as refresh bypass spam
      refresh = false;
    } else {
      lastRefreshAt = Date.now();
    }
  }

  if (!refresh) {
    const hit = cache.get(cacheKey);
    if (hit) {
      const ttl = hit.negative ? NEG_CACHE_TTL_MS : CACHE_TTL_MS;
      if (Date.now() - hit.t < ttl) {
        return { ...hit.data, cached: true };
      }
    }
  }

  try {
    const checkedAt = new Date().toISOString();
    const reposOut = {};
    let anyTruncated = false;

    await withTimeout(async (signal) => {
      const results = await Promise.all(
        Object.entries(REPOS).map(async ([key, path]) => {
          const { newest, truncated } = await fetchNewestForRepo(path, signal);
          return [key, { newest, path, truncated: !!truncated }];
        })
      );
      for (const [key, info] of results) {
        reposOut[key] = info;
        if (info.truncated) anyTruncated = true;
      }
    }, FETCH_TIMEOUT_MS * 2);

    let newest = null;
    for (const info of Object.values(reposOut)) {
      if (!info.newest) continue;
      if (!newest || compareSemver(info.newest, newest) > 0) newest = info.newest;
    }
    const dash = reposOut.dashboard && reposOut.dashboard.newest;
    const api = reposOut.configApi && reposOut.configApi.newest;
    const skew = !!(dash && api && dash !== api);

    const data = {
      ok: true,
      checkedAt,
      cached: false,
      repos: reposOut,
      newest,
      skew,
      truncated: anyTruncated,
    };
    cache.set(cacheKey, { t: Date.now(), data, negative: false });
    return data;
  } catch (err) {
    const msg = (err && err.message) || 'hub_unreachable';
    const data = {
      ok: false,
      checkedAt: new Date().toISOString(),
      cached: false,
      repos: {
        dashboard: { newest: null, path: REPOS.dashboard },
        configApi: { newest: null, path: REPOS.configApi },
      },
      newest: null,
      error: msg === 'timeout' || (err && err.name === 'AbortError') ? 'hub_timeout' : 'hub_unreachable',
    };
    // Negative cache: Hub outage → one attempt per NEG_CACHE_TTL, not per visitor click
    cache.set(cacheKey, { t: Date.now(), data, negative: true });
    return data;
  }
}

module.exports = {
  checkUpdates,
  compareSemver,
  isReleaseTag,
  normalizeTag,
  REPOS,
  CACHE_TTL_MS,
  NEG_CACHE_TTL_MS,
  REFRESH_MIN_INTERVAL_MS,
  MAX_PAGES,
};
