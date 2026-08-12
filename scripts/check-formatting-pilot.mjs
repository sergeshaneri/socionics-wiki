#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PILOT_FILES = [
	'src/content/docs/english/express-typing-questionaire.md',
	'src/content/docs/english/generations-therory-gemini-translation.md',
	'src/content/docs/beginners/socionika-vvedenie-2016.md',
	'src/content/docs/beginners/zhil-byl-fraktal-2022.md',
	'src/content/docs/applied/oprosnik-ehkspress-tipirovanie-novoe.md',
	'src/content/docs/applied/kak-prokachivat-bi.md',
	'src/content/docs/theory/formal/teoriya-pokolenij.md',
	'src/content/docs/theory/meta/nabrosok-lsp-2017.md',
	'src/content/docs/information-elements/lsp-bl.md',
	'src/content/docs/information-elements/obuchenie-bi.md',
	'src/content/docs/types/opisaniya-timov-ot-nejronok.md',
	'src/content/docs/types/Баль 2.1 Семантика.md',
];

const EMPTY_MARKER = /^\s*(?:[-+*]|\d+[.)])\s*$/;
const DANGLING_STRONG = /^\s*\*\*\s*$/;
const TABLE_SEPARATOR = /^\s*\|?(?:\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/;
const EMPTY_TABLE_ROW = /^\s*\|(?:\s*\|)+\s*$/;

function readHead(file) {
	return execFileSync('git', ['show', `HEAD:${file}`], {
		cwd: ROOT,
		encoding: 'utf8',
		maxBuffer: 16 * 1024 * 1024,
	});
}

function visibleInvariant(text) {
	return text
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.filter((line) => !EMPTY_MARKER.test(line))
		.filter((line) => !DANGLING_STRONG.test(line))
		.filter((line) => !TABLE_SEPARATOR.test(line))
		.filter((line) => !EMPTY_TABLE_ROW.test(line))
		.join('\n')
		.replace(/\s/gu, '');
}

function lineCandidates(text) {
	const candidates = [];
	for (const [index, line] of text.replace(/\r\n?/g, '\n').split('\n').entries()) {
		if (EMPTY_MARKER.test(line)) candidates.push({ line: index + 1, kind: 'empty-list-marker' });
		if (DANGLING_STRONG.test(line)) candidates.push({ line: index + 1, kind: 'dangling-strong' });
		if (/\u00a0{3,}/u.test(line)) candidates.push({ line: index + 1, kind: 'excess-nbsp' });
	}
	return candidates;
}

let failed = false;
for (const file of PILOT_FILES) {
	const before = readHead(file);
	const after = fs.readFileSync(path.join(ROOT, file), 'utf8');
	const textPreserved = visibleInvariant(before) === visibleInvariant(after);
	const remainingCandidates = lineCandidates(after);
	if (!textPreserved || remainingCandidates.length) failed = true;
	console.log(JSON.stringify({ file, textPreserved, remainingCandidates }));
}

if (failed) process.exitCode = 1;
