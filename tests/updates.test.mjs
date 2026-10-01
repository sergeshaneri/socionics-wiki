import test from 'node:test';
import assert from 'node:assert/strict';

const origin = 'http://127.0.0.1:4321/socionics-wiki';

async function page(path) {
  const response = await fetch(`${origin}${path}`);
  assert.equal(response.status, 200, `GET ${path}`);
  return response.text();
}

test('home lists a dated release after the hub cards', async () => {
  const html = await page('/');
  assert.ok(html.includes('Обновления 26 сентября: отношения, аспекты и ИИ'));
  assert.ok(html.includes('/socionics-wiki/updates/2026-09-26-otnosheniya/'));
  assert.ok(html.indexOf('Обновления 26 сентября: отношения, аспекты и ИИ') > html.indexOf('Методика типирования'));
});

test('article right sidebar links to the release', async () => {
  const html = await page('/relations/зеркальные-отношения/');
  assert.ok(html.includes('right-sidebar-panel'));
  assert.ok(html.includes('Обновления 26 сентября: отношения, аспекты и ИИ'));
});

test('release post lists the published materials and an explicit date', async () => {
  const html = await page('/updates/2026-09-26-otnosheniya/');
  assert.ok(html.includes('26 сентября 2026'));
  assert.ok(html.includes('/socionics-wiki/relations/зеркальные-отношения/'));
  assert.ok(html.includes('/socionics-wiki/relations/миражные-отношения/'));
});

test('every material linked from the release resolves', async () => {
  const html = await page('/updates/2026-09-26-otnosheniya/');
  for (const slug of [
    'зеркальные-отношения',
    'зеркальные-отношения-иэи-эиэ',
    'миражные-отношения',
    'суперэго',
    'metodologiya-opisaniya-ito-po-churyumovu',
    'asimmetrichnye-ito',
  ]) {
    assert.ok(html.includes(`/socionics-wiki/relations/${slug}/`), `missing link: ${slug}`);
    await page(`/relations/${slug}/`);
  }
});

test('release includes the other publications and the expanded hub', async () => {
  const html = await page('/updates/2026-09-26-otnosheniya/');
  for (const path of [
    '/functions/funkcional/',
    '/information-elements/lsp-bs/',
    '/applied/lsp-bs-coaching/',
    '/duality/index.html',
    '/ai-socionics/',
    '/information-elements/',
    '/categories/semanticheskaya-socionika/',
    '/relations/дуальные-ито-2018/',
  ]) {
    assert.ok(html.includes(`/socionics-wiki${path}`), `missing release link: ${path}`);
    await page(path);
  }
});

test('archive exposes the release', async () => {
  const html = await page('/updates/');
  assert.ok(html.includes('Обновления 26 сентября: отношения, аспекты и ИИ'));
});
