# /research — Run the Multi-Source Research Agent

Run the research agent to scrape Reddit, HackerNews, ProductHunt, and RSS feeds for AI implementation stories.

## Steps

1. Run the research agent:
```bash
cd /Users/kylemeags/Claude/aibuilt-it && node agents/research-agent.js
```

2. Report what was found:
   - How many items were scraped from each source
   - How many passed the relevance filter
   - How many were new (not duplicates)
   - How many were pushed to the Notion Topic Queue

3. If there were errors, suggest fixes (e.g., network issues, missing env vars)

## Options

You can also run individual sources:
- `node agents/research-agent.js --reddit` — Reddit only
- `node agents/research-agent.js --hn` — HackerNews only
- `node agents/research-agent.js --ph` — ProductHunt only
- `node agents/research-agent.js --rss` — RSS only
- `node agents/research-agent.js --no-media` — Skip media capture (faster)
