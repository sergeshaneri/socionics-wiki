import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const base = '/socionics-wiki';
const relatedHeading = '\n\n## Связанные материалы\n';
// SHA-256 of the full source Markdown after CRLF -> LF normalization.
// Sources: Proj/semant/semant/функции; preserve author terminology and typos.
const imports = [
  { slug: 'blok-ego', source: 'Model A EGO.md', sha256: '86f262ce652916d3c7f9b8956d5a2b643b2dcecd7dbb01b634bbfb76a0c57363' },
  { slug: 'blok-superego', source: 'СУПЕРЭГО.md', sha256: '15bedbe84b22140ed70e5a9dad27b1849ad38fc117ebca766288e85020e784dd' },
  { slug: 'blok-superid', source: 'СУПЕРИД.md', sha256: 'e41e94ccc27dd90ac85b6aba183ca6f07230af85a287efc04aaf88b1075178be' },
];
const blocks = [...imports.map(({ slug }) => slug), 'blok-id-semantika'];

function source(slug) {
  return readFileSync(new URL(`../src/content/docs/functions/${slug}.md`, import.meta.url), 'utf8')
    .replace(/\r\n/g, '\n');
}

for (const entry of imports) {
  test(`${entry.slug} preserves the complete author text from ${entry.source}`, () => {
    const markdown = source(entry.slug);
    const body = markdown.replace(/^---\n[\s\S]*?\n---\n\n/, '');
    assert.notEqual(body, markdown, 'frontmatter is separated from the author text');
    const end = body.indexOf(relatedHeading);
    assert.ok(end > 0, 'editorial navigation is separate from the author text');
    assert.equal(createHash('sha256').update(body.slice(0, end)).digest('hex'), entry.sha256);
  });
}

for (const slug of blocks) {
  test(`${slug} is in the semantic category and links to the Functional`, () => {
    const markdown = source(slug);
    const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(frontmatter);
    assert.match(frontmatter[1], /^categories: \[[^\]\n]*\bsemantic\b[^\]\n]*\]$/m);
    assert.ok(markdown.includes(`](${base}/functions/funkcional/)`));
  });
}

test('the Functional links to all four block articles', () => {
  const markdown = source('funkcional');
  for (const slug of blocks) {
    assert.ok(markdown.includes(`](${base}/functions/${slug}/)`), `missing block link: ${slug}`);
  }
});

test('Model A 2016 points readers to the local EGO, SUPEREGO and SUPERID articles', () => {
  const markdown = source('model-a-2016');
  for (const slug of ['blok-ego', 'blok-superego', 'blok-superid']) {
    assert.ok(markdown.includes(`](${base}/functions/${slug}/)`), `missing block link: ${slug}`);
  }
});

// Set WIKI_PREVIEW_URL after a fresh build and start the project preview server.
// These checks deliberately inspect article content, not duplicated sidebar links.
const preview = process.env.WIKI_PREVIEW_URL?.replace(/\/$/, '');
async function page(path) {
  const response = await fetch(`${preview}/${path}/`);
  assert.equal(response.status, 200, `GET ${path}`);
  return response.text();
}
function article(html) {
  const match = html.match(/<article\b[^>]*class="[^"]*\bsl-markdown-content\b[^"]*"[^>]*>([\s\S]*?)<\/article>/);
  assert.ok(match, 'rendered article body exists');
  return match[1];
}

test('rendered semantic hub lists every block in Functions and Models', { skip: !preview }, async () => {
  const html = await page('categories/semanticheskaya-socionika');
  const sections = [...html.matchAll(/<section\b[^>]*class="[^"]*\btagged-category-section\b[^"]*"[^>]*>([\s\S]*?)<\/section>/g)];
  const section = sections.find((match) => match[1].includes('Функции и модели'));
  assert.ok(section, 'Functions and Models section exists');
  for (const slug of [...blocks, 'funkcional']) {
    const href = `href="${base}/functions/${slug}/"`;
    assert.equal(section[1].split(href).length - 1, 1, `one hub entry: ${slug}`);
  }
});

test('rendered block routes have author text and a return link to the Functional', { skip: !preview }, async () => {
  for (const slug of blocks) {
    const body = article(await page(`functions/${slug}`));
    assert.ok(body.includes(`href="${base}/functions/funkcional/"`), `return link: ${slug}`);
    assert.ok(body.includes('Императивно-Временная') || body.includes('ФУНКЦИЯ'), `author text: ${slug}`);
  }
});

test('rendered Functional and Model A link to the local block articles', { skip: !preview }, async () => {
  const functional = article(await page('functions/funkcional'));
  for (const slug of blocks) {
    assert.ok(functional.includes(`href="${base}/functions/${slug}/"`), `Functional link: ${slug}`);
  }
  const model = article(await page('functions/model-a-2016'));
  for (const slug of ['blok-ego', 'blok-superego', 'blok-superid']) {
    assert.ok(model.includes(`href="${base}/functions/${slug}/"`), `Model A link: ${slug}`);
  }
});
