/**
 * rss.js
 *
 * Fetches AI-related content from curated RSS feeds and returns
 * standardized result objects compatible with other source modules
 * (hackernews.js, reddit.js, producthunt.js).
 *
 * Usage:
 *   import { fetchRSS } from './rss.js';
 *   const results = await fetchRSS();
 */

import Parser from 'rss-parser';

const parser = new Parser({ timeout: 10000 });

const MAX_ITEMS_PER_FEED = 20;
const DELAY_BETWEEN_FEEDS_MS = 300;

// ---------------------------------------------------------------------------
// Feed configuration — mirrors research-agent.js FEED_MAP
// ---------------------------------------------------------------------------

const FEED_MAP = {
  ai: [
    'https://feeds.feedburner.com/TheHackersNews',
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml',
    'https://venturebeat.com/category/ai/feed/',
    'https://blog.google/technology/ai/rss/',
  ],
  'artificial intelligence': [
    'https://feeds.feedburner.com/TheHackersNews',
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml',
    'https://venturebeat.com/category/ai/feed/',
    'https://blog.google/technology/ai/rss/',
  ],
  'web development': [
    'https://css-tricks.com/feed/',
    'https://feeds.feedburner.com/AlistApart',
    'https://blog.chromium.org/feeds/posts/default?alt=rss',
    'https://developer.mozilla.org/en-US/blog/rss.xml',
    'https://web.dev/feed.xml',
  ],
  'web dev': [
    'https://css-tricks.com/feed/',
    'https://feeds.feedburner.com/AlistApart',
    'https://blog.chromium.org/feeds/posts/default?alt=rss',
    'https://developer.mozilla.org/en-US/blog/rss.xml',
    'https://web.dev/feed.xml',
  ],
  tech: [
    'https://techcrunch.com/feed/',
    'https://www.theverge.com/rss/index.xml',
    'https://arstechnica.com/feed/',
    'https://feeds.feedburner.com/TheHackersNews',
    'https://www.wired.com/feed/rss',
  ],
  business: [
    'https://hbr.org/resources/pdfs/rss/hbrfeed.xml',
    'https://feeds.feedburner.com/venturebeat/SZYF',
    'https://techcrunch.com/feed/',
    'https://a16z.com/feed/',
    'https://www.fastcompany.com/latest/rss',
  ],
  default: [
    'https://techcrunch.com/feed/',
    'https://www.theverge.com/rss/index.xml',
    'https://arstechnica.com/feed/',
    'https://feeds.feedburner.com/TheHackersNews',
    'https://venturebeat.com/feed/',
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pause execution for the given number of milliseconds.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract media URLs from an RSS item.
 * Checks item.enclosure and any media:content / media:thumbnail fields
 * that rss-parser may expose.
 */
function extractMediaUrls(item) {
  const urls = [];

  // Standard RSS enclosure (podcasts, images, etc.)
  if (item.enclosure?.url) {
    urls.push(item.enclosure.url);
  }

  // media:content — rss-parser surfaces this under various keys
  const mediaContent = item['media:content'] || item.media;
  if (mediaContent) {
    const mediaItems = Array.isArray(mediaContent) ? mediaContent : [mediaContent];
    for (const m of mediaItems) {
      const url = m.$ && m.$.url ? m.$.url : m.url;
      if (url) urls.push(url);
    }
  }

  // media:thumbnail
  const mediaThumbnail = item['media:thumbnail'];
  if (mediaThumbnail) {
    const thumbItems = Array.isArray(mediaThumbnail) ? mediaThumbnail : [mediaThumbnail];
    for (const t of thumbItems) {
      const url = t.$ && t.$.url ? t.$.url : t.url;
      if (url) urls.push(url);
    }
  }

  // Deduplicate
  return [...new Set(urls)];
}

/**
 * Build a short summary from content/contentSnippet, capped at 300 chars.
 */
function buildSummary(item) {
  const text = item.contentSnippet || item.content || item.summary || '';
  if (text.length <= 300) return text.trim();
  return text.slice(0, 300).replace(/\s+\S*$/, '') + '...';
}

/**
 * Convert a raw rss-parser item into our standardized result shape.
 */
function normalizeItem(item, feedTitle) {
  return {
    title: (item.title || '').trim(),
    url: item.link || '',
    summary: buildSummary(item),
    pubDate: item.pubDate || item.isoDate || null,
    score: 0, // will be scored by relevance filter later
    source: 'rss',
    sourceFeed: feedTitle || '',
    author: item.creator || item.author || item['dc:creator'] || '',
    mediaUrls: extractMediaUrls(item),
    toolUrl: null,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch AI-related content from all configured RSS feeds.
 *
 * @param {string} [niche='ai'] - The niche key to look up in FEED_MAP.
 * @returns {Promise<Array>} Standardized result objects.
 */
export async function fetchRSS(niche = 'ai') {
  const key = niche.toLowerCase();
  const feeds = FEED_MAP[key] || FEED_MAP.default;

  console.log(`[rss] Fetching ${feeds.length} RSS feeds for niche: "${key}"`);

  const allResults = [];

  for (const feedUrl of feeds) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const items = (feed.items || []).slice(0, MAX_ITEMS_PER_FEED);
      const feedTitle = feed.title || feedUrl;

      const normalized = items.map((item) => normalizeItem(item, feedTitle));
      allResults.push(...normalized);

      console.log(`  [rss] ${feedTitle}: ${items.length} items`);
    } catch (error) {
      console.warn(`  [rss] Failed to fetch ${feedUrl}: ${error.message}`);
    }

    // Small delay between feeds to be polite
    await sleep(DELAY_BETWEEN_FEEDS_MS);
  }

  console.log(`[rss] Done. ${allResults.length} total items from ${feeds.length} feeds.`);

  return allResults;
}

export { FEED_MAP };
