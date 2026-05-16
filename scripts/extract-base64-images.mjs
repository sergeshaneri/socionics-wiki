#!/usr/bin/env node
/**
 * Экстрагирует base64-закодированные картинки из .md файлов в
 * отдельные файлы. Работает lossless — картинки остаются такими же,
 * меняется только storage.
 *
 * Что ищет:
 *   ![alt](data:image/png;base64,...)       — inline image with data URI
 *   [key]: <data:image/png;base64,...>      — reference-style definition
 *   [key]: data:image/png;base64,...        — reference-style без угловых
 *
 * Что делает:
 *   1. Декодирует base64 → binary buffer
 *   2. Сохраняет в public/images/extracted/<file-stem>/<n>.<ext>
 *   3. Заменяет data-URI на путь /socionics-wiki/images/extracted/<...>
 *
 * Идемпотентный (повторный запуск ничего не сломает: data: URI больше нет).
 *
 * Запуск: node scripts/extract-base64-images.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'src/content/docs');
const PUBLIC_OUT = path.join(ROOT, 'public/images/extracted');
const URL_BASE = '/socionics-wiki/images/extracted';

function walk(dir, acc = []) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const f = path.join(dir, e.name);
		if (e.isDirectory()) walk(f, acc);
		else if (/\.(md|mdx)$/i.test(e.name)) acc.push(f);
	}
	return acc;
}

// Уникальное имя файла основано на хэше первых 16 байт base64 (стабильность)
function shortHash(s) {
	let h = 0;
	for (let i = 0; i < Math.min(s.length, 64); i++) {
		h = ((h << 5) - h + s.charCodeAt(i)) | 0;
	}
	return Math.abs(h).toString(36).slice(0, 8);
}

// data:image/png;base64,iVBORw0KGgo...
//  → { mime: 'image/png', ext: 'png', data: Buffer }
function parseDataUri(uri) {
	const m = uri.match(/^data:(image\/[a-z0-9+]+);base64,(.+)$/i);
	if (!m) return null;
	const mime = m[1].toLowerCase();
	const ext = mime.replace(/^image\//, '').replace(/^jpeg$/, 'jpg').replace(/[^a-z0-9]/g, '');
	try {
		const data = Buffer.from(m[2], 'base64');
		return { mime, ext, data };
	} catch {
		return null;
	}
}

const files = walk(DOCS);
let totalImages = 0;
let totalBytes = 0;
let touchedFiles = 0;
const log = [];

for (const file of files) {
	let raw = fs.readFileSync(file, 'utf8');
	if (!/data:image\/[a-z0-9+]+;base64,/i.test(raw)) continue;

	const stem = path.basename(file).replace(/\.(md|mdx)$/i, '');
	const subdir = path.join(PUBLIC_OUT, stem);
	let counter = 0;
	let fileImages = 0;
	let fileBytes = 0;
	const before = raw.length;

	// reference-style: [key]: <data:...> или [key]: data:...
	raw = raw.replace(
		/^(\s*\[[^\]]+\]:\s*)<?(data:image\/[a-z0-9+]+;base64,[^>\s]+)>?(.*)$/gim,
		(match, prefix, uri, suffix) => {
			const parsed = parseDataUri(uri);
			if (!parsed) return match;
			counter++;
			const name = `img-${counter.toString().padStart(2, '0')}-${shortHash(uri.slice(22, 86))}.${parsed.ext}`;
			fs.mkdirSync(subdir, { recursive: true });
			const outPath = path.join(subdir, name);
			fs.writeFileSync(outPath, parsed.data);
			fileImages++;
			fileBytes += parsed.data.length;
			return `${prefix}${URL_BASE}/${stem}/${name}${suffix}`;
		},
	);

	// inline ![alt](data:...) — на случай если попадутся (Docs обычно не делает,
	// но Obsidian может)
	raw = raw.replace(
		/!\[([^\]]*)\]\((data:image\/[a-z0-9+]+;base64,[^)\s]+)(\s+["'][^"']*["'])?\)/g,
		(match, alt, uri, title) => {
			const parsed = parseDataUri(uri);
			if (!parsed) return match;
			counter++;
			const name = `img-${counter.toString().padStart(2, '0')}-${shortHash(uri.slice(22, 86))}.${parsed.ext}`;
			fs.mkdirSync(subdir, { recursive: true });
			const outPath = path.join(subdir, name);
			fs.writeFileSync(outPath, parsed.data);
			fileImages++;
			fileBytes += parsed.data.length;
			return `![${alt}](${URL_BASE}/${stem}/${name}${title ?? ''})`;
		},
	);

	if (fileImages > 0) {
		fs.writeFileSync(file, raw, 'utf8');
		touchedFiles++;
		totalImages += fileImages;
		totalBytes += fileBytes;
		const rel = path.relative(ROOT, file).replace(/\\/g, '/');
		const sizeKB = (fileBytes / 1024).toFixed(0);
		const shrunkKB = ((before - raw.length) / 1024).toFixed(0);
		log.push(`  ${rel} — ${fileImages} картинок, ${sizeKB} KB → файлы, .md уменьшился на ${shrunkKB} KB`);
	}
}

console.log(`Готово. Файлов изменено: ${touchedFiles}.`);
console.log(`Извлечено картинок: ${totalImages} (${(totalBytes / 1024 / 1024).toFixed(2)} MB) → public/images/extracted/`);
console.log('\nПодробно:');
log.forEach((l) => console.log(l));
