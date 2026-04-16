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
			title: 'Фрактальная Соционика Вики',
			description: 'Wiki about socionics',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/sergeshaneri/socionics-wiki' }],
			sidebar: [
				{
					label: 'Фрактальная Соционика Вики',
					items: [
						{ label: 'О Вики', slug: 'index' },
					],
				},
				{
					label: 'Статьи',
					autogenerate: { directory: 'articles' },
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
				{
					label: 'English',
					autogenerate: { directory: 'english' },
				},
				{
					label: 'Книги Чурюмова',
					autogenerate: { directory: 'books' },
				},
			],
			lastUpdated: true,
			customCss: ['./src/styles/custom.css'],
		}),
	],
});
