/**
 * Backlinks + Related для wiki-статей.
 *
 * Однократно (lazy) обходит коллекцию docs, парсит body на:
 *   - [[wiki-link]] / [[wiki-link|alias]]
 *   - [text](/socionics-wiki/path/) — абсолютные внутренние ссылки
 *
 * И строит:
 *   - backlinks: targetId → entries, которые на него ссылаются
 *   - related: считается ad-hoc по пересечению categories / общей директории
 *
 * Использование: см. Backlinks.astro в Footer.
 */

import { getCollection, type CollectionEntry } from 'astro:content';
import { normalizeSlug } from './wiki-links.mjs';

type DocEntry = CollectionEntry<'docs'>;

interface Cache {
	all: DocEntry[];
	byId: Map<string, DocEntry>;
	byTitleSlug: Map<string, DocEntry>;
	backlinks: Map<string, DocEntry[]>;
}

let cache: Cache | null = null;

async function build(): Promise<Cache> {
	if (cache) return cache;
	const all = await getCollection('docs');
	const byId = new Map<string, DocEntry>();
	const byTitleSlug = new Map<string, DocEntry>();
	for (const e of all) {
		byId.set(e.id, e);
		const titleSlug = normalizeSlug(e.data.title);
		if (titleSlug && !byTitleSlug.has(titleSlug)) byTitleSlug.set(titleSlug, e);
	}

	const backlinks = new Map<string, DocEntry[]>();
	const addBacklink = (targetId: string, source: DocEntry) => {
		if (targetId === source.id) return;
		const list = backlinks.get(targetId);
		if (list) {
			if (!list.includes(source)) list.push(source);
		} else {
			backlinks.set(targetId, [source]);
		}
	};

	for (const source of all) {
		const body = source.body ?? '';
		if (!body) continue;

		// [[wikilink]] / [[wikilink|alias]]
		for (const m of body.matchAll(/\[\[([^\]]+?)\]\]/g)) {
			const raw = m[1].split('|')[0].trim().split('#')[0];
			const slug = normalizeSlug(raw);
			if (!slug) continue;
			// Сначала ищем по нормализованному id (имя файла), затем по title
			const target =
				byId.get(slug) ?? findIdBySegment(byId, slug) ?? byTitleSlug.get(slug);
			if (target) addBacklink(target.id, source);
		}

		// [text](/socionics-wiki/path/)
		for (const m of body.matchAll(/\]\((\/socionics-wiki\/[^)\s#]+?)\/?(?:#[^)\s]*)?\)/g)) {
			const path = m[1].replace(/^\/socionics-wiki\//, '').replace(/\/$/, '');
			if (!path) continue;
			// id в коллекции = "types/maksimus" или "theory/formal/donocentrizm"
			const target = byId.get(path) ?? findIdByPath(byId, path);
			if (target) addBacklink(target.id, source);
		}
	}

	cache = { all, byId, byTitleSlug, backlinks };
	return cache;
}

// id Astro = относительный путь без расширения, в lowercase у starlight.
// Для русских имён файл «ЛИЭ Семантика (2016).md» даёт id «ЛИЭ Семантика (2016)».
// Поэтому пробуем сравнить через normalizeSlug у id-сегмента.
function findIdBySegment(byId: Map<string, DocEntry>, slug: string): DocEntry | undefined {
	for (const [id, entry] of byId) {
		const last = id.split('/').pop() ?? '';
		if (normalizeSlug(last) === slug) return entry;
	}
	return undefined;
}

function findIdByPath(byId: Map<string, DocEntry>, path: string): DocEntry | undefined {
	const targetSegs = path.split('/').map(normalizeSlug);
	for (const [id, entry] of byId) {
		const idSegs = id.split('/').map(normalizeSlug);
		if (idSegs.length !== targetSegs.length) continue;
		if (idSegs.every((s, i) => s === targetSegs[i])) return entry;
	}
	return undefined;
}

export async function getBacklinks(entry: DocEntry, max = 8): Promise<DocEntry[]> {
	const c = await build();
	const list = c.backlinks.get(entry.id) ?? [];
	// Стабильная сортировка по title
	return [...list]
		.sort((a, b) => a.data.title.localeCompare(b.data.title, 'ru'))
		.slice(0, max);
}

export async function getRelated(entry: DocEntry, max = 5): Promise<DocEntry[]> {
	const c = await build();
	const myCats = new Set((entry.data as { categories?: string[] }).categories ?? []);
	const myTopDir = entry.id.split('/')[0];
	const candidates: { entry: DocEntry; score: number }[] = [];

	for (const other of c.all) {
		if (other.id === entry.id) continue;
		if (other.data.template === 'splash') continue;
		if (other.data.draft) continue;
		const otherCats = new Set((other.data as { categories?: string[] }).categories ?? []);
		const overlap = [...myCats].filter((cat) => otherCats.has(cat)).length;
		const sameDir = other.id.split('/')[0] === myTopDir ? 1 : 0;
		const score = overlap * 10 + sameDir * 3;
		if (score > 0) candidates.push({ entry: other, score });
	}

	if (candidates.length === 0) return [];
	// Сортировка: больший score выше. При равных — стабильно по title.
	candidates.sort((a, b) =>
		b.score - a.score || a.entry.data.title.localeCompare(b.entry.data.title, 'ru'),
	);
	return candidates.slice(0, max).map((c) => c.entry);
}

/**
 * URL страницы, который реально работает в Astro/Starlight.
 * entry.id может быть «types/ЛИЭ Семантика (2016)» — нужно к каждому
 * сегменту применить normalizeSlug, чтобы получить «types/лиэ-семантика-2016/».
 */
export function entryUrl(entry: DocEntry): string {
	const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
	const segs = entry.id.split('/').map(normalizeSlug).filter(Boolean);
	const last = segs[segs.length - 1];
	const urlSegs = last === 'index' ? segs.slice(0, -1) : segs;
	return `${base}${urlSegs.join('/')}${urlSegs.length ? '/' : ''}`;
}
