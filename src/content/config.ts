import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()),
    excerpt: z.string(),
    author: z.string().optional().default('aibuilt.it'),
  }),
});

export const collections = {
  articles,
};
