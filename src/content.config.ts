import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const weddingDetails = defineCollection({
  loader: glob({ pattern: 'wedding-details.md', base: './src/content' }),
  schema: z.object({
    ceremony: z.object({
      name: z.string(),
      address: z.string(),
      arrivalNote: z.string(),
      description: z.string(),
      directionsUrl: z.url(),
    }),
    reception: z.object({
      name: z.string(),
      address: z.string(),
      arrivalNote: z.string(),
      description: z.string(),
      directionsUrl: z.url(),
    }),
    timeline: z.array(z.object({
      time: z.string(),
      title: z.string(),
      detail: z.string(),
      featured: z.boolean().optional(),
    })).min(1),
  }),
});

const visitorsGuide = defineCollection({
  loader: glob({ pattern: 'visitors-guide.md', base: './src/content' }),
  schema: z.object({
    favourites: z.array(z.object({
      name: z.string(),
      category: z.string(),
      area: z.string(),
      badge: z.string().optional(),
      description: z.string(),
      image: z.union([z.url(), z.string().startsWith('/')]),
      imageAlt: z.string(),
    })).min(1),
  }),
});

export const collections = { weddingDetails, visitorsGuide };
