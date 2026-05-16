#!/usr/bin/env node
/**
 * Audit-скрипт для wiki-контента.
 *
 * Проходит по src/content/docs/**, ищет:
 *   - битые markdown-таблицы и code fences
 *   - артефакты Google Docs (<br>, <span>, <o:p>, smart-кавычки в таблицах)
 *   - битые внутренние ссылки ([[wiki-link]] и /socionics-wiki/...)
 *   - страницы-сироты (0 входящих ссылок)
 *   - stub-страницы (< MIN_WORDS слов в теле)
 *   - страницы без description в frontmatter
 *
 * Пишет отчёты в audits/*.md и сводку в audits/summary.md.
 * Запуск:  node scripts/audit-content.mjs   (или npm run audit)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPermalinkMap, normalizeSlug } from '../src/lib/wiki-links.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'src/content/docs');
const AUDITS_DIR = path.join(ROOT, 'audits');

const MIN_WORDS = 150;
const MIN_DESCRIPTION_CHARS = 30;
const LONG_LINE_THRESHOLD = 5000; // подозрительно «один абзац — одна строка»
const HUGE_LINE_THRESHOLD = 50000; // base64 / встроенный HTML

const permalinkMap = buildPermalinkMap();

// ---------- сбор файлов ----------

function walk(dir, acc = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, acc);
		else if (/\.(md|mdx)$/i.test(entry.name)) acc.push(full);
	}
	return acc;
}

// ---------- парсинг страницы ----------

function parseFile(filepath) {
	const raw = fs.readFileSync(filepath, 'utf8');
	const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?/);
	const frontmatter = fmMatch ? fmMatch[1] : '';
	const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;

	const title = pickFmField(frontmatter, 'title');
	const description = pickFmField(frontmatter, 'description');
	const template = pickFmField(frontmatter, 'template');
	const draft = /^draft:\s*true\s*$/m.test(frontmatter);

	return { filepath, raw, frontmatter, body, title, description, template, draft };
}

function pickFmField(fm, name) {
	const m = fm.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
	if (!m) return null;
	return m[1].trim().replace(/^["']|["']$/g, '');
}

// Канонический URL страницы (как в wiki-links.mjs)
function fileToUrl(filepath) {
	const rel = path.relative(DOCS_DIR, filepath).replace(/\\/g, '/');
	const parts = rel.split('/');
	const base = parts.pop().replace(/\.(md|mdx)$/i, '');
	const segs = [...parts.map(normalizeSlug), normalizeSlug(base)].filter(Boolean);
	const urlSegs = base.toLowerCase() === 'index' ? segs.slice(0, -1) : segs;
	return `/socionics-wiki/${urlSegs.join('/')}${urlSegs.length ? '/' : ''}`;
}

// ---------- анализаторы ----------

function analyzeMarkup(body) {
	const issues = [];
	const lines = body.split(/\r?\n/);

	// 1. Code fences
	let openFence = null;
	lines.forEach((line, i) => {
		const m = line.match(/^(```|~~~)/);
		if (!m) return;
		if (openFence == null) openFence = { type: m[1], line: i + 1 };
		else if (line.startsWith(openFence.type)) openFence = null;
	});
	if (openFence) {
		issues.push({ kind: 'unclosed-code-fence', line: openFence.line, detail: `${openFence.type} не закрыт` });
	}

	// 2. Таблицы — считаем только блоки, где есть строка-separator (---|---).
	// Иначе строки с | могут быть просто текстом «\[X | Y\]» или прозой.
	let i = 0;
	while (i < lines.length) {
		if (!looksLikeTableRow(lines[i])) { i++; continue; }
		const start = i;
		const block = [];
		while (i < lines.length && looksLikeTableRow(lines[i])) {
			block.push(lines[i]);
			i++;
		}
		// блок интересен только если в нём есть separator-row → это реальная попытка таблицы
		const sepIdx = block.findIndex(isSeparatorRow);
		if (sepIdx === -1) continue;
		validateTable(block, start + 1, sepIdx, issues);
	}

	// 3. Артефакты Google Docs / Word
	const artefacts = [
		{ re: /<o:p[^>]*>/i, msg: 'тег <o:p> (Word-экспорт)' },
		{ re: /<font[^>]*>/i, msg: 'тег <font> (старый HTML)' },
		{ re: /class="MsoNormal"/i, msg: 'class="MsoNormal" (Word-экспорт)' },
		{ re: /<span style="[^"]{30,}"/i, msg: 'inline-style <span> (Docs-экспорт)' },
		{ re: /&nbsp;&nbsp;&nbsp;/, msg: 'тройной &nbsp; (артефакт форматирования)' },
		{ re: / {3,}/, msg: 'три+ неразрывных пробела подряд' },
	];
	lines.forEach((line, idx) => {
		for (const { re, msg } of artefacts) {
			if (re.test(line)) issues.push({ kind: 'docs-artefact', line: idx + 1, detail: msg });
		}
	});

	// 4. Очень длинные строки (вероятно — копипаст без переносов или встроенные данные)
	lines.forEach((line, idx) => {
		if (line.length > HUGE_LINE_THRESHOLD) {
			issues.push({
				kind: 'huge-embedded-data',
				line: idx + 1,
				bytes: line.length,
				detail: `${line.length.toLocaleString('ru')} символов — вероятно base64-картинка / HTML-таблица в одну строку`,
			});
		} else if (line.length > LONG_LINE_THRESHOLD) {
			issues.push({
				kind: 'very-long-line',
				line: idx + 1,
				bytes: line.length,
				detail: `${line.length.toLocaleString('ru')} символов`,
			});
		}
	});

	return issues;
}

function looksLikeTableRow(line) {
	// строка должна начинаться или заканчиваться | (с учётом пробелов) —
	// иначе одиночный | в прозе типа «\[X | Y\]» не считаем.
	if (/^```/.test(line)) return false;
	return /^\s*\|/.test(line) || /\|\s*$/.test(line);
}

function countCells(row) {
	// убираем экранированные \| и edge-пайпы, считаем разделители
	const trimmed = row.trim().replace(/^\||\|$/g, '');
	const cells = trimmed.split(/(?<!\\)\|/);
	return cells.length;
}

function isSeparatorRow(row) {
	// | --- | :---: | ---: |  и т.п.
	return /^\s*\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/.test(row);
}

function validateTable(block, startLine, sepIdx, issues) {
	// sepIdx — индекс separator-строки. Должен быть = 1 (сразу после шапки).
	if (sepIdx !== 1) {
		issues.push({
			kind: 'table-no-separator',
			line: startLine,
			detail: `separator на строке ${startLine + sepIdx} вместо ${startLine + 1}. Шапка: «${block[0].trim().slice(0, 80)}»`,
		});
		return;
	}
	const headerCols = countCells(block[0]);
	const sepCols = countCells(block[1]);
	if (headerCols !== sepCols) {
		issues.push({
			kind: 'table-col-mismatch',
			line: startLine,
			detail: `шапка ${headerCols} колонок, разделитель ${sepCols}`,
		});
	}
	for (let r = 2; r < block.length; r++) {
		const cols = countCells(block[r]);
		if (cols !== headerCols) {
			issues.push({
				kind: 'table-col-mismatch',
				line: startLine + r,
				detail: `строка ${r + 1}: ${cols} колонок vs шапка ${headerCols}`,
			});
			break; // одной нотификации на таблицу достаточно
		}
	}
}

// Извлекаем внутренние ссылки + их сырое представление
function extractInternalLinks(body) {
	const links = [];
	// [[wikilink]] и [[wikilink|alias]]
	for (const m of body.matchAll(/\[\[([^\]]+?)\]\]/g)) {
		const target = m[1].split('|')[0].trim();
		links.push({ raw: m[0], kind: 'wiki', target });
	}
	// [text](/socionics-wiki/path/)
	for (const m of body.matchAll(/\]\((\/socionics-wiki\/[^)\s#]*)(?:#[^)\s]*)?\)/g)) {
		links.push({ raw: m[0], kind: 'abs', target: m[1] });
	}
	return links;
}

function resolveWikiLink(target) {
	// target может быть «Title», «multi word», или содержать /
	const slug = normalizeSlug(target.split('#')[0]);
	return permalinkMap.get(slug) ?? null;
}

function countWords(body) {
	const stripped = body
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/~~~[\s\S]*?~~~/g, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1')
		.replace(/[#*_>`~|]/g, ' ');
	return stripped.trim().split(/\s+/).filter(Boolean).length;
}

// ---------- запуск ----------

const allUrls = new Set(permalinkMap.values());
const files = walk(DOCS_DIR);
const pages = files.map(parseFile);

const markupReport = [];
const linksReport = [];
const stubsReport = [];
const missingDescReport = [];
const incomingMap = new Map(); // url -> Set<sourceFile>

for (const page of pages) {
	const url = fileToUrl(page.filepath);
	const rel = path.relative(ROOT, page.filepath).replace(/\\/g, '/');

	// markup
	const mi = analyzeMarkup(page.body);
	if (mi.length) markupReport.push({ file: rel, url, issues: mi });

	// links
	const links = extractInternalLinks(page.body);
	const broken = [];
	for (const link of links) {
		if (link.kind === 'wiki') {
			const resolved = resolveWikiLink(link.target);
			if (!resolved) broken.push(link);
			else if (!incomingMap.has(resolved)) incomingMap.set(resolved, new Set()).get(resolved);
			if (resolved) {
				if (!incomingMap.has(resolved)) incomingMap.set(resolved, new Set());
				incomingMap.get(resolved).add(rel);
			}
		} else {
			// abs: нормализуем (trailing /)
			const norm = link.target.endsWith('/') ? link.target : link.target + '/';
			if (!allUrls.has(norm)) broken.push(link);
			else {
				if (!incomingMap.has(norm)) incomingMap.set(norm, new Set());
				incomingMap.get(norm).add(rel);
			}
		}
	}
	if (broken.length) linksReport.push({ file: rel, url, broken });

	// stubs
	const words = countWords(page.body);
	if (!page.draft && page.template !== 'splash' && words < MIN_WORDS) {
		stubsReport.push({ file: rel, url, words, title: page.title });
	}

	// description
	if (!page.draft && page.template !== 'splash') {
		if (!page.description || page.description.length < MIN_DESCRIPTION_CHARS) {
			missingDescReport.push({
				file: rel,
				url,
				title: page.title,
				current: page.description ? `"${page.description}" (${page.description.length} симв.)` : '— нет —',
			});
		}
	}
}

// orphans: страница без входящих, исключая splash/index/корневые
const orphans = [];
for (const page of pages) {
	if (page.template === 'splash' || page.draft) continue;
	const url = fileToUrl(page.filepath);
	const rel = path.relative(ROOT, page.filepath).replace(/\\/g, '/');
	const base = path.basename(page.filepath).toLowerCase();
	if (base === 'index.md' || base === 'index.mdx') continue; // index = страница раздела
	const incoming = incomingMap.get(url);
	if (!incoming || incoming.size === 0) {
		orphans.push({ file: rel, url, title: page.title });
	}
}

// ---------- запись отчётов ----------

fs.mkdirSync(AUDITS_DIR, { recursive: true });

function writeReport(name, title, lines) {
	const header = [
		`# ${title}`,
		'',
		`Сгенерировано: ${new Date().toISOString().slice(0, 19)}`,
		`Всего записей: ${lines.length}`,
		'',
		'---',
		'',
	];
	const body = lines.length ? lines.join('\n') : '_пусто — всё чисто_';
	fs.writeFileSync(path.join(AUDITS_DIR, name), header.join('\n') + body + '\n', 'utf8');
}

writeReport(
	'markup-issues.md',
	'Битый markup (таблицы, code fences, артефакты Docs/Word)',
	markupReport.flatMap(({ file, url, issues }) => [
		`## ${file}`,
		`URL: \`${url}\``,
		'',
		...issues.map((i) => `- L${i.line} · **${i.kind}** — ${i.detail}`),
		'',
	]),
);

writeReport(
	'broken-links.md',
	'Битые внутренние ссылки',
	linksReport.flatMap(({ file, url, broken }) => [
		`## ${file}`,
		`URL: \`${url}\``,
		'',
		...broken.map((b) => `- ${b.kind === 'wiki' ? 'wiki' : 'abs'}: \`${b.raw}\` → цель «${b.target}» не найдена`),
		'',
	]),
);

writeReport(
	'orphans.md',
	'Слабая внутренняя перелинковка (0 ссылок из других статей)',
	[
		'_Доступность через автогенерируемый sidebar не учитывается — эти страницы найти можно, но из тела других статей на них никто не ссылается. Полезный сигнал для backlinks-фичи и cross-link плана._',
		'',
		...orphans.map((o) => `- [${o.title ?? '(без title)'}](${o.url}) — \`${o.file}\``),
	],
);

writeReport(
	'stubs.md',
	`Stub-страницы (< ${MIN_WORDS} слов в теле)`,
	stubsReport
		.sort((a, b) => a.words - b.words)
		.map((s) => `- **${s.words}** слов · [${s.title ?? '(без title)'}](${s.url}) — \`${s.file}\``),
);

writeReport(
	'missing-description.md',
	`Страницы без description в frontmatter (< ${MIN_DESCRIPTION_CHARS} симв.)`,
	missingDescReport.map((m) => `- [${m.title ?? '(без title)'}](${m.url}) — \`${m.file}\` · сейчас: ${m.current}`),
);

// сводка
const summary = [
	'# Audit summary',
	'',
	`Сгенерировано: ${new Date().toISOString().slice(0, 19)}`,
	`Всего файлов в \`src/content/docs/\`: **${pages.length}**`,
	'',
	'| Отчёт | Записей |',
	'| --- | ---: |',
	`| [markup-issues.md](./markup-issues.md) | ${markupReport.length} файлов с проблемами вёрстки |`,
	`| [broken-links.md](./broken-links.md) | ${linksReport.length} файлов с битыми ссылками |`,
	`| [orphans.md](./orphans.md) | ${orphans.length} страниц без входящих ссылок из других статей |`,
	`| [stubs.md](./stubs.md) | ${stubsReport.length} stub-страниц |`,
	`| [missing-description.md](./missing-description.md) | ${missingDescReport.length} без description |`,
	'',
	'## Приоритет на перезаливку с Google Drive',
	'',
	'_Файлы с huge-embedded-data (одна строка на сотни тысяч символов — обычно встроенные base64-картинки или HTML-таблицы из Docs-экспорта). Открываются медленно, утяжеляют bundle, плохо рендерятся._',
	'',
	...(() => {
		const ranked = markupReport
			.map((r) => {
				const huge = r.issues.filter((i) => i.kind === 'huge-embedded-data').length;
				const long = r.issues.filter((i) => i.kind === 'very-long-line').length;
				const bytes = r.issues
					.filter((i) => i.bytes)
					.reduce((s, i) => s + i.bytes, 0);
				return { file: r.file, url: r.url, huge, long, bytes };
			})
			.filter((r) => r.huge > 0 || r.long > 0)
			.sort((a, b) => b.bytes - a.bytes);
		if (!ranked.length) return ['_пусто — ни одной тяжёлой страницы_'];
		return [
			'| # | Файл | huge | long | объём «жёлтых» строк |',
			'| ---: | --- | ---: | ---: | ---: |',
			...ranked.map((r, i) =>
				`| ${i + 1} | \`${r.file}\` | ${r.huge} | ${r.long} | ${r.bytes.toLocaleString('ru')} симв. |`,
			),
		];
	})(),
	'',
];
fs.writeFileSync(path.join(AUDITS_DIR, 'summary.md'), summary.join('\n') + '\n', 'utf8');

// stdout — краткая сводка
console.log('Audit готов. См. audits/summary.md');
console.log(`  markup-issues:     ${markupReport.length} файлов`);
console.log(`  broken-links:      ${linksReport.length} файлов`);
console.log(`  orphans:           ${orphans.length} страниц`);
console.log(`  stubs (<${MIN_WORDS} слов): ${stubsReport.length}`);
console.log(`  missing description: ${missingDescReport.length}`);
