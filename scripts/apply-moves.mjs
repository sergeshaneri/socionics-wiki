// Применяет пакет ручных перемещений файлов и обновлений тегов от пользователя.
// Дополнительно записывает новые редиректы в migration-redirects.json.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'src', 'content', 'docs');

// Список перемещений: [относительно DOCS старый путь, новый путь, новые теги или null]
const MOVES = [
  // → beginners/
  ['theory/meta/davajte-obshhatsya-o-socionike.md', 'beginners/davajte-obshhatsya-o-socionike.md', ['applied']],
  ['theory/meta/metodichka.md', 'beginners/metodichka.md', ['applied']],
  ['theory/meta/post-socionika-karta-zhizni.md', 'beginners/post-socionika-karta-zhizni.md', ['applied']],
  ['theory/meta/socionika-vvedenie-2016.md', 'beginners/socionika-vvedenie-2016.md', ['applied']],
  ['theory/formal/vvedenie-vo-fraktalnuyu-socioniku.md', 'beginners/vvedenie-vo-fraktalnuyu-socioniku.md', ['applied']],
  ['theory/formal/zhil-byl-fraktal-2022.md', 'beginners/zhil-byl-fraktal-2022.md', ['applied']],

  // → information-elements/
  ['theory/meta/beh-bl-razbor-po-mehi-2016.md', 'information-elements/beh-bl-razbor-po-mehi-2016.md', ['semantic']],
  ['theory/meta/igry-po-aspektam-skb.md', 'information-elements/igry-po-aspektam-skb.md', ['semantic', 'applied']],
  ['theory/meta/obuchenie-bi.md', 'information-elements/obuchenie-bi.md', ['semantic', 'applied']],
  ['theory/meta/vospriyatie-s-raznyh-ia.md', 'information-elements/vospriyatie-s-raznyh-ia.md', ['semantic']],

  // → functions/
  ['theory/meta/ifo-interfunkcionalnye-otnosheniya.md', 'functions/ifo-interfunkcionalnye-otnosheniya.md', ['formal']],

  // theory/meta → theory/formal
  ['theory/meta/doklad-dvojstvennost-churyumova-princip-sootvetsviya.md', 'theory/formal/doklad-dvojstvennost-churyumova-princip-sootvetsviya.md', ['formal']],
  ['theory/meta/doklad-donocentrizm.md', 'theory/formal/doklad-donocentrizm.md', ['formal']],
  ['theory/meta/doklad-yump.md', 'theory/formal/doklad-yump.md', ['formal']],
  ['theory/meta/donocentrizm.md', 'theory/formal/donocentrizm.md', ['formal']],
  ['theory/meta/ehkstensivnye-harakteristiki.md', 'theory/formal/ehkstensivnye-harakteristiki.md', ['formal']],
  ['theory/meta/giperkompleksnaya-socionika.md', 'theory/formal/giperkompleksnaya-socionika.md', ['formal']],
  ['theory/meta/markdown-tablicy.md', 'theory/formal/markdown-tablicy.md', ['formal']],
  ['theory/meta/seminar-mat-scn.md', 'theory/formal/seminar-mat-scn.md', ['formal']],
  ['theory/meta/sistemy-imprimitivnosti-v-socionike.md', 'theory/formal/sistemy-imprimitivnosti-v-socionike.md', ['formal']],
  ['theory/meta/spisok-pokoleniya.md', 'theory/formal/spisok-pokoleniya.md', ['formal']],
  ['theory/meta/spisok-pokoleniya-novoe.md', 'theory/formal/spisok-pokoleniya-novoe.md', ['formal']],
  ['theory/meta/svyaz-yumpov-i-pravo-levo.md', 'theory/formal/svyaz-yumpov-i-pravo-levo.md', ['formal']],
  ['theory/meta/teoriya-pokolenij.md', 'theory/formal/teoriya-pokolenij.md', ['formal']],
  ['theory/meta/teoriya-pokolenij-novoe.md', 'theory/formal/teoriya-pokolenij-novoe.md', ['formal']],
  ['theory/meta/teoriya-ritma.md', 'theory/formal/teoriya-ritma.md', ['formal']],
  ['theory/meta/yumpy.md', 'theory/formal/yumpy.md', ['formal']],

  // theory/formal → theory/meta
  ['theory/formal/kvantovaya-socionika.md', 'theory/meta/kvantovaya-socionika.md', ['meta']],
  ['theory/formal/kvantovye-svojstva-socioniki.md', 'theory/meta/kvantovye-svojstva-socioniki.md', ['meta']],
  ['theory/formal/novatorstvo-fraktalnoj-socioniki.md', 'theory/meta/novatorstvo-fraktalnoj-socioniki.md', ['meta']],

  // information-elements → theory/meta
  ['information-elements/lingvosocionika-2021.md', 'theory/meta/lingvosocionika-2021.md', ['meta']],

  // signs → theory/meta
  ['signs/tenser-istoriya-socioniki.md', 'theory/meta/tenser-istoriya-socioniki.md', ['meta']],

  // applied → theory/meta (с дополнительным тегом applied)
  ['applied/kvantovoe-tipirovanie.md', 'theory/meta/kvantovoe-tipirovanie.md', ['meta', 'applied']],
  ['applied/kvantovoe-tipirovanie-novoe.md', 'theory/meta/kvantovoe-tipirovanie-novoe.md', ['meta', 'applied']],
  ['applied/kvantovoe-tipirovanie-gemini.md', 'theory/meta/kvantovoe-tipirovanie-gemini.md', ['meta', 'applied']],

  // information-elements → relations
  ['information-elements/rodstvennye-ito-semantika.md', 'relations/rodstvennye-ito-semantika.md', ['semantic']],
];

