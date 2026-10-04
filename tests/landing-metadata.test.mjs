import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

for (const route of ['reviews', 'typing', 'human-design', 'therapy', 'teo', 'ai-socionics']) {
  test(`${route} emits canonical and og:url with one deployment base`, () => {
    const html = readFileSync(new URL(`../dist/${route}/index.html`, import.meta.url), 'utf8');
    const expected = `https://sergeshaneri.github.io/socionics-wiki/${route}/`;
    const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
    const ogUrl = html.match(/<meta\b[^>]*property="og:url"[^>]*content="([^"]+)"/)?.[1];
    assert.equal(canonical, expected);
    assert.equal(ogUrl, expected);
  });
}
