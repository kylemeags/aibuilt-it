#!/usr/bin/env node
/**
 * read-queue.js — Read queued topics from Notion
 *
 * Outputs JSON to stdout for use by Claude Code slash commands.
 * Usage: node agents/read-queue.js [--limit 5]
 */

import { config } from 'dotenv';
config({ override: true });
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const TOPIC_QUEUE_DB = process.env.NOTION_TOPIC_QUEUE_DB;

function richTextToPlain(richText) {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map((t) => t.plain_text || '').join('');
}

const limit = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--limit') || '10');

async function main() {
  const response = await notion.databases.query({
    database_id: TOPIC_QUEUE_DB,
    filter: {
      property: 'Status',
      select: { equals: 'Queued' },
    },
    sorts: [{ property: 'Score', direction: 'descending' }],
    page_size: limit,
  });

  const topics = response.results.map((page) => {
    const props = page.properties;
    return {
      id: page.id,
      title: richTextToPlain(props.Topic?.title || []),
      summary: richTextToPlain(props.Summary?.rich_text || []),
      sourceUrl: props['Source URL']?.url || null,
      score: props.Score?.number || 0,
      dateAdded: props['Date Added']?.date?.start || null,
      // New fields (may not exist yet)
      category: props.Category?.select?.name || null,
      contentType: props['Content Type']?.select?.name || null,
      sourcePlatform: props['Source Platform']?.select?.name || null,
      toolName: richTextToPlain(props['Tool Name']?.rich_text || []) || null,
      toolUrl: props['Tool URL']?.url || null,
      mediaUrls: (() => {
        try {
          const raw = richTextToPlain(props['Media URLs']?.rich_text || []);
          return raw ? JSON.parse(raw) : [];
        } catch { return []; }
      })(),
      sourceAuthor: richTextToPlain(props['Source Author']?.rich_text || []) || null,
    };
  });

  console.log(JSON.stringify(topics, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
