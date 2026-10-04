import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildPermalinkMap } from '../src/lib/wiki-links.mjs';

test('frontmatter title aliases resolve equally with LF and CRLF', (t) => {
  const target = fileURLToPath(new URL('../src/content/docs/theory/meta/mnogomernost-bifurkacii-v-stanovlenii.md', import.meta.url));
  const readFileSync = fs.readFileSync;
  const maps = [];
  for (const newline of ['\n', '\r\n']) {
    const content = ['---', 'title: "Проверочный заголовок"', '---', '', 'Текст статьи.'].join(newline);
    const mocked = t.mock.method(fs, 'readFileSync', (file, ...args) =>
      file === target ? content : readFileSync(file, ...args));
    const map = buildPermalinkMap();
    assert.equal(map.get('проверочный-заголовок'), '/socionics-wiki/theory/meta/mnogomernost-bifurkacii-v-stanovlenii/');
    assert.equal(map.get('mnogomernost-bifurkacii-v-stanovlenii'), '/socionics-wiki/theory/meta/mnogomernost-bifurkacii-v-stanovlenii/');
    maps.push([...map]);
    mocked.mock.restore();
  }
  assert.deepEqual(maps[0], maps[1]);
});
