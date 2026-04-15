// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://sergeshaneri.github.io/socionics-wiki',
	base: '/socionics-wiki',
	output: 'static',
	integrations: [
		starlight({
			title: 'Socionics Wiki',
			description: 'Wiki about socionics',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/sergeshaneri/socionics-wiki' }],
			sidebar: [
				{
					label: 'Introduction',
					items: [
						{ label: 'About Socionics', slug: 'index' },
					],
				},
				{
					label: 'Types',
					autogenerate: { directory: 'types' },
				},
				{
					label: 'Concepts',
					autogenerate: { directory: 'concepts' },
				},
				{
					label: 'Relations',
					autogenerate: { directory: 'relations' },
				},
			],
			lastUpdated: true,
		}),
	],
});
