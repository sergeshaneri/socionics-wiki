import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, '../content/docs');

// Normalize a title/filename into a slug matching Astro's default:
// each whitespace/underscore → single hyphen (preserving double spaces as
// double hyphens, matching Astro's behavior), strip characters that aren't
// letters/digits/hyphens (so "Баль 2.1 Семантика" → "баль-21-семантика").
export function normalizeSlug(name) {
	return String(name)
		.toLowerCase()
		.replace(/[\s_]/g, '-')
		.replace(/[^\p{L}\p{N}-]/gu, '')
		.replace(/^-+|-+$/g, '');
}

function extractTitle(filepath) {
	try {
		const content = fs.readFileSync(filepath, 'utf8');
		const fm = content.match(/^---\n([\s\S]*?)\n---/);
		if (!fm) return null;
		const titleMatch = fm[1].match(/^title:\s*(.+)$/m);
		if (!titleMatch) return null;
		return titleMatch[1].trim().replace(/^["']|["']$/g, '');
	} catch {
		return null;
	}
}

function walk(dir, parentSlugs, map) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(full, [...parentSlugs, normalizeSlug(entry.name)], map);
			continue;
		}
		if (!/\.(md|mdx)$/i.test(entry.name)) continue;

		const base = entry.name.replace(/\.(md|mdx)$/i, '');
		const slug = normalizeSlug(base);
		const segments = [...parentSlugs, slug].filter(Boolean);
		// index.md / index.mdx represent a folder's own page — drop the final segment
		const urlSegments = base.toLowerCase() === 'index' ? parentSlugs : segments;
		const url = `/socionics-wiki/${urlSegments.join('/')}${urlSegments.length ? '/' : ''}`;

		// Primary key: the filename slug (matches how users write [[Title]] when title == filename)
		map.set(slug, url);

		// Additional key: normalized frontmatter title, so [[Квантовая Соционика]]
		// resolves even если имя файла транслитерировано (`kvantovaya-socionika`).
		const title = extractTitle(full);
		if (title) {
			const titleSlug = normalizeSlug(title);
			if (titleSlug && titleSlug !== slug && !map.has(titleSlug)) {
				map.set(titleSlug, url);
			}
		}
	}
}

/**
 * Scan src/content/docs/** and return a Map<slug, url>.
 * Slug keys use the same normalization as our pageResolver, so a
 * `[[Multi Word Title]]` or `[[multi-word-title]]` both resolve.
 */
export function buildPermalinkMap() {
	const map = new Map();
	if (fs.existsSync(DOCS_DIR)) walk(DOCS_DIR, [], map);
	return map;
}
