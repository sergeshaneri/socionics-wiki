import test from 'node:test';
import assert from 'node:assert/strict';

const origin = 'http://127.0.0.1:4321/socionics-wiki';
const release = '/updates/2026-10-01-formalizaciya-i-prilozheniya/';
const formal = '/theory/formal/otkrytyj-korpus-formalizacii-socioniki/';
async function page(path) {
  const response = await fetch(`${origin}${path}`);
  assert.equal(response.status, 200, path);
  return response.text();
}
test('new release appears first in home and archive feeds', async () => {
  for (const path of ['/', '/updates/']) {
    const html = await page(path);
    const feed = html.match(/<section[^>]*aria-label="Новое"[\s\S]*?<\/section>/)?.[0];
    assert.ok(feed);
    assert.ok(feed.includes(`href="/socionics-wiki${release}"`));
    assert.ok(feed.indexOf(release) < feed.indexOf('/updates/2026-09-26-otnosheniya/'));
  }
});
test('release links to formalization and applications', async () => {
  const html = await page(release);
  for (const path of [formal, '/applications/']) {
    assert.ok(html.includes(`/socionics-wiki${path}`));
    await page(path);
  }
});
test('catalog contains five previews and updated invariant image dimensions', async () => {
  const html = await page('/applications/');
  assert.equal((html.match(/<figure[^>]*application-preview/g) ?? []).length, 5);
  assert.match(html, /invariants\.webp[^>]*width="1037"[^>]*height="668"/);
  assert.ok(html.includes('Статичные и динамичные группы'));
  for (const image of ['balance', 'periodic', 'test', 'invariants', 'fano']) {
    await page(`/images/applications/${image}.webp`);
  }
});
