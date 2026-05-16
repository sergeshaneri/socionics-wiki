// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import starlightSiteGraph from 'starlight-site-graph';
import remarkWikiLink from 'remark-wiki-link';
import { readFileSync } from 'node:fs';
import { buildPermalinkMap, normalizeSlug } from './src/lib/wiki-links.mjs';

const permalinkMap = buildPermalinkMap();

// Редиректы со старых путей (articles/, новое/) на новые. См. migration-redirects.json
const migrationRedirects = JSON.parse(
	readFileSync(new URL('./migration-redirects.json', import.meta.url), 'utf8'),
);

// https://astro.build/config
export default defineConfig({
	site: 'https://sergeshaneri.github.io/socionics-wiki',
	base: '/socionics-wiki',
	output: 'static',
	redirects: migrationRedirects,
	markdown: {
		remarkPlugins: [
			[
				remarkWikiLink,
				{
					aliasDivider: '|',
					wikiLinkClassName: 'internal-link',
					newClassName: 'is-broken',
					permalinks: [...permalinkMap.keys()],
					pageResolver: (name) => [normalizeSlug(name)],
					hrefTemplate: (permalink) =>
						permalinkMap.get(permalink) ?? `/socionics-wiki/${permalink}/`,
				},
			],
		],
	},
	integrations: [
		sitemap(),
		starlight({
			title: 'Фрактальная Соционика',
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
				// NB: starlight-site-graph 0.5 + zod v4 — при передаче ЛЮБЫХ options
				// валидация падает на `z.map()` schema (`sitemapConfig.styleRules`).
				// Поэтому конфигурируем граф через per-page frontmatter
				// (sitemap.include + graph.visible) — см. scripts/configure-hub-graph.mjs.
				starlightSiteGraph(),
			],
			components: {
				Head: './src/components/Head.astro',
				PageTitle: './src/components/PageTitle.astro',
				SocialIcons: './src/components/SiteSocialIcons.astro',
				Footer: './src/components/Footer.astro',
			},
			customCss: ['./src/styles/fonts.css', './src/styles/custom.css'],
			sidebar: [
				{ label: 'О Вики', slug: 'index' },
				{ label: 'Услуги', slug: 'services' },
				{ label: 'Отзывы', link: '/reviews/' },
				{ label: 'Контакты', slug: 'contact' },
				{
					label: 'Для начинающих',
					collapsed: true,
					autogenerate: { directory: 'beginners' },
				},
				{
					label: 'Типы',
					collapsed: true,
					autogenerate: { directory: 'types' },
				},
				{
					label: 'Теория',
					collapsed: true,
					items: [
						{
							label: 'Метасоционика',
							collapsed: true,
							autogenerate: { directory: 'theory/meta' },
						},
						{
							label: 'Формальная соционика',
							collapsed: true,
							autogenerate: { directory: 'theory/formal' },
						},
					],
				},
				{
					label: 'Информационные аспекты',
					collapsed: true,
					autogenerate: { directory: 'information-elements' },
				},
				{
					label: 'Функции',
					collapsed: true,
					autogenerate: { directory: 'functions' },
				},
				{
					label: 'Признаки',
					collapsed: true,
					autogenerate: { directory: 'signs' },
				},
				{
					label: 'Отношения',
					collapsed: true,
					autogenerate: { directory: 'relations' },
				},
				{
					label: 'Прикладное',
					collapsed: true,
					autogenerate: { directory: 'applied' },
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
