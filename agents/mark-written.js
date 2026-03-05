#!/usr/bin/env node
/**
 * mark-written.js — Mark a topic as Done in Notion
 *
 * Usage: node agents/mark-written.js <topic-id>
 */

import { config } from 'dotenv';
config({ override: true });
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const topicId = process.argv[2];
if (!topicId) {
  console.error('Usage: node agents/mark-written.js <topic-id>');
  process.exit(1);
}

async function main() {
  await notion.pages.update({
    page_id: topicId,
    properties: {
      Status: { select: { name: 'Done' } },
    },
  });
  console.log(JSON.stringify({ success: true, topicId }));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
