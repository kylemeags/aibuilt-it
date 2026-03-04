#!/usr/bin/env node
/**
 * research-agent.js
 *
 * Fetches recent items from RSS feeds for a given niche,
 * scores them for relevance/recency,
 * deduplicates against existing Notion Topic Queue entries,
 * and pushes the top 10 new topics to Notion.
 *
 * Usage: node agents/research-agent.js "artificial intelligence"
 *        node agents/research-agent.js "web development"
 */

import 'dotenv/config';
import { Client } from '@notionhq/client';
import Parser from 'rss-parser';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const parser = new Parser({ timeout: 10000 });

const TOPIC_QUEUE_DB = process.env.NOTION_TOPIC_QUEUE_DB;

// RSS feeds organized by niche keywords
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

function richTextToPlain(richText) {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map((t) => t.plain_text || '').join('');
}

function getFeedsForNiche(niche) {
  const key = niche.toLowerCase();
  return FEED_MAP[key] || FEED_MAP.default;
}

function detectNiche(keyword) {
  const lower = keyword.toLowerCase();
  if (lower.includes('ai') || lower.includes('artificial') || lower.includes('machine learning'))
    return 'AI';
  if (lower.includes('web') || lower.includes('css') || lower.includes('javascript'))
    return 'Web Dev';
  if (lower.includes('business') || lower.includes('startup') || lower.includes('venture'))
    return 'Business';
  return 'Tech';
}

function scoreItem(item, keyword) {
  let score = 0;
  const title = (item.title || '').toLowerCase();
  const content = (item.contentSnippet || item.content || '').toLowerCase();
  const keywordLower = keyword.toLowerCase();
  const terms = keywordLower.split(/\s+/);

  // Relevance: keyword in title = high score
  for (const term of terms) {
    if (title.includes(term)) score += 30;
    if (content.includes(term)) score += 10;
  }

  // Recency: newer = higher score
  if (item.pubDate) {
    const age = Date.now() - new Date(item.pubDate).getTime();
    const daysOld = age / (1000 * 60 * 60 * 24);
    if (daysOld < 1) score += 50;
    else if (daysOld < 3) score += 30;
    else if (daysOld < 7) score += 15;
    else if (daysOld < 14) score += 5;
  }

  return score;
}

async function getExistingTopics() {
  const response = await notion.databases.query({
    database_id: TOPIC_QUEUE_DB,
    page_size: 100,
  });

  return new Set(
    response.results.map((page) => {
      const title = richTextToPlain(page.properties.Topic?.title || []);
      return title.toLowerCase().trim();
    })
  );
}

async function pushToNotion(topics) {
  let pushed = 0;
  for (const topic of topics) {
    try {
      await notion.pages.create({
        parent: { database_id: TOPIC_QUEUE_DB },
        properties: {
          Topic: { title: [{ text: { content: topic.title } }] },
          Status: { select: { name: 'Queued' } },
          Niche: { select: { name: topic.niche } },
          'Source URL': { url: topic.url || null },
          Summary: { rich_text: [{ text: { content: topic.summary.slice(0, 2000) } }] },
          Score: { number: topic.score },
          Date: { date: { start: new Date().toISOString().split('T')[0] } },
        },
      });
      pushed++;
    } catch (error) {
      console.error(`   ❌ Failed to push "${topic.title}":`, error.message);
    }
  }
  return pushed;
}

async function main() {
  const keyword = process.argv[2];
  if (!keyword) {
    console.error('Usage: node agents/research-agent.js "your niche keyword"');
    process.exit(1);
  }

  console.log(`🔍 Research Agent starting for: "${keyword}"\n`);

  const niche = detectNiche(keyword);
  const feeds = getFeedsForNiche(keyword);
  console.log(`📡 Fetching ${feeds.length} RSS feeds for niche: ${niche}\n`);

  // Fetch all feeds
  const allItems = [];
  for (const feedUrl of feeds) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const items = (feed.items || []).slice(0, 20); // max 20 per feed
      console.log(`   ✅ ${feed.title || feedUrl}: ${items.length} items`);
      allItems.push(
        ...items.map((item) => ({
          title: (item.title || '').trim(),
          url: item.link || '',
          summary: (item.contentSnippet || item.content || '').slice(0, 300).trim(),
          pubDate: item.pubDate,
          score: scoreItem(item, keyword),
          niche,
        }))
      );
    } catch (error) {
      console.log(`   ⚠️  Failed to fetch ${feedUrl}: ${error.message}`);
    }
  }

  console.log(`\n📊 Total items fetched: ${allItems.length}`);

  // Score and sort
  allItems.sort((a, b) => b.score - a.score);

  // Deduplicate against existing Notion entries
  console.log('🔄 Checking for duplicates in Notion...');
  const existingTopics = await getExistingTopics();

  const newTopics = allItems.filter((item) => {
    const titleLower = item.title.toLowerCase().trim();
    if (!titleLower) return false;
    // Check for exact match or significant overlap
    for (const existing of existingTopics) {
      if (titleLower === existing) return false;
      // Simple overlap check
      const words = titleLower.split(/\s+/);
      const existingWords = existing.split(/\s+/);
      const overlap = words.filter((w) => existingWords.includes(w)).length;
      if (overlap > words.length * 0.7) return false;
    }
    return true;
  });

  console.log(`   ${allItems.length - newTopics.length} duplicates removed`);
  console.log(`   ${newTopics.length} new topics available\n`);

  // Take top 10
  const top10 = newTopics.slice(0, 10);

  if (top10.length === 0) {
    console.log('No new topics to add. Try a different keyword or wait for fresh content.');
    return;
  }

  console.log('📤 Pushing top topics to Notion:\n');
  top10.forEach((t, i) => {
    console.log(`   ${i + 1}. [Score: ${t.score}] ${t.title}`);
  });
  console.log('');

  const pushed = await pushToNotion(top10);
  console.log(`\n🎉 Research Agent finished! Pushed ${pushed} topics to Notion.`);
}

main().catch(console.error);
