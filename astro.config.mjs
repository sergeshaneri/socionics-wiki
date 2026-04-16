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
					label: 'Типы',
					autogenerate: { directory: 'types' },
				},
				{
					label: 'Концепты',
					autogenerate: { directory: 'concepts' },
				},
				{
					label: 'Отношения',
					autogenerate: { directory: 'relations' },
				},
				{
					label: 'English',
					autogenerate: { directory: 'english' },
				},
				{
					label: 'Книги Чурюмова',
					items: [
						{ label: 'О книгах', slug: 'books' },
						{
							label: 'БЛИН — Том 1',
							autogenerate: { directory: 'books/blin-1' },
						},
						{
							label: 'БЛИН — Том 2',
							autogenerate: { directory: 'books/blin-2' },
						},
						{
							label: 'Улыбка',
							autogenerate: { directory: 'books/ulybka' },
						},
					],
				},
			],
			lastUpdated: true,
			customCss: ['./src/styles/custom.css'],
		}),
	],
});
