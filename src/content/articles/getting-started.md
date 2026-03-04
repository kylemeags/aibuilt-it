---
title: Getting Started with Astro
date: 2024-03-01
tags: [astro, web]
excerpt: Learn the basics of building fast, static websites with Astro.
---

# Getting Started with Astro

Astro is a modern web framework for building fast, content-focused websites. It ships zero JavaScript by default, making your sites incredibly fast.

## Why Astro?

- **Fast by default** - No JavaScript sent to the browser unless you need it
- **Content-focused** - Built for content-heavy sites like blogs
- **Flexible** - Use your favorite JavaScript framework only where needed
- **Developer experience** - Great tooling and documentation

## Create your first page

Simply add files to the `src/pages/` directory and Astro will create routes automatically.

```astro
---
// src/pages/index.astro
---

<html>
  <body>
    <h1>Welcome to my site!</h1>
  </body>
</html>
```

Learn more in the [official docs](https://docs.astro.build).
