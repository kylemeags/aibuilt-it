/**
 * producthunt.js
 *
 * Fetches AI product launches from ProductHunt.
 *
 * Strategy:
 *   1. If PRODUCTHUNT_TOKEN is set, use the official GraphQL API
 *   2. Otherwise, scrape the embedded __NEXT_DATA__ JSON from the PH website
 *   3. If both fail, return an empty array with a warning
 *
 * Returns a standardized results array compatible with other source modules.
 */

const PH_GRAPHQL_URL = 'https://api.producthunt.com/v2/api/graphql';
const PH_TOPIC_URL = 'https://www.producthunt.com/topics/artificial-intelligence';
const PH_SEARCH_URL = 'https://www.producthunt.com/search?q=AI+tool';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Normalize a single product into the standardized result format.
 */
function normalizeProduct(product) {
  const name = product.name || '';
  const tagline = product.tagline || '';
  const slug = product.slug || '';
  const url = product.url || `https://www.producthunt.com/posts/${slug}`;
  const websiteUrl = product.website || product.websiteUrl || product.productLinks?.[0]?.url || '';

  const mediaUrls = [];
  if (product.thumbnail?.url) {
    mediaUrls.push(product.thumbnail.url);
  }
  if (product.thumbnailUrl) {
    mediaUrls.push(product.thumbnailUrl);
  }
  if (Array.isArray(product.media)) {
    for (const m of product.media) {
      const mediaUrl = m.url || m.originalUrl || m.videoUrl;
      if (mediaUrl) mediaUrls.push(mediaUrl);
    }
  }
  if (Array.isArray(product.screenshots)) {
    for (const s of product.screenshots) {
      const screenshotUrl = typeof s === 'string' ? s : s.url || s.originalUrl;
      if (screenshotUrl) mediaUrls.push(screenshotUrl);
    }
  }

  const votesCount =
    product.votesCount ??
    product.votes_count ??
    product.upvotes ??
    0;

  const commentsCount =
    product.commentsCount ??
    product.comments_count ??
    product.reviewsCount ??
    0;

  const makerName =
    product.user?.username ||
    product.user?.name ||
    product.makers?.[0]?.username ||
    product.makers?.[0]?.name ||
    '';

  const createdAt = product.createdAt || product.created_at || product.featuredAt || null;

  return {
    title: tagline ? `${name} \u2014 ${tagline}` : name,
    url,
    summary: product.description || tagline || '',
    pubDate: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
    score: 0,
    source: 'producthunt',
    sourceUrl: url,
    author: makerName,
    upvotes: votesCount,
    commentCount: commentsCount,
    mediaUrls: [...new Set(mediaUrls)],
    toolUrl: websiteUrl || url,
    toolName: name,
  };
}

/**
 * Attempt 1: Use the official ProductHunt GraphQL API.
 * Requires a valid developer token in PRODUCTHUNT_TOKEN.
 */
