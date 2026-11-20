import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const article = fs.readFileSync(new URL('../src/content/docs/applied/oprosnik-ehkspress-tipirovanie-novoe.md', import.meta.url), 'utf8');

test('introverted temperament descriptions agree with the correspondence table', () => {
  const hypotheses = article.split('**Фаза 1:')[1].split('**Фаза 2:')[0];
  const adaptive = hypotheses.split('→ Восприимчиво-адаптивные**')[1].split('* **3\\.')[0];
  const stable = hypotheses.split('→ Уравновешенно-стабильные**')[1];
  assert.match(adaptive, /коррелирует с \*\*меланхоликами\*\*/);
  assert.match(stable, /коррелирует с \*\*флегматиками\*\*/);
  assert.match(article, /\*\*Восприимчиво-адаптивные \(Меланхолики\)\*\*/);
  assert.match(article, /\*\*Уравновешенно-стабильные \(Флегматики\)\*\*/);
});

test('ILI has a plus sign in the diagram and is a positivist in the table', async () => {
  assert.match(article, /\|\s*ИЛИ\s*\|\s*Позитивист\s*\|/);
  const imageReference = article.match(/^\[image1\]: \/socionics-wiki\/(.+)$/m)?.[1].trim();
  assert.ok(imageReference, 'the article references its correspondence diagram');
  const image = fileURLToPath(new URL(`../public/${imageReference}`, import.meta.url));
  const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 624);
  assert.equal(info.height, 476);
  // The ILI sign is centered at (391, 189); a minus has no vertical stroke.
  for (const y of [187, 188, 191, 192]) {
    const offset = (y * info.width + 391) * info.channels;
    assert.ok(Math.max(...data.subarray(offset, offset + 3)) < 120, `ILI plus vertical stroke at y=${y}`);
  }
});
