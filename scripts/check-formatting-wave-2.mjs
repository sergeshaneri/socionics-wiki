#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const WAVE_FILES = [
	'src/content/docs/applied/analiz-ani-kozhanovoj-o-prinyatii.md',
	'src/content/docs/applied/bolevaya-na-praktike.md',
	'src/content/docs/applied/razbor-urganta.md',
	"src/content/docs/english/Churiumov's Correspondence.md",
	'src/content/docs/english/Demo-Ari formula.md',
	'src/content/docs/english/English socionics обрывки.md',
	'src/content/docs/english/Formal Socionics.md',
	'src/content/docs/english/Fractal logic of the paterns in hadamard matrix.md',
	'src/content/docs/english/dichotomies-formulas.md',
	'src/content/docs/english/ni-thesaurus.md',
	'src/content/docs/english/ti-te-language.md',
	'src/content/docs/functions/blok-id-semantika.md',
	'src/content/docs/functions/bolevaya-zametki.md',
	'src/content/docs/functions/ifo-interfunkcionalnye-otnosheniya.md',
	'src/content/docs/functions/informacionnyj-metabolizm-funkcii-yunga.md',
	'src/content/docs/functions/kak-interpretirovat-model-a-ito.md',
	'src/content/docs/functions/model-a-ot-gemini.md',
	'src/content/docs/information-elements/2026 may/Омонимы (полисемия).md',
	'src/content/docs/information-elements/lsp-bi.md',
	'src/content/docs/information-elements/tezaurus-bi.md',
	'src/content/docs/information-elements/tezaurus-s-opredeleniyami-gemini.md',
	'src/content/docs/signs/dihotomii-spravochnik.md',
	'src/content/docs/signs/tm-sistema-priznaki-statya.md',
	'src/content/docs/theory/formal/poryadok-churyumova-novoe.md',
	'src/content/docs/theory/meta/filosofiya-socioniki-gemini.md',
	'src/content/docs/theory/meta/kvantovoe-tipirovanie-gemini.md',
	'src/content/docs/theory/meta/mnogourovnevaya-aksiomatika-2024.md',
	'src/content/docs/types/ЛИЭ Семантика (2016).md',
];

// Эти страницы после второй волны получили отдельную содержательную переработку
// и больше не входят в проверку ее исходного layout-only инварианта.
const POST_WAVE_FILES = new Set([
	'src/content/docs/applied/bolevaya-na-praktike.md',
	"src/content/docs/english/Churiumov's Correspondence.md",
	'src/content/docs/english/Demo-Ari formula.md',
	'src/content/docs/english/English socionics обрывки.md',
]);

const EMPTY_MARKER = /^\s*(?:[-+*]|\d+[.)])\s*$/;
const DANGLING_STRONG = /^\s*\*\*\s*$/;

function readHead(file) {
	return execFileSync('git', ['show', `HEAD:${file}`], {
		cwd: ROOT,
		encoding: 'utf8',
		maxBuffer: 32 * 1024 * 1024,
	});
}

function allowedInvariant(text) {
	let fence = null;
	const lines = text
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.filter((line) => {
			const marker = line.match(/^\s*(```|~~~)/)?.[1];
			if (marker) {
				if (fence === marker) fence = null;
				else if (fence == null) fence = marker;
				return true;
			}
			if (fence != null) return true;
			return !EMPTY_MARKER.test(line) && !DANGLING_STRONG.test(line);
		})
		.map((line) => line.replace(/[\t \u00a0]+$/u, ''));
	while (lines.at(-1) === '') lines.pop();
	return lines.join('\n');
}

function fenceBlocks(text) {
	const blocks = [];
	let fence = null;
	let block = [];
	for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
		const marker = line.match(/^\s*(```|~~~)/)?.[1];
		if (fence == null && marker) {
			fence = marker;
			block = [line];
			continue;
		}
		if (fence != null) {
			block.push(line);
			if (marker === fence) {
				blocks.push(block.join('\n'));
				fence = null;
				block = [];
			}
		}
	}
	if (block.length) blocks.push(block.join('\n'));
	return blocks;
}

function remainingCandidates(text) {
	const candidates = [];
	let fence = null;
	for (const [index, line] of text.replace(/\r\n?/g, '\n').split('\n').entries()) {
		const marker = line.match(/^\s*(```|~~~)/)?.[1];
		if (marker) {
			if (fence === marker) fence = null;
			else if (fence == null) fence = marker;
			continue;
		}
		if (fence != null) continue;
		if (EMPTY_MARKER.test(line)) candidates.push({ line: index + 1, kind: 'empty-marker' });
		if (DANGLING_STRONG.test(line)) candidates.push({ line: index + 1, kind: 'standalone-strong' });
		if (/\u00a0{3,}/u.test(line)) candidates.push({ line: index + 1, kind: 'excess-nbsp' });
	}
	return candidates;
}

const changedContentFiles = execFileSync(
	'git',
	['-c', 'core.quotepath=false', 'diff', '--name-only', '--diff-filter=ACMRTUXB', '-z', 'HEAD', '--', 'src/content/docs'],
	{ cwd: ROOT, encoding: 'utf8' },
)
	.split('\0')
	.filter(Boolean)
	.filter((file) => !POST_WAVE_FILES.has(file))
	.sort();
const expectedContentFiles = WAVE_FILES.filter((file) => !POST_WAVE_FILES.has(file)).sort();
const contentScopeExact = JSON.stringify(changedContentFiles) === JSON.stringify(expectedContentFiles);
console.log(JSON.stringify({ contentScopeExact, changedContentFiles }));

let failed = !contentScopeExact;
for (const file of expectedContentFiles) {
	const before = readHead(file);
	const after = fs.readFileSync(path.join(ROOT, file), 'utf8');
	const textPreserved = allowedInvariant(before) === allowedInvariant(after);
	const codeFencesExact = JSON.stringify(fenceBlocks(before)) === JSON.stringify(fenceBlocks(after));
	const nbspDelta = (before.match(/\u00a0/gu) ?? []).length - (after.match(/\u00a0/gu) ?? []).length;
	const expectedNbspDelta = file === 'src/content/docs/types/ЛИЭ Семантика (2016).md' ? 3 : 0;
	const remaining = remainingCandidates(after);
	if (!textPreserved || !codeFencesExact || nbspDelta !== expectedNbspDelta || remaining.length) failed = true;
	console.log(
		JSON.stringify({
			file,
			textPreserved,
			codeFencesExact,
			nbspDelta,
			remainingCandidates: remaining,
		}),
	);
}

if (failed) process.exitCode = 1;
