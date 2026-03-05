# aibuilt.it — Complete Pipeline Guide

Last updated: March 4, 2026

---

## What This Project Is

aibuilt.it is a content site that publishes real AI implementation stories for a non-technical audience — business owners, marketers, entrepreneurs. It runs on:

- **Astro 4.16** static site generator with Tailwind CSS 3.4
- **Cloudflare Pages** for hosting (auto-deploys when you push to `main`)
- **Notion** as a CMS (two databases: Topic Queue + Articles)
- **Node.js agents** for scraping, content generation, and publishing
- **Claude Code slash commands** for hands-on content creation

The design is "Obsidian Luxe" — dark theme, glass-morphism cards, indigo accents, with a white article body for readability. Articles live at `/{category}/{slug}/`.

---

## The Two Notion Databases

### 1. Topic Queue (`NOTION_TOPIC_QUEUE_DB`)

This is where scraped topics land. Think of it as your editorial inbox.

**Existing properties that work:**
- `Topic` (title) — The headline/title
- `Status` (select) — `Queued`, `Done`
- `Source URL` (url) — Link to the original Reddit/HN/PH post
- `Summary` (rich_text) — First ~2000 chars of the post
- `Score` (number) — Relevance score from the filter (higher = better)
- `Date Added` (date) — When it was scraped
- `Niche` (select) — Legacy field, set to "AI" as fallback

**Properties the code TRIES to set but DON'T EXIST yet:**
- `Category` (select) — marketing-seo, video-creative, sales-crm, automation, etc.
- `Content Type` (select) — case-study, tool-review, how-to, news, roundup
- `Source Platform` (select) — reddit, hackernews, producthunt, rss
- `Tool Name` (rich_text) — Name of the AI tool being discussed
- `Tool URL` (url) — Link to the tool's website
- `Has Results` (checkbox) — Whether the post includes metrics/results
- `Media URLs` (rich_text) — JSON array of captured image URLs
- `Source Author` (rich_text) — Reddit/HN username

The research agent gracefully falls back when these don't exist — topics still get created, you just lose the metadata. **You should add these properties to your Notion Topic Queue database.** The agent will automatically start populating them.

### 2. Articles DB (`NOTION_ARTICLES_DB`)

This is where articles live once they've been written.

**Existing properties that work:**
- `Title` (title) — Article headline
- `Slug` (rich_text) — URL slug
- `Status` (select) — `Review`, `Approved`, `Published`
- `Date` (date) — Publication date
- `Tags` (multi_select) — Article tags
- `Excerpt` (rich_text) — 1-2 sentence summary
- `Body` (rich_text) — The full article content (max 2000 chars in Notion)
- `Author` (rich_text) — Byline
- `Source Topic` (rich_text) — Legacy field from old content agent

**Properties the code TRIES to set but DON'T EXIST yet:**
- `Category` (select) — Same 8 options as Topic Queue
- `Content Type` (select) — case-study, tool-review, how-to, news, roundup
- `Tool Name` (rich_text) — Tool being reviewed
- `Tool URL` (url) — Tool website
- `Source URL` (url) — Original Reddit/HN post
- `Source Platform` (select) — reddit, hackernews, producthunt, etc.
- `Hero Image` (url or rich_text) — Featured image URL

**You should add these properties to your Notion Articles DB.** The publish agent already has code to read them — they just need to exist in the database.

---

## The Content Pipeline — Three Stages

### Stage 1: Research (Scraping)

**What runs:** `node agents/research-agent.js` (or Claude Code: type `/research` instructions)

**What it does:**
1. Scrapes 4 sources in parallel:
   - **Reddit** (free, no auth) — 11 subreddits, 7 search keywords, filters by upvotes ≥ 10
   - **HackerNews** (free, no auth) — Algolia API, 4 queries targeting "Show HN" and AI tool posts
   - **ProductHunt** (free tier) — GraphQL API if token set, otherwise web scraping. **Currently broken — PH returns 403.**
   - **RSS** (free) — 5 feed URLs per niche. Some feeds return 404 (The Verge).
