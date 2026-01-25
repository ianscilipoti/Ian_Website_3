import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/index.md', base: './src/content/projects' }),
  schema: ({ image }) => z.object({
    projectId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    previewImg: image().optional(),
    skills: z.array(z.string()).optional(),
    order: z.number().optional(),
    color: z.enum(['purple', 'green', 'blue', 'orange']).optional(),
    date: z.number().optional()
  }),
});

export const collections = { projects };
