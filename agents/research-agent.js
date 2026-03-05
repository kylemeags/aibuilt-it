#!/usr/bin/env node
/**
 * research-agent.js — Multi-Source Research Orchestrator
 *
 * Scrapes Reddit, HackerNews, ProductHunt, and RSS feeds for real AI
 * implementation stories, scores them for relevance, deduplicates
 * against Notion, captures media, and pushes top results to the
 * Notion Topic Queue.
 *
 * Usage:
 *   node agents/research-agent.js              # all sources
 *   node agents/research-agent.js --reddit     # Reddit only
 *   node agents/research-agent.js --hn         # HackerNews only
 *   node agents/research-agent.js --ph         # ProductHunt only
 *   node agents/research-agent.js --rss        # RSS only
 *   node agents/research-agent.js --no-media   # skip media capture
 */

import { config } from 'dotenv';
config({ override: true });
import { Client } from '@notionhq/client';

import { fetchReddit } from './sources/reddit.js';
import { fetchHackerNews } from './sources/hackernews.js';
import { fetchProductHunt } from './sources/producthunt.js';
import { fetchRSS } from './sources/rss.js';
import { filterByRelevance, classifyContentType, classifyCategory } from './filters/relevance.js';
import { deduplicateAgainstNotion } from './filters/dedup.js';
import { captureMediaFromItem } from './media/capture.js';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const TOPIC_QUEUE_DB = process.env.NOTION_TOPIC_QUEUE_DB;

// ── CLI flags ───────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2).map(a => a.toLowerCase()));
const sourceFlags = ['--reddit', '--hn', '--ph', '--rss'];
const hasSourceFlag = sourceFlags.some(f => args.has(f));
const runAll = !hasSourceFlag;
const skipMedia = args.has('--no-media');

