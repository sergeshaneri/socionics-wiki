#!/usr/bin/env node
/**
 * Конфигурирует site-graph для хаб-страниц через frontmatter:
 *
 *   sitemap:
 *     include: false       # страница не появляется в графе как нода —
 *                            убирает «звёзды» из 10–50 лучей на соседях
 *   graph:
 *     visible: false       # на самой странице граф не рендерится
 *
 * Применяется к всем index.{md,mdx} в src/content/docs и к splash-страницам
 * корня. Идемпотентно — повторный запуск ничего не сломает.
 *
 * Запуск:  node scripts/configure-hub-graph.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.resolve(__dirname, '../src/content/docs');

const ROOT_SPLASH = ['index.mdx', 'services.mdx', 'contact.mdx', '404.mdx'];

function walkIndexFiles(dir, acc = []) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) walkIndexFiles(full, acc);
		else if (/^index\.(md|mdx)$/i.test(e.name)) acc.push(full);
	}
	return acc;
}

const indexFiles = walkIndexFiles(DOCS);
const splashFiles = ROOT_SPLASH.map((f) => path.join(DOCS, f)).filter(fs.existsSync);
const hubFiles = [...new Set([...indexFiles, ...splashFiles])];

let changed = 0;
let alreadyOk = 0;

for (const file of hubFiles) {
	const raw = fs.readFileSync(file, 'utf8');
	const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (!fmMatch) {
		console.warn(`SKIP (no frontmatter): ${path.relative(DOCS, file)}`);
		continue;
	}

	let fm = fmMatch[1];
	const body = raw.slice(fmMatch[0].length);
	let updated = false;

	// graph.visible: false
	if (!/^graph:\s*\n(?:[ \t]+[^\n]*\n)*[ \t]+visible:/m.test(fm)) {
		if (/^graph:\s*$/m.test(fm)) {
			// есть пустой `graph:` или с другими полями — добавляем visible под ним
			fm = fm.replace(/^graph:\s*$/m, 'graph:\n  visible: false');
		} else if (/^graph:\s*\n/m.test(fm)) {
			fm = fm.replace(/^graph:\s*\n/m, 'graph:\n  visible: false\n');
		} else {
			fm += `\ngraph:\n  visible: false`;
		}
		updated = true;
	}

	// sitemap.include: false
	if (!/^sitemap:\s*\n(?:[ \t]+[^\n]*\n)*[ \t]+include:/m.test(fm)) {
		if (/^sitemap:\s*$/m.test(fm)) {
			fm = fm.replace(/^sitemap:\s*$/m, 'sitemap:\n  include: false');
		} else if (/^sitemap:\s*\n/m.test(fm)) {
			fm = fm.replace(/^sitemap:\s*\n/m, 'sitemap:\n  include: false\n');
		} else {
			fm += `\nsitemap:\n  include: false`;
		}
		updated = true;
	}

	if (!updated) {
		alreadyOk++;
		continue;
	}

	const newRaw = `---\n${fm.replace(/\s*$/, '')}\n---\n${body.startsWith('\n') ? body : '\n' + body}`;
	fs.writeFileSync(file, newRaw, 'utf8');
	changed++;
	console.log(`PATCHED: ${path.relative(DOCS, file)}`);
}

console.log(`\nDone. Patched: ${changed}, already OK: ${alreadyOk}, total hub pages: ${hubFiles.length}.`);
