// @ts-check
try {
	process.env.NODE_NO_WARNINGS = '1';
} catch (e) {}
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightSiteGraph from 'starlight-site-graph';
import remarkWikiLink from 'remark-wiki-link';

// https://astro.build/config
export default defineConfig({
	site: 'https://sergeshaneri.github.io/socionics-wiki',
	base: '/socionics-wiki',
	output: 'static',
	vite: {
		define: {
			'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
		},
	},
	integrations: [
		starlight({
			title: 'Фрактальная Соционика Вики',
			description: 'Wiki about socionics',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/sergeshaneri/socionics-wiki' }],
			lastUpdated: true,
			locales: {
				root: {
					label: 'Русский',
					lang: 'ru',
				},
			},
			plugins: [
				starlightSiteGraph(),
			],
			customCss: ['./src/styles/custom.css'],
			markdown: {
				remarkPlugins: [
					[
						remarkWikiLink,
						{
							aliasDivider: '|',
							wikiLinkClassName: 'internal-link',
							hrefTemplate: (permalink) => `/socionics-wiki/types/${permalink.toLowerCase().replace(/\s+/g, '-')}/`,
						},
					],
				],
			},
			sidebar: [
				{
					label: 'Фрактальная Соционика Вики',
					items: [{ label: 'О Вики', slug: 'index' }],
				},
				{
					label: 'Статьи',
					collapsed: true,
					autogenerate: { directory: 'articles' },
				},
				{
					label: 'Типы',
					collapsed: true,
					autogenerate: { directory: 'types' },
				},
				{
					label: 'Концепты',
					collapsed: true,
					autogenerate: { directory: 'concepts' },
				},
				{
					label: 'Отношения',
					collapsed: true,
					autogenerate: { directory: 'relations' },
				},
				{
					label: 'English',
					collapsed: true,
					autogenerate: { directory: 'english' },
				},
				{
					label: 'Видео',
					collapsed: true,
					autogenerate: { directory: 'video' },
				},
				{
					label: 'Аудио',
					collapsed: true,
					autogenerate: { directory: 'audio' },
				},
				{
					label: 'Новое',
					collapsed: true,
					autogenerate: { directory: 'новое' },
				},
				{
					label: 'Книги Чурюмова',
					collapsed: true,
					items: [
						{ label: 'О книгах', slug: 'books' },
						{
							label: 'БЛИН — Том 1',
							collapsed: true,
							autogenerate: { directory: 'books/blin-1' },
						},
						{
							label: 'БЛИН — Том 2',
							collapsed: true,
							autogenerate: { directory: 'books/blin-2' },
						},
						{
							label: 'Улыбка',
							collapsed: true,
							autogenerate: { directory: 'books/ulybka' },
						},
					],
				},
			],
		}),
	],
});
