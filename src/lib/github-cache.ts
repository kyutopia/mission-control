/**
 * GitHub API Cache Layer
 * - In-memory TTL cache to reduce API calls
 * - Rate limit awareness (403/429 → serve stale)
 * - Token validation
 * - Graceful error fallback
 */

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 60_000; // 1 minute
const STALE_TTL_MS = 300_000; // 5 minutes (serve stale on error)

let rateLimitRemaining = 5000;
let rateLimitReset = 0;
let lastError: { message: string; at: string } | null = null;

export function getCacheStats() {
  return {
    entries: cache.size,
    rateLimitRemaining,
    rateLimitReset: rateLimitReset > 0 ? new Date(rateLimitReset * 1000).toISOString() : null,
    lastError,
  };
}

function getCached<T>(key: string): { data: T; stale: boolean } | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  const now = Date.now();
  if (now < entry.expiresAt) return { data: entry.data, stale: false };
  if (now < entry.fetchedAt + STALE_TTL_MS) return { data: entry.data, stale: true };
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS) {
  cache.set(key, { data, fetchedAt: Date.now(), expiresAt: Date.now() + ttlMs });
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_ORG = 'kyutopia';
const GITHUB_REPO = 'kyutopia-ops';

const PIPELINE_REPO = 'business-discovery';
export { GITHUB_ORG, GITHUB_REPO, PIPELINE_REPO };

export async function githubGraphQL(query: string, variables: Record<string, unknown> = {}) {
  if (!GITHUB_TOKEN) {
    throw new GitHubError('GITHUB_TOKEN not configured', 0);
  }

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  // Track rate limits
  const remaining = res.headers.get('x-ratelimit-remaining');
  const reset = res.headers.get('x-ratelimit-reset');
  if (remaining) rateLimitRemaining = parseInt(remaining);
  if (reset) rateLimitReset = parseInt(reset);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    lastError = { message: `GraphQL ${res.status}: ${text.slice(0, 200)}`, at: new Date().toISOString() };

    if (res.status === 401) throw new GitHubError('Token expired or invalid', 401);
    if (res.status === 403 || res.status === 429) throw new GitHubError('Rate limited', res.status);
    throw new GitHubError(`GitHub API error: ${res.status}`, res.status);
  }

  const json = await res.json();
  if (json.errors) {
    lastError = { message: json.errors[0]?.message || 'GraphQL error', at: new Date().toISOString() };
    console.error('[github] GraphQL errors:', JSON.stringify(json.errors));
  }

  return json;
}

export async function githubREST(path: string) {
  if (!GITHUB_TOKEN) throw new GitHubError('GITHUB_TOKEN not configured', 0);

  const res = await fetch(`https://api.github.com${path}`, {
    headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` },
    cache: 'no-store',
  });

  const remaining = res.headers.get('x-ratelimit-remaining');
  const reset = res.headers.get('x-ratelimit-reset');
  if (remaining) rateLimitRemaining = parseInt(remaining);
  if (reset) rateLimitReset = parseInt(reset);

  if (!res.ok) {
    lastError = { message: `REST ${res.status} ${path}`, at: new Date().toISOString() };
    if (res.status === 403 || res.status === 429) throw new GitHubError('Rate limited', res.status);
    throw new GitHubError(`GitHub REST error: ${res.status}`, res.status);
  }

  return res.json();
}

export class GitHubError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'GitHubError';
  }
}

/**
 * Cached fetch wrapper — returns cached data on error (stale-while-revalidate)
 */
export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  // Check fresh cache
  const cached = getCached<T>(key);
  if (cached && !cached.stale) return cached.data;

  try {
    // Check rate limit before fetching
    if (rateLimitRemaining < 10 && rateLimitReset > Date.now() / 1000) {
      if (cached) {
        console.warn(`[github-cache] Rate limit low (${rateLimitRemaining}), serving stale for ${key}`);
        return cached.data;
      }
    }

    const data = await fetcher();
    setCache(key, data, ttlMs);
    return data;
  } catch (err) {
    // On error, serve stale if available
    if (cached) {
      console.warn(`[github-cache] Error fetching ${key}, serving stale:`, (err as Error).message);
      return cached.data;
    }
    throw err;
  }
}
