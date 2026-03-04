# aibuilt-it

A minimal, fast blog built with Astro, Tailwind CSS, and Content Collections.

## Features

- ⚡ **Static output** - Pre-rendered HTML for maximum speed
- 📝 **Content Collections** - Organized article structure with schema validation
- 🎨 **Tailwind CSS** - Utility-first styling for responsive design
- 📱 **Mobile-first** - Clean, minimal design that works on all devices
- ⚙️ **Zero JS** - No JavaScript frameworks by default
- 🚀 **Fast** - Fast builds and instant page loads

## Project Structure

```
aibuilt-it/
├── src/
│   ├── content/
│   │   ├── articles/          # Article content (markdown)
│   │   └── config.ts          # Content collection schema
│   ├── layouts/
│   │   ├── BaseLayout.astro   # Main layout
│   │   └── ArticleLayout.astro# Article template
│   ├── pages/
│   │   ├── index.astro        # Homepage (article list)
│   │   └── [slug].astro       # Article page template
│   └── utils/
│       └── date.ts            # Date formatting utility
├── astro.config.mjs           # Astro configuration
├── tailwind.config.mjs        # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── package.json
```

## Getting Started

### Install dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

Open `http://localhost:3000` and start editing. Changes will reload instantly.

### Add new articles

Create a new markdown file in `src/content/articles/`:

```markdown
---
title: My Article Title
date: 2024-03-04
tags: [tag1, tag2]
excerpt: A brief summary of the article.
---

# My Article Title

Article content goes here...
```

The file slug becomes the URL (e.g., `my-article.md` → `/my-article`).

### Build for production

```bash
npm run build
```

Output is generated in the `dist/` folder.

### Preview production build

```bash
npm run preview
```

## Customization

### Colors and styling

Edit `tailwind.config.mjs` to customize colors and fonts.

### Layout

Modify `src/layouts/BaseLayout.astro` to change the header, footer, or main structure.

### Add more pages

Create new `.astro` files in `src/pages/` - they automatically become routes.

## Learn more

- [Astro Documentation](https://docs.astro.build)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Content Collections](https://docs.astro.build/en/guides/content-collections/)