2. Scores every item for "real implementation" relevance (see scoring below)
3. Deduplicates against existing Notion topics (title overlap + URL match)
4. Optionally captures media (downloads images, extracts OG images)
5. Pushes top 15 unique items to Notion Topic Queue with status `Queued`

**Relevance scoring breakdown:**
- +30: Implementation language in title ("built", "automated", "saved X hours")
- +25: Specific AI tool mentions (ChatGPT, Claude, Jasper, Zapier, etc.)
- +20: Results/metrics ($, %, hours, ROI)
- +15: Launch signals ("Show HN", "I built", "I made")
- +10/+20/+30: Engagement (upvotes 10+/100+/500+)
- -20: General discussion ("what do you think", "will AI")
- -15: Too technical ("fine-tune", "training loss", "CUDA")
- -10: Negative sentiment

**CLI options:**
```bash
node agents/research-agent.js              # All sources
node agents/research-agent.js --reddit     # Reddit only
node agents/research-agent.js --hn         # HackerNews only
node agents/research-agent.js --ph         # ProductHunt only
node agents/research-agent.js --rss        # RSS only
node agents/research-agent.js --no-media   # Skip media capture (faster)
```

**What you'll see in Notion after this:** New topics appear in Topic Queue with status "Queued", a relevance score, summary, and source URL.

**Known issues:**
- ProductHunt returns HTTP 403 (blocked). Returns 0 items gracefully.
- r/AItools sometimes returns 404 (subreddit may not exist anymore).
- The Verge RSS feed URL changed, returns 404.
- Reddit rate-limits aggressively. The agent uses 500ms delays and retries on 429.
- Without R2 configured, media URLs fall back to original source URLs (which may break or disappear).

---

### Stage 2: Drafting (Writing Articles)

**⚠️ THIS IS WHERE THE CURRENT PIPELINE HAS GAPS.**

There are TWO ways to draft articles, and they work differently:

#### Option A: Old Content Agent (Paid, Automated)

**What runs:** `node agents/content-agent.js`

**What it does:**
1. Reads ALL `Queued` topics from Notion Topic Queue
2. Sends each topic to Claude API (claude-sonnet-4-20250514) with a prompt
3. Creates a new page in Notion Articles DB with:
   - Status: `Review`
   - Body: The generated article content (truncated to 2000 chars — Notion limit)
   - Title, Slug, Date, Tags, Excerpt, Author
4. Marks the source topic as `Done`

**Cost:** Uses Anthropic API credits. Estimated $15-90/month depending on volume.

**What's good about this flow:**
- Fully automated — runs unattended
- Puts articles in Notion with Body populated so you can review them
- Sets status to `Review`, creating a natural approval gate

**What's bad about this flow:**
- Costs money (API calls)
- 600-800 word articles are thin — the user asked for more detailed content
- Body truncated to 2000 chars (Notion rich_text limit)
- Doesn't set the expanded schema fields (Category, Content Type, etc.)
- Generic prompt produces generic content

#### Option B: Claude Code Slash Commands (Free, Manual)

**What you do:** Open Claude Code in the project directory, then follow the `/draft` instructions.

**The intended workflow:**
1. Run `node agents/read-queue.js --limit 5` to see queued topics
2. Read `agents/templates/article-guidelines.md` for writing voice/structure
3. Claude Code writes articles based on the topic metadata and source URL
4. Save each article as `src/content/articles/{slug}.md`
5. Run `node agents/mark-written.js {topic-id}` for each topic

**Cost:** $0 — uses your existing Claude subscription.

**What's good about this flow:**
- Free
- You (or Claude Code) can visit source URLs for deeper research
- Articles can be 800-1200+ words with real substance
- Full frontmatter with all expanded fields
- You review articles in your editor before committing

**⚠️ WHAT'S BROKEN / MISSING in this flow:**

