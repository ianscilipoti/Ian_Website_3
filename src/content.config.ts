import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/index.mdx', base: './src/content/projects' }),
  schema: ({ image }) => z.object({
    projectId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    previewImg: image().optional(),
    skills: z.array(z.string()).optional(),
    color: z.enum(['purple', 'green', 'blue', 'orange']).optional(),
    date: z.number().optional()
  }),
});

console.log(projects);

export const collections = { projects };
