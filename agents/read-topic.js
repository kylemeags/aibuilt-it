#!/usr/bin/env node
/**
 * read-topic.js — Get details for a single topic from Notion
 *
 * Usage: node agents/read-topic.js <topic-id>
 */

import { config } from 'dotenv';
config({ override: true });
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const topicId = process.argv[2];
if (!topicId) {
  console.error('Usage: node agents/read-topic.js <topic-id>');
  process.exit(1);
}

function richTextToPlain(richText) {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map((t) => t.plain_text || '').join('');
}

async function main() {
  const page = await notion.pages.retrieve({ page_id: topicId });
  const props = page.properties;

  const topic = {
    id: page.id,
    title: richTextToPlain(props.Topic?.title || []),
    summary: richTextToPlain(props.Summary?.rich_text || []),
    sourceUrl: props['Source URL']?.url || null,
    score: props.Score?.number || 0,
    status: props.Status?.select?.name || null,
    dateAdded: props['Date Added']?.date?.start || null,
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

  console.log(JSON.stringify(topic, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
