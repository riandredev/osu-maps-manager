import { z } from 'zod';

export const beatmapsetSchema = z.object({
  id: z.number().int().positive(),
  beatmapId: z.number().int().positive().nullable().default(null),
  artist: z.string().min(1),
  title: z.string().min(1),
  collections: z.array(z.string().min(1)).default([]),
  notes: z.string().default(''),
});

export const manifestSchema = z.object({
  version: z.literal(1),
  beatmapsets: z.array(beatmapsetSchema),
});

export type Beatmapset = z.infer<typeof beatmapsetSchema>;
export type Manifest = z.infer<typeof manifestSchema>;
