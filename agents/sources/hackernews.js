/**
 * HackerNews source module
 *
 * Scrapes Hacker News via the free Algolia API to find real AI
 * implementation posts (especially "Show HN" submissions).
 *
 * No authentication required.
 */

const HN_ALGOLIA_BASE = 'https://hn.algolia.com/api/v1/search';
const HN_ITEM_URL = 'https://news.ycombinator.com/item?id=';
const FOURTEEN_DAYS_S = 14 * 24 * 60 * 60;

/**
 * Queries to run against the Algolia API.
 * Each entry produces a separate request; results are merged and deduplicated.
 */
const QUERIES = [
  {
    label: 'Show HN AI tools',
    params: {
      query: 'AI tool',
      tags: 'show_hn',
      numericFilters: 'points>10',
    },
  },
  {
    label: 'Show HN automation',
    params: {
      query: 'automation',
      tags: 'show_hn',
      numericFilters: 'points>10',
    },
  },
  {
    label: 'AI implementation stories',
    params: {
      query: 'AI built tool',
      numericFilters: 'points>20',
    },
  },
  {
    label: 'AI workflow / automation stories',
    params: {
      query: 'AI workflow automated',
      numericFilters: 'points>15',
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a full Algolia search URL from a params object.
 * Automatically injects the `created_at_i` numeric filter so only posts from
 * the last 14 days are returned.
 */
function buildUrl(params) {
  const cutoff = Math.floor(Date.now() / 1000) - FOURTEEN_DAYS_S;
  const numericFilters = params.numericFilters
    ? `${params.numericFilters},created_at_i>${cutoff}`
    : `created_at_i>${cutoff}`;

  const qs = new URLSearchParams({
    query: params.query,
    hitsPerPage: '30',
    ...params,
    numericFilters,
  });

  return `${HN_ALGOLIA_BASE}?${qs.toString()}`;
}

/**
 * Attempt to fetch the Open Graph image from `url`.
 * Returns the og:image content value or null.
 */
async function fetchOgImage(url) {
  if (!url) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; aibuilt-it-bot/1.0)',
        Accept: 'text/html',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    // Only read the first ~100 KB to avoid downloading huge pages.
    const reader = res.body?.getReader();
    if (!reader) return null;

    let html = '';
    const decoder = new TextDecoder();
    const MAX_BYTES = 100 * 1024;

    while (html.length < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });

      // Early exit once we're past <head> — og:image lives there.
      if (html.includes('</head>')) break;
    }

    reader.cancel().catch(() => {});

    const match = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    );
    if (match) return match[1];

    // Some sites put content before property.
    const altMatch = html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
    );
    return altMatch ? altMatch[1] : null;
  } catch {
    // Network errors, timeouts, etc. are expected for many HN links.
    return null;
  }
}

/**
 * Convert a raw Algolia hit into our standardised result shape.
 * `ogImage` is resolved separately and merged later.
 */
function normalizeHit(hit) {
  const hnId = String(hit.objectID);
  const toolUrl = hit.url || null;

  return {
    title: hit.title || '',
    url: `${HN_ITEM_URL}${hnId}`,
    summary: hit.story_text || hit.comment_text || '',
    pubDate: hit.created_at || new Date().toISOString(),
    score: 0,
    source: 'hackernews',
    sourceUrl: `${HN_ITEM_URL}${hnId}`,
    hnId,
    author: hit.author || '',
    points: hit.points ?? 0,
    commentCount: hit.num_comments ?? 0,
    mediaUrls: [],
    toolUrl,
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Fetch AI-related posts from HackerNews.
 *
 * @returns {Promise<Array>} Standardised result objects.
 */
export async function fetchHackerNews() {
  const seen = new Set();
  const results = [];

  // Run all queries in parallel.
  const queryResults = await Promise.allSettled(
    QUERIES.map(async ({ label, params }) => {
      const url = buildUrl(params);

      try {
        const res = await fetch(url);

        if (!res.ok) {
          console.error(
            `[hackernews] Query "${label}" failed: ${res.status} ${res.statusText}`
          );
          return [];
        }

        const data = await res.json();
        return data.hits || [];
      } catch (err) {
        console.error(`[hackernews] Query "${label}" error:`, err.message);
        return [];
      }
    })
  );

  // Flatten and deduplicate.
  const allHits = [];
  for (const result of queryResults) {
    if (result.status === 'fulfilled') {
      allHits.push(...result.value);
    }
  }

  const uniqueHits = [];
  for (const hit of allHits) {
    const id = String(hit.objectID);
    if (!seen.has(id)) {
      seen.add(id);
      uniqueHits.push(hit);
    }
  }

  // Normalise all hits first (cheap / synchronous).
  const normalised = uniqueHits.map(normalizeHit);

  // Fetch OG images in parallel (with a concurrency guard so we don't
  // blast hundreds of requests at once).
  const CONCURRENCY = 10;
  for (let i = 0; i < normalised.length; i += CONCURRENCY) {
    const batch = normalised.slice(i, i + CONCURRENCY);

    const ogResults = await Promise.allSettled(
      batch.map((item) => fetchOgImage(item.toolUrl))
    );

    ogResults.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        batch[idx].mediaUrls = [result.value];
      }
    });
  }

  results.push(...normalised);

  console.log(
    `[hackernews] Fetched ${results.length} unique posts across ${QUERIES.length} queries`
  );

  return results;
}
