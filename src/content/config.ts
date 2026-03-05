import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()),
    excerpt: z.string(),
    author: z.string().optional().default('aibuilt.it'),

    // Category & content type
    category: z.enum([
      'marketing-seo',
      'video-creative',
      'sales-crm',
      'automation',
      'writing-content',
      'customer-support',
      'data-analytics',
      'ai-news',
    ]).default('ai-news'),
    contentType: z.enum([
      'case-study',
      'tool-review',
      'how-to',
      'news',
      'roundup',
    ]).default('news'),

    // Tool & source attribution
    toolName: z.string().optional(),
    toolUrl: z.string().url().optional(),
    sourceUrl: z.string().url().optional(),
    sourcePlatform: z.enum(['reddit', 'hackernews', 'producthunt', 'twitter', 'other']).optional(),

    // Media
    heroImage: z.string().optional(),
    mediaGallery: z.array(z.string()).optional(),
    videoUrl: z.string().optional(),

    // SEO & display
    featured: z.boolean().default(false),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    ogImage: z.string().optional(),
    targetKeyword: z.string().optional(),
  }),
});

export const collections = {
  articles,
};
