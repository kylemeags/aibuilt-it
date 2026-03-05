# Article Writing Guidelines — aibuilt.it

## Voice & Tone
- Conversational, authoritative, zero jargon
- Write like you're explaining to a smart friend who runs a business
- Be specific and concrete — avoid vague claims
- Show enthusiasm for genuinely useful AI implementations
- Be skeptical of hype — focus on what actually works

## Audience
Business owners, marketers, entrepreneurs, and non-technical operators.
NOT developers, researchers, or ML engineers.

## Content Types & Structures

### Case Study (800–1200 words)
1. **The Problem** — What challenge did the business face?
2. **The Tool** — What AI tool did they use? (Name + link)
3. **The Implementation** — How did they set it up? Step-by-step.
4. **The Results** — Specific numbers: revenue, time saved, conversions, etc.
5. **Key Takeaways** — 3-5 actionable lessons for the reader

### Tool Review (600–1000 words)
1. **What It Does** — Clear explanation of the tool's purpose
2. **How It Works** — Walkthrough of the user experience
3. **Best For** — Who should use this tool?
4. **Pricing** — Cost breakdown
5. **Verdict** — Honest assessment with pros/cons

### How-To Guide (800–1200 words)
1. **Goal** — What the reader will accomplish
2. **Prerequisites** — What they need before starting
3. **Steps** — Numbered, clear instructions with screenshots
4. **Tips & Gotchas** — Common mistakes to avoid
5. **Next Steps** — What to do after completing the guide

### News Article (600–800 words)
1. **What Happened** — The news in 2-3 sentences
2. **Why It Matters** — Context and implications for businesses
3. **What's Next** — Future outlook or actions readers should consider

### Roundup (1000–1500 words)
1. **Introduction** — The category/problem space
2. **Tool Listings** — 5-10 tools, each with name, description, best for, pricing
3. **Comparison** — Quick comparison table
4. **Recommendation** — Top pick and why

## Frontmatter Requirements

Every article MUST include these frontmatter fields:

```yaml
---
title: "Exact article title"
date: YYYY-MM-DD
tags: ["tag1", "tag2"]
excerpt: "1-2 sentence compelling summary (max 160 chars for SEO)"
author: "aibuilt.it"
category: "one-of-8-categories"
contentType: "case-study|tool-review|how-to|news|roundup"
toolName: "Tool Name"          # if applicable
toolUrl: "https://tool.com"    # if applicable
sourceUrl: "https://source..."  # original discussion URL
sourcePlatform: "reddit|hackernews|producthunt|twitter|other"
heroImage: "https://r2-url..."  # from topic's Media URLs
---
```

### Category Options
- `marketing-seo` — Marketing & SEO
- `video-creative` — Video & Creative
- `sales-crm` — Sales & CRM
- `automation` — Automation & Workflows
- `writing-content` — Writing & Content
- `customer-support` — Customer Support
- `data-analytics` — Data & Analytics
- `ai-news` — AI News

## Media & Source Attribution Rules

### Hero Images
- Every article MUST set `heroImage` in frontmatter
- Use the captured R2 image URL from the topic's Media URLs field
- If no captured image exists, omit heroImage (the layout handles missing images)

### Inline Images
- Use standard markdown: `![Alt text describing the image](image-url)`
- At least one inline image for case studies (tool screenshot or result)
- Descriptive alt text for accessibility and SEO

### Source Attribution
- Case studies MUST set `toolName`, `toolUrl`, `sourceUrl`, `sourcePlatform`
- Mention the tool by name with a link early in the article
- Include "Originally shared on [Platform]" context naturally in the text
- The layout automatically adds source attribution at the bottom

### Video Embeds
- If the topic has a video URL, set `videoUrl` in frontmatter
- The layout renders it as a responsive iframe

## Writing Rules

1. **Lead with value** — First sentence should hook the reader
2. **Use specific numbers** — "$12,000/month in savings" not "significant cost reduction"
3. **Short paragraphs** — 2-4 sentences max
4. **Subheadings every 150-200 words** — Make it scannable
5. **No AI clichés** — Avoid "revolutionize", "game-changer", "cutting-edge", "leverage"
6. **Link to tools** — Always hyperlink tool names to their websites
7. **Internal links** — Reference existing articles on aibuilt.it when relevant
8. **No frontmatter in the body** — The body starts with the first heading or paragraph

## File Naming

Save articles as: `src/content/articles/{slug}.md`
Where slug = lowercase title, spaces to hyphens, no special chars.
Example: `how-one-agency-used-jasper-to-10x-output.md`
