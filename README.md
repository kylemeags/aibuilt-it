# aibuilt.it

**Real AI implementations. Real results.**

aibuilt.it publishes real-world AI implementation stories for non-technical audiences — business owners, marketers, entrepreneurs. We find people who actually built something with AI, and write up what they did, how it works, and whether it's worth your attention.

**Live site:** [https://aibuilt.it](https://aibuilt.it) (Cloudflare Pages)

---

## Tech Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Static site | Astro 4.16 | Content Collections, static output |
| Styling | Tailwind CSS 3.4 | "Obsidian Luxe" dark theme |
| Hosting | Cloudflare Pages | Auto-deploys on push to `main` |
| CMS | Notion | Two databases: Topic Queue + Articles |
| Scraping | Node.js agents | Reddit, HackerNews, ProductHunt, RSS |
| Content writing | Claude Code | Free via subscription (replaces paid API) |
| Media storage | Cloudflare R2 | Not yet configured — images use source URLs |

---

## Design System

**Theme:** "Obsidian Luxe" — dark backgrounds, glass-morphism cards, indigo `#6366f1` accent, white article body for readability.

- Base background: `#0a0a0a`
- Card surfaces: `rgba(255,255,255,0.03)` with `backdrop-blur(12px)`
- Card hover: indigo border glow + `translateY(-4px)`
- Fonts: `Instrument Sans` (display/headlines), `Inter` (body/UI)
- Article body: white background `#ffffff` with dark text for readability

**8 Categories:**

| Slug | Name | Color |
|------|------|-------|
| `marketing-seo` | Marketing & SEO | Emerald |
| `video-creative` | Video & Creative | Violet |
| `sales-crm` | Sales & CRM | Sky |
| `automation` | Automation & Workflows | Amber |
| `writing-content` | Writing & Content | Rose |
| `customer-support` | Customer Support | Teal |
| `data-analytics` | Data & Analytics | Cyan |
| `ai-news` | AI News | Orange |

**5 Content Types:** case-study, tool-review, how-to, news, roundup

**URL structure:** `/{category}/{slug}/` for articles, `/{category}/` for category pages, `/tag/{tag}/` for tag archives.

---

## Project Structure

```
aibuilt-it/
├── .claude/
│   └── commands/
│       ├── draft.md              # Claude Code drafting instructions
│       ├── publish.md            # Claude Code publish instructions
│       └── research.md           # Claude Code research instructions
├── agents/
│   ├── content-agent.js          # OLD: paid Claude API article writer
│   ├── research-agent.js         # Multi-source scraper orchestrator
│   ├── publish-agent.js          # Notion → .md → git push
│   ├── read-queue.js             # Output queued topics as JSON
│   ├── read-topic.js             # Output single topic as JSON
│   ├── mark-written.js           # Mark topic as Done in Notion
│   ├── sources/
│   │   ├── reddit.js             # Reddit JSON API (11 subreddits, free)
│   │   ├── hackernews.js         # HN Algolia API (free)
│   │   ├── producthunt.js        # PH GraphQL + web scraping (free tier)
│   │   └── rss.js                # RSS feed parser
│   ├── filters/
│   │   ├── relevance.js          # "Real implementation" scoring
│   │   └── dedup.js              # Dedup against existing Notion topics
│   ├── media/
│   │   └── capture.js            # Image download → resize → R2 upload
│   └── templates/
│       └── article-guidelines.md # Writing voice, structure, frontmatter rules
├── src/
│   ├── content/
│   │   ├── config.ts             # Astro content schema (all fields)
│   │   └── articles/             # All .md article files
│   ├── components/
│   │   ├── Header.astro          # Fixed glass-morphism nav
│   │   ├── Footer.astro          # Newsletter + link grid
│   │   ├── ArticleCard.astro     # Glass card (default + featured variants)
│   │   ├── CategoryBadge.astro   # Colored category pill
│   │   ├── ContentTypePill.astro # Content type indicator
│   │   ├── Breadcrumb.astro      # Breadcrumb nav
│   │   └── CaseStudyMeta.astro   # Tool info + source attribution box
│   ├── data/
│   │   ├── categories.ts         # 8 category definitions with colors
│   │   └── contentTypes.ts       # 5 content type definitions
│   ├── layouts/
│   │   ├── BaseLayout.astro      # HTML shell, fonts, dark chrome
│   │   └── ArticleLayout.astro   # Article page with prose styling
│   └── pages/
│       ├── index.astro           # Homepage (hero + featured + latest)
│       ├── [category]/
│       │   ├── index.astro       # Category listing
│       │   └── [slug].astro      # Article page
│       └── tag/
│           └── [tag].astro       # Tag archive
├── .env                          # API keys (not committed)
├── PIPELINE-GUIDE.md             # Detailed pipeline documentation
├── package.json
├── tailwind.config.mjs           # Dark theme config
└── astro.config.mjs              # Astro + Tailwind + Sitemap
```

---

## Content Pipeline

The pipeline has three stages: **Research** (scraping) → **Drafting** (writing) → **Publishing** (deploy).

### Stage 1: Research

Scrapes four sources for real AI implementation stories and pushes them to the Notion Topic Queue.

```bash
node agents/research-agent.js              # All sources
node agents/research-agent.js --reddit     # Reddit only
node agents/research-agent.js --hn         # HackerNews only
node agents/research-agent.js --ph         # ProductHunt only
node agents/research-agent.js --rss        # RSS only
node agents/research-agent.js --no-media   # Skip media capture
```

**Sources:**
- **Reddit** (free, no auth): 11 subreddits including r/SideProject, r/ChatGPT, r/Entrepreneur. Searches for "built", "automated", "workflow", etc. Filters by upvotes >= 10.
- **HackerNews** (free, no auth): Algolia API targeting "Show HN" posts — people showing what they built.
- **ProductHunt** (free tier): New AI tool launches. Currently returning 403 — falls back gracefully.
- **RSS** (free): Tech news feeds. Some feed URLs have gone stale.

**Relevance scoring:** Each item is scored on implementation signals (+30 for "built", "automated"), tool mentions (+25), results/metrics (+20), engagement (up to +30 for 500+ upvotes), and penalized for generic discussion (-20) or overly technical content (-15). Items above threshold get pushed to Notion.

**Output:** ~15 topics per run land in Notion Topic Queue with status "Queued", a relevance score, summary, and source URL.

### Stage 2: Drafting

There are two content creation workflows. The project is transitioning from A to B.

#### Option A: Paid Claude API (old, automated)

```bash
node agents/content-agent.js
```

Reads queued topics from Notion, sends each to the Claude API with a writing prompt, creates entries in the Notion Articles DB with status "Review". Costs money (Anthropic API credits). Produces 600-800 word articles. Body field is truncated to 2000 characters (Notion rich_text limit).

#### Option B: Claude Code (current, free, manual)

1. Run `node agents/read-queue.js --limit 10` to see queued topics
2. Claude Code reads the queue output and `agents/templates/article-guidelines.md`
3. Claude Code visits source URLs for research, writes 800-1200+ word articles
4. Saves articles as `src/content/articles/{slug}.md` with full frontmatter
5. Run `node agents/mark-written.js {topic-id}` to mark topics done

**Cost:** $0 — uses existing Claude subscription.

**Known gaps in Option B:**
- Articles are written as .md files but NOT synced to the Notion Articles DB
- No formal approval gate in Notion (you review .md files in your editor instead)
- The publish-agent.js is bypassed — you just git push directly
- See PIPELINE-GUIDE.md for full details on these gaps and how to address them

### Stage 3: Publishing

```bash
npm run build                    # Verify build succeeds
git add src/content/articles/    # Stage new articles
git commit -m "Publish: description"
git push origin main             # Triggers Cloudflare Pages deploy (~2 min)
```

Cloudflare Pages watches the `main` branch and auto-deploys on every push.

---

## Notion Databases

### Topic Queue (`NOTION_TOPIC_QUEUE_DB`)

The editorial inbox. Scraped topics land here with status "Queued".

**Working properties:** Topic (title), Status (select: Queued/Done), Source URL (url), Summary (rich_text), Score (number), Date Added (date), Niche (select)

**Planned but not yet added to Notion:** Category, Content Type, Source Platform, Tool Name, Tool URL, Has Results, Media URLs, Source Author. The research agent tries to set these and falls back gracefully when they don't exist. Add them to unlock full metadata.

### Articles DB (`NOTION_ARTICLES_DB`)

Where articles are tracked once written.

**Working properties:** Title (title), Slug (rich_text), Status (select: Review/Approved/Published), Date (date), Tags (multi_select), Excerpt (rich_text), Body (rich_text — 2000 char limit), Author (rich_text)

**Planned but not yet added:** Category, Content Type, Tool Name, Tool URL, Source URL, Source Platform, Hero Image. The publish-agent.js already has code to read these — they just need to exist in the database.

**Important:** The Body field uses Notion's rich_text type, which caps at 2000 characters. Full articles are 4000-7000+ characters. The canonical full content lives in the `.md` files on disk.

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Required
NOTION_TOKEN=your_notion_integration_token
NOTION_TOPIC_QUEUE_DB=your_topic_queue_database_id
NOTION_ARTICLES_DB=your_articles_database_id

# Only for old paid content pipeline (content-agent.js)
ANTHROPIC_API_KEY=your_anthropic_key

# Only for publish-agent.js automated git push
GITHUB_TOKEN=your_github_token
GITHUB_REPO=username/aibuilt-it

# Optional: Cloudflare R2 media storage (not yet configured)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=aibuilt-media
R2_PUBLIC_URL=

# Optional: ProductHunt API (falls back to web scraping)
PRODUCTHUNT_TOKEN=
```

---

## Getting Started

### Prerequisites

- Node.js 20+ (project uses ESM)
- A Notion integration with access to both databases
- Claude Code (for the free content creation workflow)

### Install & run

```bash
npm install
npm run dev          # Dev server at localhost:4321
npm run build        # Build static site to dist/
npm run preview      # Preview production build
```

### Add a new article manually

Create `src/content/articles/your-article-slug.md`:

```markdown
---
title: "Your Article Title"
date: 2026-03-04
tags: ["tag1", "tag2"]
excerpt: "A brief summary."
author: "aibuilt.it"
category: "automation"
contentType: "case-study"
toolName: "ToolName"
toolUrl: "https://tool-website.com"
sourceUrl: "https://reddit.com/r/SideProject/comments/..."
sourcePlatform: "reddit"
---

## Article content here

Write in markdown...
```

### Daily workflow

```bash
# 1. Scrape new topics
node agents/research-agent.js

# 2. Review queue in Notion — pick topics worth writing

# 3. Read queue in Claude Code
node agents/read-queue.js --limit 10

# 4. Write articles (Claude Code reads guidelines, visits sources, writes .md files)

# 5. Review .md files, then build and deploy
npm run build
git add src/content/articles/
git commit -m "Publish: brief description"
git push origin main

# 6. Mark topics done
node agents/mark-written.js <topic-id>
```

---

## npm Scripts

```bash
npm run dev        # Astro dev server (localhost:4321)
npm run build      # Build static site to dist/
npm run preview    # Preview built site
npm run research   # Run research-agent.js
npm run draft      # Run content-agent.js (old paid pipeline)
npm run publish    # Run publish-agent.js (Notion → .md → git push)
```

---

## Content Schema

Defined in `src/content/config.ts`. All frontmatter fields:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | Yes | Article headline |
| `date` | date | Yes | Publication date |
| `tags` | string[] | Yes | Topic tags |
| `excerpt` | string | Yes | 1-2 sentence summary |
| `author` | string | No | Default: "aibuilt.it" |
| `category` | enum | No | One of 8 categories |
| `contentType` | enum | No | case-study, tool-review, how-to, news, roundup |
| `toolName` | string | No | Name of tool reviewed |
| `toolUrl` | string | No | Tool website URL |
| `sourceUrl` | string | No | Original Reddit/HN/PH post |
| `sourcePlatform` | string | No | reddit, hackernews, producthunt |
| `featured` | boolean | No | Show in Editor's Picks |
| `heroImage` | string | No | Featured image URL |
| `mediaGallery` | string[] | No | Additional image URLs |
| `videoUrl` | string | No | Embedded video URL |
| `metaTitle` | string | No | SEO title override |
| `metaDescription` | string | No | SEO description override |
| `ogImage` | string | No | Open Graph image |
| `targetKeyword` | string | No | Primary SEO keyword |

---

## Known Issues & Remaining Work

### Known Issues

- **ProductHunt scraper returns 403** — blocked by PH. Falls back gracefully, returns 0 items.
- **Some RSS feeds return 404** — The Verge feed URL changed. Needs updating.
- **Reddit rate limiting** — Agent uses 500ms delays and retries on 429, but can still hit limits.
- **Notion schema gaps** — Both databases are missing expanded properties (Category, Content Type, etc.). Agent falls back to basic fields.
- **Media uses source URLs** — Without R2 configured, images reference external URLs that may break.
- **No Notion Articles DB sync in Option B workflow** — Claude Code writes .md files directly; Notion Articles DB has empty shells or no entries.

### Remaining Phases

**Phase 5: SEO Polish (not started)**
- JSON-LD structured data (Article, BreadcrumbList, SoftwareApplication schemas)
- OG image generation via Satori + sharp
- Cloudflare Web Analytics
- Related articles component
- Reading time utility

**Phase 6: Content & Launch (in progress)**
- Fill all 8 categories with 2-3+ articles each
- Google Rich Results Test validation
- Submit sitemap to Google Search Console
- Automated research scheduling (GitHub Actions or cron)

---

## Detailed Documentation

See [PIPELINE-GUIDE.md](./PIPELINE-GUIDE.md) for:
- Complete Notion database schemas with all planned properties
- Detailed comparison of both content pipelines (paid vs. free)
- The Body field 2000-character truncation problem and solutions
- Full account of what was built and what's still broken
- Step-by-step instructions for every pipeline stage