const runReddit = runAll || args.has('--reddit');
const runHN = runAll || args.has('--hn');
const runPH = runAll || args.has('--ph');
const runRSS = runAll || args.has('--rss');

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Research Agent — Multi-Source Orchestrator\n');
  console.log(`   Sources: ${[
    runReddit && 'Reddit',
    runHN && 'HackerNews',
    runPH && 'ProductHunt',
    runRSS && 'RSS',
  ].filter(Boolean).join(', ')}`);
  console.log(`   Media capture: ${skipMedia ? 'OFF' : 'ON'}\n`);

  // ── 1. Fetch from all sources in parallel ──────────────────────
  console.log('📡 Fetching from sources...\n');
  const fetchers = [];
  if (runReddit) fetchers.push({ name: 'Reddit', fn: fetchReddit });
  if (runHN) fetchers.push({ name: 'HackerNews', fn: fetchHackerNews });
  if (runPH) fetchers.push({ name: 'ProductHunt', fn: fetchProductHunt });
  if (runRSS) fetchers.push({ name: 'RSS', fn: () => fetchRSS('ai') });

  const results = await Promise.allSettled(fetchers.map(f => f.fn()));

  let allItems = [];
  results.forEach((result, i) => {
    const { name } = fetchers[i];
    if (result.status === 'fulfilled') {
      const items = result.value || [];
      console.log(`   ✅ ${name}: ${items.length} items`);
      allItems.push(...items);
    } else {
      console.log(`   ❌ ${name}: ${result.reason?.message || 'Unknown error'}`);
    }
  });

  console.log(`\n📊 Total raw items: ${allItems.length}`);

  if (allItems.length === 0) {
    console.log('\nNo items found. Check your network connection or try again later.');
    return;
  }

  // ── 2. Score for relevance ─────────────────────────────────────
  console.log('\n🎯 Scoring for relevance...');
  const relevant = filterByRelevance(allItems, 15);
  console.log(`   ${relevant.length} items passed relevance filter (of ${allItems.length})`);

  if (relevant.length === 0) {
    console.log('\nNo items passed the relevance filter. Lowering threshold or checking sources may help.');
    return;
  }

  // ── 3. Classify content type and category ──────────────────────
  for (const item of relevant) {
    item.contentType = classifyContentType(item);
    item.category = classifyCategory(item);
  }

  // ── 4. Deduplicate against Notion ──────────────────────────────
  console.log('\n🔄 Deduplicating against Notion...');
  const unique = await deduplicateAgainstNotion(relevant);
  console.log(`   ${unique.length} new topics (${relevant.length - unique.length} duplicates removed)`);

  if (unique.length === 0) {
    console.log('\nAll topics already exist in Notion. Wait for fresh content.');
    return;
  }

  // ── 5. Take top 15 ────────────────────────────────────────────
  const top = unique.slice(0, 15);

  // ── 6. Capture media (optional) ────────────────────────────────
  let enriched = top;
  if (!skipMedia) {
    console.log('\n📸 Capturing media...');
    enriched = [];
    for (const item of top) {
      try {
        const withMedia = await captureMediaFromItem(item);
        enriched.push(withMedia);
        const mediaCount = (withMedia.mediaUrls || []).length;
        if (mediaCount > 0) {
          console.log(`   📷 ${item.title.slice(0, 50)}... → ${mediaCount} image(s)`);
        }
      } catch (err) {
        console.log(`   ⚠️  Media capture failed for "${item.title.slice(0, 40)}...": ${err.message}`);
        enriched.push(item);
      }
    }
  }

  // ── 7. Push to Notion ──────────────────────────────────────────
  console.log('\n📤 Pushing to Notion Topic Queue...\n');
  let pushed = 0;

  for (const item of enriched) {
    try {
      const properties = {
        Topic: { title: [{ text: { content: item.title.slice(0, 200) } }] },
        Status: { select: { name: 'Queued' } },
        'Source URL': { url: item.sourceUrl || item.url || null },
        Summary: { rich_text: [{ text: { content: (item.summary || '').slice(0, 2000) } }] },
        Score: { number: item.score || 0 },
        'Date Added': { date: { start: new Date().toISOString().split('T')[0] } },
      };

      // New fields — these may fail if Notion schema hasn't been updated yet
      // so we wrap them in a try and fall back to basic fields
      const extraProperties = {};

      // Category (select)
      if (item.category) {
        extraProperties.Category = { select: { name: item.category } };
      }

      // Content Type (select)
      if (item.contentType) {
        extraProperties['Content Type'] = { select: { name: item.contentType } };
      }

      // Source Platform (select)
      if (item.source) {
        extraProperties['Source Platform'] = { select: { name: item.source } };
      }

      // Tool Name (rich text)
      if (item.toolName) {
        extraProperties['Tool Name'] = { rich_text: [{ text: { content: item.toolName.slice(0, 200) } }] };
      }

      // Tool URL (url)
      if (item.toolUrl) {
        extraProperties['Tool URL'] = { url: item.toolUrl };
      }

      // Has Results (checkbox) — true if score contains results/metrics
      if (item.score > 40) {
        extraProperties['Has Results'] = { checkbox: true };
      }

      // Media URLs (rich text, JSON array)
      if (item.mediaUrls && item.mediaUrls.length > 0) {
        extraProperties['Media URLs'] = {
          rich_text: [{ text: { content: JSON.stringify(item.mediaUrls).slice(0, 2000) } }],
        };
      }

      // Source Author (rich text)
      if (item.author) {
        extraProperties['Source Author'] = { rich_text: [{ text: { content: String(item.author).slice(0, 200) } }] };
      }

      // Try with all properties first, fall back to basic if Notion schema doesn't have new fields
      try {
        await notion.pages.create({
          parent: { database_id: TOPIC_QUEUE_DB },
          properties: { ...properties, ...extraProperties },
        });
      } catch (schemaErr) {
        // If extra properties cause errors, try with just basic properties
        if (schemaErr.code === 'validation_error') {
          await notion.pages.create({
            parent: { database_id: TOPIC_QUEUE_DB },
            properties: {
              ...properties,
              Niche: { select: { name: 'AI' } }, // legacy field fallback
            },
          });
        } else {
          throw schemaErr;
        }
      }

      pushed++;
      console.log(`   ${pushed}. [${item.score}] [${item.source}] ${item.title.slice(0, 70)}`);
    } catch (err) {
      console.error(`   ❌ Failed: "${item.title.slice(0, 50)}...": ${err.message}`);
    }
  }

  // ── Summary ────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎉 Research Agent finished!`);
  console.log(`   Sources scraped: ${fetchers.length}`);
  console.log(`   Total items found: ${allItems.length}`);
  console.log(`   Passed relevance: ${relevant.length}`);
  console.log(`   New (not dupes): ${unique.length}`);
  console.log(`   Pushed to Notion: ${pushed}`);
  console.log(`${'═'.repeat(60)}`);
}

main().catch((err) => {
  console.error('\n💥 Research Agent failed:', err.message);
  process.exit(1);
});
