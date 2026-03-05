#!/usr/bin/env node
/**
 * content-agent.js
 *
 * Pulls 'Queued' topics from the Notion Topic Queue,
 * generates 600-800 word articles via Claude API,
 * saves drafts to the Notion Articles database with status 'Review'.
 *
 * Usage: node agents/content-agent.js
 */

import { config } from 'dotenv';
config({ override: true });
import { Client } from '@notionhq/client';
import Anthropic from '@anthropic-ai/sdk';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOPIC_QUEUE_DB = process.env.NOTION_TOPIC_QUEUE_DB;
const ARTICLES_DB = process.env.NOTION_ARTICLES_DB;

function richTextToPlain(richText) {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map((t) => t.plain_text || '').join('');
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function getQueuedTopics() {
  const response = await notion.databases.query({
    database_id: TOPIC_QUEUE_DB,
    filter: {
      property: 'Status',
      select: { equals: 'Queued' },
    },
  });
  return response.results;
}

async function generateArticle(topic, summary) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Write a 600-800 word news article about the following topic. Make it punchy, well-structured, and informative. No fluff. Use markdown formatting with a clear headline, subheadings, and short paragraphs.

Topic: ${topic}
${summary ? `Context: ${summary}` : ''}

Write the article now. Do NOT include frontmatter — just the markdown body starting with the headline.`,
      },
    ],
  });

  return message.content[0].text;
}

async function createArticleDraft(topic, slug, body, tags) {
  // Extract the first paragraph as excerpt
  const lines = body.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const excerpt = lines[0]?.trim().slice(0, 200) || topic;

  await notion.pages.create({
    parent: { database_id: ARTICLES_DB },
    properties: {
      Title: { title: [{ text: { content: topic } }] },
      Slug: { rich_text: [{ text: { content: slug } }] },
      Status: { select: { name: 'Review' } },
      Date: { date: { start: new Date().toISOString().split('T')[0] } },
      Tags: { multi_select: tags.map((t) => ({ name: t })) },
      Excerpt: { rich_text: [{ text: { content: excerpt } }] },
      Body: { rich_text: [{ text: { content: body.slice(0, 2000) } }] },
      Author: { rich_text: [{ text: { content: 'AI Agent' } }] },
      'Source Topic': { rich_text: [{ text: { content: topic } }] },
    },
  });
}

async function updateTopicStatus(pageId, status) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      Status: { select: { name: status } },
    },
  });
}

async function main() {
  console.log('🤖 Content Agent starting...\n');

  const topics = await getQueuedTopics();
  console.log(`📋 Found ${topics.length} queued topics\n`);

  if (topics.length === 0) {
    console.log('Nothing to process. Add topics to the queue first.');
    return;
  }

  for (const topic of topics) {
    const props = topic.properties;
    const title = richTextToPlain(props.Topic?.title || []);
    const summary = richTextToPlain(props.Summary?.rich_text || []);
    const niche = props.Niche?.select?.name || 'Tech';
    const slug = slugify(title);

    console.log(`✍️  Drafting: "${title}"`);

    try {
      // Generate article via Claude
      const body = await generateArticle(title, summary);
      console.log(`   ✅ Generated ${body.length} chars`);

      // Determine tags from niche
      const tags = [niche];

      // Create draft in Articles DB
      await createArticleDraft(title, slug, body, tags);
      console.log(`   📝 Saved to Articles DB with status 'Review'`);

      // Update topic status
      await updateTopicStatus(topic.id, 'Done');
      console.log(`   🏁 Topic marked as 'Done'\n`);
    } catch (error) {
      console.error(`   ❌ Error processing "${title}":`, error.message);
    }
  }

  console.log('🎉 Content Agent finished!');
}

main().catch(console.error);