1. **Articles don't go into the Notion Articles DB.** The `/draft` workflow writes `.md` files directly to disk and marks topics as `Done`. It does NOT create entries in the Articles DB. This means:
   - Your Notion Articles DB doesn't know these articles exist
   - The Body column is empty (or the entry doesn't exist at all)
   - There's no `Review` → `Approved` workflow in Notion

2. **No approval gate.** The designed pipeline had: write → Review → human approves → Approved → publish. With the Claude Code flow, articles go from written → committed → pushed → live. The only "approval" is you reading the `.md` files in your editor before running the publish step. That might be fine — but it's different from the original Notion-based approval flow.

3. **The publish-agent.js is orphaned.** It reads `Approved` articles from Notion and creates `.md` files. But with the Claude Code flow, `.md` files are created directly, so publish-agent.js never runs. Instead, you just `git add/commit/push`.

4. **Today's session pushed articles to Notion Articles DB as an afterthought.** I created Notion entries with basic metadata (Title, Slug, Status=Published) but NO Body content and NO expanded fields. The entries exist but they're shells.

---

### Stage 3: Publishing (Deploy)

**What needs to happen:**
1. New `.md` files exist in `src/content/articles/`
2. Run `npm run build` to verify they compile (0 errors)
3. `git add` the article files
4. `git commit` with a descriptive message
5. `git push origin main` → Cloudflare Pages auto-deploys in ~2 minutes

**The `/publish` command** in `.claude/commands/publish.md` has these exact steps documented. However, it's a Claude Code custom command file — you reference it as instructions for Claude Code, not as a slash command you can invoke directly.

**The `publish-agent.js` script** does something different:
1. Reads `Approved` articles from Notion Articles DB
2. Builds markdown from Notion properties (including Body)
3. Git commits and pushes
4. Updates Notion status to `Published`

This was the original automated pipeline. It still works if you use Option A (content-agent.js) to draft articles and manually approve them in Notion. But it has nothing to do with Option B (Claude Code direct writing).

---

## What Actually Happened Today — A Truthful Account

### Phase 1 & 2: Design + Pages (done in previous session)
- Built the full Obsidian Luxe design system
- Created all components (Header, Footer, ArticleCard, CategoryBadge, etc.)
- Built all page routes (homepage, category pages, article pages, tag pages)
- Expanded content schema with category, contentType, tool/source fields
- Committed and pushed to Cloudflare Pages

### Phase 3: Research Agent Upgrade
- Installed `@aws-sdk/client-s3` and `sharp` dependencies
- Created 4 source modules: `reddit.js`, `hackernews.js`, `producthunt.js`, `rss.js`
- Created filter modules: `relevance.js` (scoring), `dedup.js` (Notion dedup)
- Created media capture module: `capture.js` (R2 upload with fallback)
- Rewrote `research-agent.js` as multi-source orchestrator
- Tested: 531 items scraped → 406 passed relevance → 386 unique → 15 pushed to Notion
- Topic Queue schema validation errors on new fields → graceful fallback worked

### Phase 4: Claude Code Content Pipeline
- Created helper scripts: `read-queue.js`, `mark-written.js`, `read-topic.js`
- Created article guidelines: `agents/templates/article-guidelines.md`
- Created command docs: `.claude/commands/research.md`, `draft.md`, `publish.md`
- Updated `publish-agent.js` to read expanded frontmatter fields

### Content Creation Session
- Ran research agent: 531 items from Reddit + HN + RSS (PH blocked)
- Read queue, selected 4 best "real build example" topics
- Fetched full Reddit post data + tool websites for research
- Wrote 4 detailed articles (800-1100 words each):
  1. PassportPhotoSnap case study (1,753 Reddit upvotes)
  2. Project Athena tool review (1,465 upvotes)
  3. ArtCraft film studio tool review (207 upvotes)
  4. RevoScale email finder tool review (459 upvotes)
- Saved as `.md` files → build verified (45 pages, 0 errors)
- Marked 4 topics as Done in Notion
- Pushed basic metadata to Notion Articles DB (no Body, no expanded fields)
- Git committed and pushed → Cloudflare deployed

---

## What Needs to Be Fixed

### Critical: Notion Schema Updates

**Topic Queue DB — Add these properties:**

| Property Name | Type | Options |
|---------------|------|---------|
| Category | Select | marketing-seo, video-creative, sales-crm, automation, writing-content, customer-support, data-analytics, ai-news |
| Content Type | Select | case-study, tool-review, how-to, news, roundup |
| Source Platform | Select | reddit, hackernews, producthunt, rss |
| Tool Name | Rich text | — |
| Tool URL | URL | — |
| Has Results | Checkbox | — |
| Media URLs | Rich text | — |
| Source Author | Rich text | — |

**Articles DB — Add these properties:**

| Property Name | Type | Options |
|---------------|------|---------|
| Category | Select | (same 8 options as above) |
| Content Type | Select | (same 5 options as above) |
| Tool Name | Rich text | — |
| Tool URL | URL | — |
| Source URL | URL | — |
| Source Platform | Select | reddit, hackernews, producthunt, twitter, other |
| Hero Image | URL | — |

Once you add these, the research agent and publish agent will automatically start using them — no code changes needed.

### Critical: Decide on Your Content Pipeline

You have two options. Pick one and commit to it.

**Option 1: Notion-Centered Pipeline (more structure, more overhead)**

```
Research Agent → Topic Queue (Queued)
         ↓
Content Agent OR Claude Code → Articles DB (Review)
         ↓ (body in Notion)
You review in Notion → change status to "Approved"
         ↓
Publish Agent → creates .md files → git push → Cloudflare
         ↓
Publish Agent → updates Notion status to "Published"
```

For this to work:
- The content drafting step (whether API or Claude Code) must push Body content to Notion
- Body is limited to 2000 chars in Notion rich_text — longer articles get truncated
- Alternatively, use Notion blocks (page content) instead of a rich_text property for body
- The publish-agent.js reads from Notion, so everything flows through it

**Option 2: File-First Pipeline (simpler, less Notion overhead)**

```
Research Agent → Topic Queue (Queued)
         ↓
Claude Code reads queue → writes .md files directly
         ↓
You review .md files in your editor
         ↓
git add/commit/push → Cloudflare deploys
         ↓
(Optional) Sync metadata to Notion Articles DB for tracking
```

For this to work:
- Accept that Notion Articles DB is a tracking dashboard, not the source of truth
- The `.md` files on disk are the canonical content
- You need a "sync to Notion" step if you want Articles DB populated (or skip it)
- publish-agent.js becomes unnecessary

**What we did today was Option 2, but without properly acknowledging it.** The articles live as `.md` files. Notion has shells without Body content.

### Important: The Body Field Problem

Notion's `rich_text` property has a 2000-character limit. Your articles are 4,000-7,000+ characters. This means:

- The old content-agent.js truncates Body to 2000 chars (line 80: `body.slice(0, 2000)`)
- Even if you fix everything else, Notion rich_text can't hold a full article
- The publish-agent.js reads Body from Notion, so it would get truncated articles

**Solutions:**
1. Use Notion page content (blocks) instead of a rich_text property for Body — this has no length limit but requires a different API approach
2. Accept truncation — 2000 chars is enough for Notion preview, full content lives in `.md` files
3. Go full File-First (Option 2 above) and don't rely on Notion for Body at all

### Nice-to-Have: R2 Media Storage

Currently not configured. Images referenced in articles point to original source URLs (Reddit preview images, OG images from tool sites), which may break or disappear.

To set up:
1. Create a Cloudflare R2 bucket called `aibuilt-media`
2. Add to `.env`:
   ```
   R2_ACCOUNT_ID=your_account_id
   R2_ACCESS_KEY_ID=your_r2_key
   R2_SECRET_ACCESS_KEY=your_r2_secret
   R2_BUCKET_NAME=aibuilt-media
   R2_PUBLIC_URL=https://your-r2-public-url
   ```
3. The media capture code (`agents/media/capture.js`) will automatically start uploading to R2

### Nice-to-Have: Scheduling

Options for automated daily research runs:

**GitHub Actions (recommended, free):**
```yaml
# .github/workflows/research.yml
name: Daily Research
on:
  schedule:
    - cron: '0 6 * * *'  # 6 AM UTC daily
jobs:
  research:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: node agents/research-agent.js
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
          NOTION_TOPIC_QUEUE_DB: ${{ secrets.NOTION_TOPIC_QUEUE_DB }}
```

**Local cron (simplest):**
```bash
# crontab -e
0 8 * * * cd /Users/kylemeags/Claude/aibuilt-it && /Users/kylemeags/.fnm/node-versions/v24.14.0/installation/bin/node agents/research-agent.js >> /tmp/research.log 2>&1
```

---

## File Map — What Lives Where

```
aibuilt-it/
├── .claude/
│   └── commands/
│       ├── draft.md          ← Instructions for /draft workflow
│       ├── publish.md        ← Instructions for /publish workflow
│       └── research.md       ← Instructions for /research workflow
├── agents/
│   ├── content-agent.js      ← OLD: Claude API article generator ($$$)
│   ├── research-agent.js     ← Multi-source scraper orchestrator
│   ├── publish-agent.js      ← Notion → .md → git push
│   ├── read-queue.js         ← Outputs queued topics as JSON
│   ├── read-topic.js         ← Outputs single topic as JSON
│   ├── mark-written.js       ← Marks topic as Done in Notion
│   ├── sources/
│   │   ├── reddit.js         ← Reddit JSON API scraper (11 subreddits)
│   │   ├── hackernews.js     ← HN Algolia API scraper
│   │   ├── producthunt.js    ← PH GraphQL + web scraping (currently 403)
│   │   └── rss.js            ← RSS feed parser (5 feeds per niche)
│   ├── filters/
│   │   ├── relevance.js      ← Scoring + content type/category classification
│   │   └── dedup.js          ← Dedup against existing Notion topics
│   ├── media/
│   │   └── capture.js        ← Image download → resize → R2 upload
│   └── templates/
│       └── article-guidelines.md  ← Voice, structure, frontmatter rules
├── src/
│   ├── content/
│   │   ├── config.ts         ← Astro content schema (all fields defined)
│   │   └── articles/         ← All .md article files (16 total)
│   ├── components/           ← Astro components (Header, Footer, ArticleCard, etc.)
│   ├── data/
│   │   ├── categories.ts     ← 8 category definitions with colors
│   │   └── contentTypes.ts   ← 5 content type definitions with pill colors
│   ├── layouts/
│   │   ├── BaseLayout.astro  ← HTML shell, fonts, dark chrome
│   │   └── ArticleLayout.astro  ← Article page with breadcrumbs, meta box, prose
│   └── pages/
│       ├── index.astro       ← Homepage
│       ├── [category]/
│       │   ├── index.astro   ← Category listing page
│       │   └── [slug].astro  ← Individual article page
│       └── tag/
│           └── [tag].astro   ← Tag archive page
├── .env                      ← API keys (NOTION_TOKEN, ANTHROPIC_API_KEY, etc.)
├── package.json              ← Dependencies and scripts
├── tailwind.config.mjs       ← Dark theme, fonts, custom colors
└── astro.config.mjs          ← Astro + Tailwind + Sitemap config
```

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NOTION_TOKEN` | Yes | Notion API integration token |
| `NOTION_TOPIC_QUEUE_DB` | Yes | Topic Queue database ID |
| `NOTION_ARTICLES_DB` | Yes | Articles database ID |
| `ANTHROPIC_API_KEY` | Only for content-agent.js | Claude API key (old paid pipeline) |
| `GITHUB_TOKEN` | For publish-agent.js | GitHub auth for git push |
| `GITHUB_REPO` | For publish-agent.js | Repo name (e.g. kylemeags/aibuilt-it) |
| `R2_ACCOUNT_ID` | No (media fallback) | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | No (media fallback) | R2 API key ID |
| `R2_SECRET_ACCESS_KEY` | No (media fallback) | R2 API secret |
| `R2_BUCKET_NAME` | No (media fallback) | R2 bucket name |
| `R2_PUBLIC_URL` | No (media fallback) | Public URL for R2 images |
| `PRODUCTHUNT_TOKEN` | No (web scraping fallback) | PH GraphQL API token |

---

## Daily Workflow — How to Use This Tomorrow

### Quick version (what works right now):

```bash
# 1. Scrape new topics
cd /Users/kylemeags/Claude/aibuilt-it
source ~/.zshrc
node agents/research-agent.js

# 2. Review queue in Notion — decide which topics are worth writing about

# 3. In Claude Code, read the queue:
node agents/read-queue.js --limit 10

# 4. Ask Claude Code to write articles from the best topics
#    (Claude reads guidelines, visits source URLs, writes .md files)

# 5. Review the .md files in your editor

# 6. Build to verify
npm run build

# 7. Commit and push
git add src/content/articles/
git commit -m "Publish N articles: brief descriptions"
git push origin main

# 8. Mark topics as done (for each topic ID)
node agents/mark-written.js <topic-id>
```

### What's missing from this workflow:

- **No Notion Articles DB sync.** Articles exist as files but not in your Articles DB (or exist as empty shells).
- **No approval gate.** You're approving by reviewing files before committing. If that's fine, great. If you want Notion-based approval, the pipeline needs rework.
- **No media hosting.** Article images reference external URLs that may break. Set up R2 to fix this.
- **Research runs manually.** Set up cron or GitHub Actions for automation.

---

## Content Currently on the Site

**16 total articles:**
- 12 old articles (generic AI news, from the original RSS-only pipeline)
- 4 new articles (real implementation stories, from today's session):
  1. `/automation/free-ai-passport-photo-tool-built-after-15-euro-ripoff/`
  2. `/automation/project-athena-save-game-feature-for-chatgpt/`
  3. `/video-creative/artcraft-open-source-ai-film-studio-desktop/`
  4. `/sales-crm/revoscale-unlimited-email-finder-cold-outreach/`

**Categories with content:**
- AI News: 12 articles
- Automation & Workflows: 2 articles
- Video & Creative: 1 article
- Sales & CRM: 1 article
- Marketing & SEO: 0
- Writing & Content: 0
- Customer Support: 0
- Data & Analytics: 0

---

## Remaining Plan Items (Phase 5 & 6)

From the original plan, these are NOT done yet:

### Phase 5: SEO Polish
- [ ] `src/components/JsonLd.astro` — Article + BreadcrumbList + SoftwareApplication schemas
- [ ] OG image generation (`src/pages/og/[...slug].png.ts`) via Satori + sharp
- [ ] Cloudflare Web Analytics script in BaseLayout
- [ ] `src/utils/related-articles.ts` + `RelatedArticles.astro` component
- [ ] `src/utils/reading-time.ts` utility

### Phase 6: Content & Launch
- [ ] Fill all 8 categories with at least 2-3 articles each
- [ ] Verify JSON-LD with Google Rich Results Test
- [ ] Submit sitemap to Google Search Console
- [ ] Set up automated research scheduling

---

## Quick Reference: npm Scripts

```bash
npm run dev        # Start Astro dev server (localhost:4321)
npm run build      # Build static site to dist/
npm run preview    # Preview built site
npm run research   # Run research-agent.js (old alias)
npm run draft      # Run content-agent.js (old paid pipeline)
npm run publish    # Run publish-agent.js (Notion → .md → git push)
```

Note: `npm run draft` runs the OLD content-agent.js (paid API). The new Claude Code workflow doesn't have an npm script — it's driven by you in the Claude Code terminal.
