# /publish — Commit and Deploy New Articles

Stage, commit, and push new article files to trigger Cloudflare Pages deployment.

## Steps

1. Check what new or modified article files exist:
```bash
cd /Users/kylemeags/Claude/aibuilt-it && git status src/content/articles/
```

2. If there are new or modified articles, verify they build correctly:
```bash
npm run build
```

3. If the build succeeds, stage the article files:
```bash
git add src/content/articles/
```

4. Create a descriptive commit message listing the articles:
```bash
git commit -m "Publish N article(s): brief titles"
```

5. Push to trigger Cloudflare auto-deploy:
```bash
git push origin main
```

6. Report:
   - Which articles were published
   - That the Cloudflare deploy has been triggered
   - The URLs where articles will be available (e.g., https://aibuilt.it/{category}/{slug}/)