function updateCategories(content, newTags) {
  const tagsValue = `[${newTags.join(', ')}]`;
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fmMatch) return content;
  const fm = fmMatch[1];
  if (/^categories:/m.test(fm)) {
    const updated = fm.replace(/^categories:.*$/m, `categories: ${tagsValue}`);
    return content.replace(fmMatch[0], `---\n${updated}\n---\n`);
  }
  return content.replace(fmMatch[0], `---\n${fm}\ncategories: ${tagsValue}\n---\n`);
}

// Читаем существующие редиректы и наращиваем
const redirectsFile = path.join(ROOT, 'migration-redirects.json');
const existing = JSON.parse(await fs.readFile(redirectsFile, 'utf8').catch(() => '{}'));
const newRedirects = { ...existing };

// Обновляем существующие редиректы, которые указывали на промежуточные пути,
// чтобы они указывали сразу на финальный путь (иначе будет двойной хоп).
function retargetExisting(oldRelPath, newRelPath) {
  const oldUrl = '/' + oldRelPath.replace(/\\/g, '/').replace(/\.(md|mdx)$/, '');
  const newUrl = '/' + newRelPath.replace(/\\/g, '/').replace(/\.(md|mdx)$/, '');
  for (const [from, to] of Object.entries(newRedirects)) {
    if (to === oldUrl) newRedirects[from] = newUrl;
  }
  return { oldUrl, newUrl };
}

let moved = 0;
let skipped = 0;
const issues = [];

for (const [oldRel, newRel, newTags] of MOVES) {
  const oldAbs = path.join(DOCS, oldRel);
  const newAbs = path.join(DOCS, newRel);
  try {
    await fs.access(oldAbs);
  } catch {
    issues.push(`SKIP (не найден): ${oldRel}`);
    skipped++;
    continue;
  }

  const content = await fs.readFile(oldAbs, 'utf8');
  const updated = newTags ? updateCategories(content, newTags) : content;
  await fs.mkdir(path.dirname(newAbs), { recursive: true });
  await fs.writeFile(newAbs, updated, 'utf8');
  await fs.unlink(oldAbs);

  // Добавляем редирект с промежуточного URL на финальный, перенаправляем существующие редиректы
  const { oldUrl, newUrl } = retargetExisting(oldRel, newRel);
  newRedirects[oldUrl] = newUrl;

  moved++;
}

await fs.writeFile(redirectsFile, JSON.stringify(newRedirects, null, 2), 'utf8');

console.log(`Перемещено: ${moved}`);
console.log(`Пропущено: ${skipped}`);
if (issues.length) issues.forEach((i) => console.log('  ' + i));
console.log(`Всего редиректов теперь: ${Object.keys(newRedirects).length}`);
