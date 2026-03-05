/**
 * dedup.js
 *
 * Deduplication filter that checks incoming items against existing
 * entries in the Notion Topic Queue database.
 *
 * Supports exact title match, 70% word overlap, and same-URL detection.
 *
 * Usage:
 *   import { deduplicateAgainstNotion } from './dedup.js';
 *   const unique = await deduplicateAgainstNotion(items);
 */

import { config } from 'dotenv';
config({ override: true });

import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const TOPIC_QUEUE_DB = process.env.NOTION_TOPIC_QUEUE_DB;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Notion rich text array to a plain string.
 */
function richTextToPlain(richText) {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map((t) => t.plain_text || '').join('');
}

/**
 * Tokenize a title into a set of meaningful words.
 * Strips common short words to improve overlap accuracy.
 */
function tokenize(text) {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'it', 'as', 'be', 'was', 'are', 'were',
    'this', 'that', 'from', 'i', 'we', 'my', 'our', 'your', 'how',
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));
}

/**
 * Calculate the fraction of words in `wordsA` that also appear in `wordsB`.
 */
function wordOverlap(wordsA, wordsB) {
  if (wordsA.length === 0) return 0;
  const setB = new Set(wordsB);
  const shared = wordsA.filter((w) => setB.has(w)).length;
  return shared / wordsA.length;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch all existing topics from the Notion Topic Queue.
 * Returns an array of objects with { title, url } so we can check both.
 *
 * Handles pagination — Notion limits each query to 100 results.
 *
 * @returns {Promise<Array<{ title: string, url: string | null }>>}
 */
export async function getExistingTopics() {
  const topics = [];
  let startCursor = undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: TOPIC_QUEUE_DB,
      page_size: 100,
      ...(startCursor ? { start_cursor: startCursor } : {}),
    });

    for (const page of response.results) {
      const title = richTextToPlain(page.properties.Topic?.title || []);
      const url = page.properties['Source URL']?.url || null;

      topics.push({
        title: title.toLowerCase().trim(),
        url: url ? url.toLowerCase().trim() : null,
      });
    }

    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  return topics;
}

/**
 * Check whether a single item is a duplicate of any existing topic.
 *
 * Checks:
 *   1. Exact title match (case-insensitive)
 *   2. 70% word overlap in title
 *   3. Same URL match
 *
 * @param {Object} item - A standardized result object with `title` and `url`.
 * @param {Array<{ title: string, url: string | null }>} existingTopics
 * @returns {boolean} true if the item is a duplicate.
 */
export function isDuplicate(item, existingTopics) {
  const itemTitle = (item.title || '').toLowerCase().trim();
  const itemUrl = (item.url || '').toLowerCase().trim();

  if (!itemTitle && !itemUrl) return false;

  const itemWords = tokenize(itemTitle);

  for (const existing of existingTopics) {
    // Check 1: Exact title match
    if (itemTitle && existing.title && itemTitle === existing.title) {
      return true;
    }

    // Check 2: 70% word overlap
    if (itemWords.length > 0 && existing.title) {
      const existingWords = tokenize(existing.title);
      if (existingWords.length > 0) {
        const overlap = wordOverlap(itemWords, existingWords);
        if (overlap >= 0.7) return true;
      }
    }

    // Check 3: Same URL
    if (itemUrl && existing.url && itemUrl === existing.url) {
      return true;
    }
  }

  return false;
}

/**
 * Filter out items that already exist in the Notion Topic Queue.
 *
 * Fetches all existing topics from Notion, then returns only items that
 * are NOT duplicates.
 *
 * @param {Array} items - Array of standardized result objects.
 * @returns {Promise<Array>} Items that are not duplicates.
 */
export async function deduplicateAgainstNotion(items) {
  console.log('[dedup] Fetching existing topics from Notion...');
  const existingTopics = await getExistingTopics();
  console.log(`[dedup] Found ${existingTopics.length} existing topics in Notion`);

  const unique = [];
  let duplicateCount = 0;

  for (const item of items) {
    if (isDuplicate(item, existingTopics)) {
      duplicateCount++;
    } else {
      unique.push(item);
    }
  }

  console.log(`[dedup] ${duplicateCount} duplicates removed, ${unique.length} unique items remaining`);
  return unique;
}
