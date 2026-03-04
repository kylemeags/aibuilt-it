---
title: Tailwind CSS Tips and Tricks
date: 2024-03-02
tags: [tailwind, css]
excerpt: Practical tips for writing better Tailwind CSS and building responsive layouts.
---

# Tailwind CSS Tips and Tricks

Tailwind CSS is a utility-first framework that lets you build modern designs without leaving your HTML.

## Mobile-First Approach

Always design for mobile first. Tailwind's responsive prefixes make this easy:

```html
<!-- Base styles for mobile -->
<div class="text-sm p-4">
  <!-- Tablet and up -->
  <div class="md:text-base md:p-6">
    <!-- Large screens -->
    <div class="lg:text-lg lg:p-8">
      Content
    </div>
  </div>
</div>
```

## Dark Mode Support

Enable dark mode in your `tailwind.config.js` and use the `dark:` prefix:

```html
<div class="bg-white dark:bg-gray-900">
  Content
</div>
```

## Custom Components

Use `@apply` to create reusable component classes when needed, but keep it minimal for better maintainability.