async function fetchViaGraphQL(token) {
  const query = `
    query {
      posts(order: RANKING, topic: "artificial-intelligence", first: 20) {
        edges {
          node {
            id
            name
            tagline
            description
            slug
            url
            website
            votesCount
            commentsCount
            createdAt
            featuredAt
            thumbnail {
              url
            }
            media {
              url
              videoUrl
            }
            user {
              username
              name
            }
            makers {
              username
              name
            }
            productLinks {
              url
            }
          }
        }
      }
    }
  `;

  const response = await fetch(PH_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL API returned ${response.status}: ${response.statusText}`);
  }

  const json = await response.json();

  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  const edges = json.data?.posts?.edges;
  if (!Array.isArray(edges) || edges.length === 0) {
    throw new Error('GraphQL response contained no posts');
  }

  return edges.map((edge) => normalizeProduct(edge.node));
}

/**
 * Attempt 2: Scrape embedded JSON data from the ProductHunt website.
 * Looks for __NEXT_DATA__ or Apollo state in the HTML.
 */
async function fetchViaScrape() {
  const urls = [PH_TOPIC_URL, PH_SEARCH_URL];
  let lastError = null;

  for (const pageUrl of urls) {
    try {
      const response = await fetch(pageUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching ${pageUrl}`);
      }

      const html = await response.text();
      const products = extractProductsFromHTML(html);

      if (products.length > 0) {
        return products;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[producthunt] Scrape attempt failed for ${pageUrl}: ${err.message}`);
    }
  }

  throw lastError || new Error('No products found via scraping');
}

/**
 * Extract product data from the raw HTML of a ProductHunt page.
 * Tries multiple strategies to find embedded JSON data.
 */
function extractProductsFromHTML(html) {
  // Strategy A: Extract __NEXT_DATA__ JSON
  const nextDataProducts = extractFromNextData(html);
  if (nextDataProducts.length > 0) return nextDataProducts;

  // Strategy B: Extract Apollo / inline JSON state
  const apolloProducts = extractFromApolloState(html);
  if (apolloProducts.length > 0) return apolloProducts;

  // Strategy C: Extract from any embedded JSON containing post data
  const inlineProducts = extractFromInlineJSON(html);
  if (inlineProducts.length > 0) return inlineProducts;

  return [];
}

/**
 * Extract products from __NEXT_DATA__ script tag.
 */
function extractFromNextData(html) {
  const match = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return [];

  try {
    const data = JSON.parse(match[1]);
    const posts = findPostsInObject(data);
    return posts.map(normalizeProduct);
  } catch {
    return [];
  }
}

/**
 * Extract products from Apollo state / window.__APOLLO_STATE__.
 */
function extractFromApolloState(html) {
  const match = html.match(/window\.__APOLLO_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
  if (!match) return [];

  try {
    const state = JSON.parse(match[1]);
    const products = [];

    for (const key of Object.keys(state)) {
      if (key.startsWith('Post:') && state[key].name) {
        products.push(state[key]);
      }
    }

    return products.map(normalizeProduct);
  } catch {
    return [];
  }
}

/**
 * Extract products from any inline JSON blocks in the HTML that contain
 * recognizable ProductHunt post structures.
 */
function extractFromInlineJSON(html) {
  const products = [];
  // Look for JSON-like structures with PH-specific fields
  const jsonPattern = /\{"id":\s*"\d+","name":"[^"]+","tagline":"[^"]*"[^}]*\}/g;
  const matches = html.matchAll(jsonPattern);

  for (const match of matches) {
    try {
      const obj = JSON.parse(match[0]);
      if (obj.name && (obj.tagline || obj.slug)) {
        products.push(normalizeProduct(obj));
      }
    } catch {
      // Skip malformed JSON fragments
    }
  }

  return products;
}

/**
 * Recursively search an object tree for arrays of post-like objects.
 * Used to navigate the unpredictable __NEXT_DATA__ structure.
 */
function findPostsInObject(obj, depth = 0) {
  if (depth > 10 || obj === null || typeof obj !== 'object') return [];

  // If this object looks like a post, return it
  if (obj.name && (obj.tagline || obj.slug) && (obj.votesCount !== undefined || obj.votes_count !== undefined)) {
    return [obj];
  }

  // If this is an array, check each element
  if (Array.isArray(obj)) {
    const posts = [];
    for (const item of obj) {
      posts.push(...findPostsInObject(item, depth + 1));
    }
    if (posts.length > 0) return posts;
  }

  // Check known likely keys first for efficiency
  const priorityKeys = ['posts', 'edges', 'nodes', 'items', 'results', 'data', 'props', 'pageProps', 'initialData'];
  const allKeys = Object.keys(obj);
  const sortedKeys = [
    ...priorityKeys.filter((k) => allKeys.includes(k)),
    ...allKeys.filter((k) => !priorityKeys.includes(k)),
  ];

  for (const key of sortedKeys) {
    const found = findPostsInObject(obj[key], depth + 1);
    if (found.length > 0) return found;
  }

  return [];
}

/**
 * Main entry point. Fetches AI product launches from ProductHunt.
 *
 * @returns {Promise<Array>} Standardized results array
 */
export async function fetchProductHunt() {
  const token = process.env.PRODUCTHUNT_TOKEN;

  // Attempt 1: GraphQL API with developer token
  if (token) {
    try {
      console.log('[producthunt] Fetching via GraphQL API...');
      const results = await fetchViaGraphQL(token);
      console.log(`[producthunt] GraphQL API returned ${results.length} products`);
      return results;
    } catch (err) {
      console.warn(`[producthunt] GraphQL API failed: ${err.message}`);
      console.warn('[producthunt] Falling back to web scraping...');
    }
  } else {
    console.log('[producthunt] No PRODUCTHUNT_TOKEN set, skipping GraphQL API');
  }

  // Attempt 2: Web scraping with embedded JSON extraction
  try {
    console.log('[producthunt] Fetching via web scraping...');
    const results = await fetchViaScrape();
    console.log(`[producthunt] Scraping returned ${results.length} products`);
    return results;
  } catch (err) {
    console.warn(`[producthunt] Web scraping failed: ${err.message}`);
  }

  // Attempt 3: Give up gracefully
  console.warn('[producthunt] All fetch methods failed. Returning empty results.');
  return [];
}

export default fetchProductHunt;
