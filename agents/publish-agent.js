#!/usr/bin/env node
/**
 * publish-agent.js
 *
 * Queries 'Approved' articles from Notion,
 * creates markdown files in src/content/articles/,
 * commits and pushes to GitHub (triggers Cloudflare auto-deploy),
 * and updates Notion status to 'Published'.
 *
 * Usage: node agents/publish-agent.js
 */

import { config } from 'dotenv';
config({ override: true });
import { Client } from '@notionhq/client';
import simpleGit from 'simple-git';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const ARTICLES_DB = process.env.NOTION_ARTICLES_DB;

const CONTENT_DIR = join(process.cwd(), 'src', 'content', 'articles');
const git = simpleGit(process.cwd());

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

async function getApprovedArticles() {
  const response = await notion.databases.query({
    database_id: ARTICLES_DB,
    filter: {
      property: 'Status',
      select: { equals: 'Approved' },
    },
  });
  return response.results;
}

function buildMarkdown(article) {
  const props = article.properties;
  const title = richTextToPlain(props.Title?.title || []);
  const slug = richTextToPlain(props.Slug?.rich_text || []) || slugify(title);
  const date = props.Date?.date?.start || new Date().toISOString().split('T')[0];
  const tags = (props.Tags?.multi_select || []).map((t) => t.name);
  const excerpt = richTextToPlain(props.Excerpt?.rich_text || []);
  const body = richTextToPlain(props.Body?.rich_text || []);
  const author = richTextToPlain(props.Author?.rich_text || []) || 'aibuilt.it';

  const frontmatter = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `date: ${date}`,
    `tags: [${tags.map((t) => `"${t}"`).join(', ')}]`,
    `excerpt: "${excerpt.replace(/"/g, '\\"')}"`,
    `author: "${author}"`,
    '---',
  ].join('\n');

  return { slug, content: `${frontmatter}\n\n${body}\n` };
}

async function updateNotionStatus(pageId, status) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      Status: { select: { name: status } },
    },
  });
}

async function main() {
  console.log('🚀 Publish Agent starting...\n');

  // Ensure content directory exists
  if (!existsSync(CONTENT_DIR)) {
    mkdirSync(CONTENT_DIR, { recursive: true });
  }

  // Get approved articles
  const articles = await getApprovedArticles();
  console.log(`📋 Found ${articles.length} approved articles\n`);

  if (articles.length === 0) {
    console.log('No approved articles to publish. Approve some articles in Notion first.');
    return;
  }

  const publishedFiles = [];

  for (const article of articles) {
    const props = article.properties;
    const title = richTextToPlain(props.Title?.title || []);

    try {
      const { slug, content } = buildMarkdown(article);
      const filename = `${slug}.md`;
      const filepath = join(CONTENT_DIR, filename);

      writeFileSync(filepath, content, 'utf-8');
      publishedFiles.push(filepath);
      console.log(`   📝 Created: ${filename}`);
    } catch (error) {
      console.error(`   ❌ Error processing "${title}":`, error.message);
    }
  }

  if (publishedFiles.length === 0) {
    console.log('\nNo files were created. Nothing to push.');
    return;
  }

  // Git commit and push
  console.log('\n📦 Committing and pushing to GitHub...');
  try {
    await git.add(publishedFiles);
    await git.commit(`Publish ${publishedFiles.length} article(s) from Notion\n\nArticles published via publish-agent.js`);
    await git.push('origin', 'main');
    console.log('   ✅ Pushed to GitHub! Cloudflare deploy will start automatically.\n');
  } catch (error) {
    console.error('   ❌ Git push failed:', error.message);
    console.log('   You may need to set up git credentials or check your remote.');
    return;
  }

  // Update Notion statuses
  console.log('📋 Updating Notion statuses...');
  for (const article of articles) {
    const title = richTextToPlain(article.properties.Title?.title || []);
    try {
      await updateNotionStatus(article.id, 'Published');
      console.log(`   ✅ "${title}" → Published`);
    } catch (error) {
      console.error(`   ❌ Failed to update "${title}":`, error.message);
    }
  }

  console.log(`\n🎉 Publish Agent finished! ${publishedFiles.length} article(s) deployed.`);
}

main().catch(console.error);
