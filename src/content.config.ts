import { defineCollection, z } from 'astro:content';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

export const SOCIONICS_CATEGORIES = [
	'meta',
	'formal',
	'semantic',
	'applied',
	'beginners',
	'draft',
	'ai',
] as const;
export type SocionicsCategory = (typeof SOCIONICS_CATEGORIES)[number];

const extendedSchema = z.object({
	categories: z.array(z.enum(SOCIONICS_CATEGORIES)).optional(),
});

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({ extend: extendedSchema }),
	}),
	i18n: defineCollection({
		loader: i18nLoader(),
		schema: i18nSchema(),
	}),
};
