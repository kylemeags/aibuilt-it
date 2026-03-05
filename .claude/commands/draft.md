# /draft — Write Articles from the Notion Queue

Write article drafts from queued topics in the Notion Topic Queue.

## Steps

1. First, read the queue to see what topics are available:
```bash
cd /Users/kylemeags/Claude/aibuilt-it && node agents/read-queue.js --limit 5
```

2. For each queued topic in the output, write a full article following the guidelines in `agents/templates/article-guidelines.md`. Read that file first to understand the voice, structure, and requirements.

3. For each topic, determine the appropriate content structure based on its `contentType`:
   - `case-study`: Problem → Tool → Implementation → Results → Takeaways
   - `tool-review`: What It Does → How It Works → Best For → Pricing → Verdict
   - `how-to`: Goal → Prerequisites → Steps → Tips → Next Steps
   - `news`: What Happened → Why It Matters → What's Next
   - `roundup`: Introduction → Tool Listings → Comparison → Recommendation

4. Set all frontmatter fields from the topic metadata:
   - `title`, `date` (today), `category`, `contentType`, `excerpt`
   - `toolName`, `toolUrl`, `sourceUrl`, `sourcePlatform` (from topic)
   - `heroImage` (first URL from topic's mediaUrls array, if any)
   - `tags` (2-4 relevant tags)
   - `author: "aibuilt.it"`

5. Save each article to: `src/content/articles/{slug}.md`

6. After writing each article, mark the topic as done:
```bash
node agents/mark-written.js {topic-id}
```

7. Report what was written — list the articles with their titles and file paths.

## Important Rules
- Read `agents/templates/article-guidelines.md` FIRST before writing
- Use the topic's `sourceUrl` to understand context — visit it if needed
- Use the topic's `mediaUrls` for heroImage and inline screenshots
- Write 600-1200 words depending on content type
- No AI clichés — be specific and concrete
- Include real tool links and source attribution
