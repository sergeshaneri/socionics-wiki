import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const redirects = JSON.parse(readFileSync(new URL('../migration-redirects.json', import.meta.url), 'utf8'));

test('redirect sources do not collide after trailing slash normalization', () => {
  const seen = new Map();
  for (const source of Object.keys(redirects)) {
    const route = source.replace(/\/+$/, '');
    assert.ok(!seen.has(route), `${source} collides with ${seen.get(route)}`);
    seen.set(route, source);
  }
});

test('English catalog aliases redirect to the existing article routes', () => {
  const catalog = readFileSync(new URL('../src/content/docs/english/index.mdx', import.meta.url), 'utf8');
  for (const [source, target] of [
    ['/english/ili-2-1-machine-translate', '/english/ili-21-machine-translate/'],
    ['/english/minaev-dichotomies-left-right', '/english/minaev-dichotomies---left-right/'],
  ]) {
    assert.ok(catalog.includes(`/socionics-wiki${source}/`), `missing catalog link: ${source}`);
    assert.equal(redirects[source], target, `missing redirect: ${source}`);
  }
});

test('migration redirect destinations include the deployment base exactly once', async () => {
  const { withRedirectBase } = await import('../src/lib/redirects.mjs');
  const result = withRedirectBase(redirects, '/socionics-wiki');
  for (const [source, destination] of Object.entries(result)) {
    assert.ok(destination.startsWith('/socionics-wiki/'), `${source}: ${destination}`);
    assert.ok(!destination.includes('/socionics-wiki/socionics-wiki/'), destination);
  }
  assert.equal(result['/typing-landing'], '/socionics-wiki/typing/');
  assert.equal(result['/articles/аксиома-тождества'], '/socionics-wiki/theory/meta/aksioma-tozhdestva');
});

test('built migration pages use base-prefixed refresh and canonical destinations', () => {
  for (const [source, destination] of Object.entries(redirects)) {
    const target = destination.startsWith('/socionics-wiki/')
      ? destination : `/socionics-wiki${destination}`;
    const html = readFileSync(new URL(`../dist${source}/index.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`content="0;url=${target}"`), `wrong refresh destination: ${source}`);
    assert.ok(html.includes(`href="https://sergeshaneri.github.io${target}"`), `wrong canonical: ${source}`);
  }
});

test('migration redirects point to existing built pages', () => {
  for (const [source, destination] of Object.entries(redirects)) {
    const path = destination.replace(/^\/socionics-wiki/, '').replace(/\/$/, '');
    assert.doesNotThrow(
      () => readFileSync(new URL(`../dist${path}/index.html`, import.meta.url)),
      `missing redirect target: ${source} -> ${destination}`,
    );
  }
});
