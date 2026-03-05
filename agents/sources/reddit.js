/**
 * reddit.js
 *
 * Scrapes Reddit's public JSON API (no auth required) to find real
 * AI implementation posts across relevant subreddits.
 *
 * Reddit exposes a free JSON endpoint by appending `.json` to any URL.
 * Rate limit is roughly 60 requests/min for unauthenticated access;
 * we add a 500ms delay between requests to stay well within that.
 *
 * Usage:
 *   import { fetchReddit } from './reddit.js';
 *   const results = await fetchReddit();
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUBREDDITS = [
  'ChatGPT',
  'artificial',
  'SideProject',
  'Entrepreneur',
  'smallbusiness',
  'marketing',
  'automation',
  'AItools',
  'OpenAI',
  'LocalLLaMA',
];

const SEARCH_KEYWORDS = [
  'built',
  'automated',
  'workflow',
  'tool',
  'saved',
  'using AI',
  'AI tool',
];

const MIN_UPVOTES = 10;
const REQUEST_DELAY_MS = 500;
const MAX_RESULTS_PER_SUBREDDIT = 25;
const SUMMARY_MAX_LENGTH = 300;

// Reddit requires a descriptive User-Agent; bare fetch may get blocked.
const USER_AGENT = 'aibuilt-it-scraper/1.0 (research bot)';

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
 * Build Reddit search URL for a subreddit + keyword combo.
 * Uses the search endpoint with `restrict_sr=on` so results stay
 * within the target subreddit, sorted by relevance within the past month.
 */
function buildSearchUrl(subreddit, keyword) {
  const params = new URLSearchParams({
    q: keyword,
    restrict_sr: 'on',
    sort: 'relevance',
    t: 'month',
    limit: String(MAX_RESULTS_PER_SUBREDDIT),
  });
  return `https://www.reddit.com/r/${subreddit}/search.json?${params}`;
}

/**
 * Extract media URLs from a Reddit post's JSON data.
 * Handles preview images, Reddit-hosted video, and external link URLs.
 */
function extractMediaUrls(post) {
  const urls = [];

  // Preview images (Reddit-hosted thumbnails / full-res)
  if (post.preview?.images?.length) {
    for (const img of post.preview.images) {
      const src = img.source?.url;
      if (src) {
        // Reddit HTML-encodes ampersands in preview URLs
        urls.push(src.replace(/&amp;/g, '&'));
      }
    }
  }

  // Reddit-hosted video
  if (post.media?.reddit_video?.fallback_url) {
    urls.push(post.media.reddit_video.fallback_url);
  }

  // External link (only if it looks like an image/video, not just another webpage)
  if (post.url && /\.(jpg|jpeg|png|gif|gifv|mp4|webm)(\?|$)/i.test(post.url)) {
    if (!urls.includes(post.url)) {
      urls.push(post.url);
    }
  }

  return urls;
}

/**
 * Attempt to pull a tool/project URL from the post body.
 * Looks for markdown links or bare URLs that point to non-Reddit domains.
 */
function extractToolUrl(selftext) {
  if (!selftext) return null;

  // Match markdown links: [text](url)
  const markdownLinks = [...selftext.matchAll(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g)];
  for (const match of markdownLinks) {
    const url = match[2];
    if (!url.includes('reddit.com') && !url.includes('redd.it')) {
      return url;
    }
  }

  // Match bare URLs
  const bareUrls = [...selftext.matchAll(/(?<!\()(https?:\/\/[^\s)\]>]+)/g)];
  for (const match of bareUrls) {
    const url = match[1];
    if (!url.includes('reddit.com') && !url.includes('redd.it')) {
      return url;
    }
  }

  return null;
}

/**
 * Build a short summary from the post's selftext, falling back to the title.
 */
function buildSummary(post) {
  const text = post.selftext || post.title || '';
  if (text.length <= SUMMARY_MAX_LENGTH) return text;
  return text.slice(0, SUMMARY_MAX_LENGTH).replace(/\s+\S*$/, '') + '...';
}

/**
 * Convert a Reddit post object into our standardized result shape.
 */
function normalizePost(post, subreddit) {
  const permalink = `https://www.reddit.com${post.permalink}`;
  return {
    title: post.title || '',
    url: permalink,
    summary: buildSummary(post),
    pubDate: post.created_utc
      ? new Date(post.created_utc * 1000).toISOString()
      : null,
    score: 0, // will be scored by relevance filter later
    source: 'reddit',
    sourceUrl: permalink,
    subreddit,
    author: post.author ? `u/${post.author}` : null,
    upvotes: post.ups ?? 0,
    commentCount: post.num_comments ?? 0,
    mediaUrls: extractMediaUrls(post),
    toolUrl: extractToolUrl(post.selftext),
  };
}

// ---------------------------------------------------------------------------
// Core fetch logic
// ---------------------------------------------------------------------------

/**
 * Fetch a single Reddit JSON endpoint with proper headers and error handling.
 * Returns the parsed JSON body or null on failure.
 */
async function fetchRedditJson(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (response.status === 429) {
    // Rate limited -- back off and retry once after a longer pause
    console.warn('  [reddit] Rate limited, waiting 5 seconds before retry...');
    await sleep(5000);
    const retry = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });
    if (!retry.ok) return null;
    return retry.json();
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Search a single subreddit for all implementation keywords, deduplicate
 * the results, and return the normalized array.
 */
async function searchSubreddit(subreddit) {
  const seen = new Set();
  const results = [];

  for (const keyword of SEARCH_KEYWORDS) {
    const url = buildSearchUrl(subreddit, keyword);
    const json = await fetchRedditJson(url);

    if (!json?.data?.children?.length) {
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    for (const child of json.data.children) {
      const post = child.data;
      if (!post || !post.id) continue;

      // Deduplicate across keywords within the same subreddit
      if (seen.has(post.id)) continue;
      seen.add(post.id);

      // Filter: minimum upvotes threshold
      if ((post.ups ?? 0) < MIN_UPVOTES) continue;

      results.push(normalizePost(post, subreddit));
    }

    // Polite delay between requests
    await sleep(REQUEST_DELAY_MS);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scrape all configured subreddits for AI implementation posts.
 *
 * @returns {Promise<Array>} Standardized results sorted by upvotes descending.
 */
export async function fetchReddit() {
  console.log(`[reddit] Searching ${SUBREDDITS.length} subreddits for AI implementation posts...`);

  const allResults = [];

  for (const subreddit of SUBREDDITS) {
    try {
      const posts = await searchSubreddit(subreddit);
      console.log(`  [reddit] r/${subreddit}: ${posts.length} posts matched`);
      allResults.push(...posts);
    } catch (error) {
      console.error(`  [reddit] r/${subreddit} failed: ${error.message}`);
    }
  }

  // Global dedup by URL (a post could appear in multiple subreddits via crossposts)
  const uniqueByUrl = new Map();
  for (const item of allResults) {
    if (!uniqueByUrl.has(item.url)) {
      uniqueByUrl.set(item.url, item);
    }
  }

  const deduplicated = [...uniqueByUrl.values()];

  // Sort by upvotes descending as a baseline engagement signal
  deduplicated.sort((a, b) => b.upvotes - a.upvotes);

  console.log(
    `[reddit] Done. ${deduplicated.length} unique posts (from ${allResults.length} total matches).`
  );

  return deduplicated;
}
