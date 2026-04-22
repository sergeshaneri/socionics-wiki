// Сканирует articles/ и новое/, применяет эвристики по ключевым словам
// для предложения целевой папки и тегов, строит план миграции.
// Вывод: migration-plan.json (для программной обработки) + migration-plan.md (для ревью).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toSlug } from './transliterate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.resolve(__dirname, '..', 'src', 'content', 'docs');

// Ручные override-ы (по нормализованному заголовку: lowercase + trim + squash spaces).
// Применяются ПЕРЕД эвристиками по regex.
const OVERRIDES = {
  '4 свежак': { folder: 'signs', tags: ['formal'] },
  'баль 2.1 лайт': { folder: 'types', tags: ['applied'] },
  'би тени дары старое': { folder: 'information-elements', tags: ['semantic', 'applied'] },
  'есь клод': { folder: 'types', tags: ['applied'] },
  'гам соннет': { folder: 'types', tags: ['applied'] },
  'лии неройнки': { folder: 'types', tags: ['applied'] },
  'лсп би': { folder: 'information-elements', tags: ['semantic'] },
  'лсп бл': { folder: 'information-elements', tags: ['semantic'] },
  'максимус': { folder: 'types', tags: ['applied'] },
  'описания тимов от нейронок': { folder: 'types', tags: ['applied'] },
  'психологические навыки гемини': { folder: 'information-elements', tags: ['semantic', 'applied'] },
  'тм система признаки статья': { folder: 'signs', tags: ['formal'] },
  'анализ ани кожановой - о принятии': { folder: 'applied', tags: ['applied'] },
};

function normalizeTitle(s) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function isEnglishTitle(title) {
  // Нет кириллических букв → считаем английской статьёй
  return !/[а-яёА-ЯЁ]/.test(title);
}

// Разделение theory на meta vs formal
function splitTheory(title) {
  // formal: математика, формулы, кванты, фракталы как структура, симметрии
  if (/математ|формализац|формальн(ая|ой)?\s+социон|квантов|фрактал|симметри|логика\s+экв|вертност.*формальн|теория\s+сплет|загадка\s+сплет|заметки.*математ|жил\s+был\s+фрактал|система.*импримитив|метабон|соответствие\s+чурюм|порядок\s+чурюм|новаторство\s+фрактал|истори.*математик|циклы\s+перестанов|иллюстрац.*формальн/i.test(title)) {
    return { sub: 'formal', tag: 'formal' };
  }
  // default → meta
  return { sub: 'meta', tag: 'meta' };
}

// Эвристики. Порядок важен: первое совпадение выигрывает.
// [regex, folder, defaultTags]
const RULES = [
  // APPLIED — прикладное/типирование/терапия/развитие
  [/типирован|опросник|разбор урган|конспект типирующ|прокачива|колесо баланс|саморазви|коучинг|терапи|болевая.*практик|методик.*типирован|разбор.*лектор/i, 'applied', ['applied']],

  // SIGNS — признаки, дихотомии, формулы
  [/рейнин|дихотом|тетрахотом|октохотом|\bарп\b|формул|метапризнак|\bмэи\b|классификац.*тетрахот|классификац.*разбиен|признаки.*функц|ньюман|тенсер/i, 'signs', ['formal']],

  // FUNCTIONS — модель, функции, блоки
  [/модель\s*а|полутакт|одномерн|многомерн.*функц|знаки\s+функц|размерн|болевая|информационный\s+метаболизм|функции\s+юнга|блок\s+(эго|ид|супер)|демонстрат|ограничительн|ролев|базов|творческ|суггестив|инфантильн|норматив|фонов|витал|ментальн.*функц/i, 'functions', ['formal']],

  // INFORMATION-ELEMENTS — аспекты, семантика
  [/\b(би|чи|бл|чл|бэ|чэ|бс|чс)\s|семантик|тезаурус|лингв|аспектон|аспекты\s|восприяти.*аспект|словар.*аспект|ni\s+thes|ti\s+te|\bfe\s+fi\b|инспирация|вдохновение/i, 'information-elements', ['semantic']],

  // THEORY — метасоционика, фрактал, квант, математика, философия
  [/аксиом|квантов|фрактал|математ|философ|методолог|теория\s+(сплет|ритма|поколен|ум)|гиперкомпл|доноцентризм|порядок\s+чурюм|бифуркац|становлени|многоуровнев|границы\s+применим|истор.*социон|метабон|основания|принцип\s+соответств|введение.*социон|дедуктивн|система.*импримитив|соответствие\s+формул|полная\s+формализ|gemini|нейронк|нейронн|gpt|клод|доклад\s+ии|ии\s+социон/i, 'theory', ['meta']],

  // ITO / RELATIONS — остаются в relations/ (уже существует)
  [/(^|\s)ито(\s|$)|интертипн|дуальн|родственн|деловые\s+отношен|миражн|активац|зеркальн|ревиз|супервиз|конфликтн|квазитождеств|полудуал|асимметричн.*отношен|отношени.*семантик|инфо.*отношени/i, 'relations', ['applied']],
];

// Теги для специальных случаев по дополнительным ключам
function enrichTags(title, folder, tags) {
  const t = new Set(tags);
  if (/семантик|тезаурус|лингв/i.test(title)) t.add('semantic');
  if (/формул|рейнин|дихотом|тетрахот|октохот|математ|комбинатор|алгебр|квантов|фрактал/i.test(title)) t.add('formal');
  if (/аксиом|философ|методолог|основани|доноцентр|бифуркац|принцип|порядок\s+чурюм|многомер|квант/i.test(title)) t.add('meta');
  if (/типирован|опросник|болевая|терапи|прокачива|коучинг|самораз|практик/i.test(title)) t.add('applied');
  // Разделы-по-умолчанию
  if (folder === 'theory' && t.size === 0) t.add('meta');
  if (folder === 'signs' && !t.has('formal')) t.add('formal');
  if (folder === 'information-elements' && !t.has('semantic')) t.add('semantic');
  if (folder === 'functions' && !t.has('formal')) t.add('formal');
  if (folder === 'applied' && !t.has('applied')) t.add('applied');
  return [...t];
}

function classify(title, description = '') {
  // Приоритет: английский язык → english/ (сохраняем исходные категории по тегам)
  if (isEnglishTitle(title)) {
    let tags = ['meta'];
    for (const [re, , defaultTags] of RULES) {
      if (re.test(title)) { tags = defaultTags; break; }
    }
    return { folder: 'english', tags: enrichTags(title, 'english', tags) };
  }

  // Ручные override-ы (по нормализованному заголовку, без описания)
  const key = normalizeTitle(title);
  if (OVERRIDES[key]) {
    const { folder, tags } = OVERRIDES[key];
    return { folder, tags };
  }

  const searchable = title + ' ' + description;
  for (const [re, folder, tags] of RULES) {
    if (re.test(searchable)) {
      return { folder, tags: enrichTags(searchable, folder, tags) };
    }
  }
  // Если ничего не подошло — theory как запасной вариант с тегом meta
  return { folder: 'theory', tags: enrichTags(searchable, 'theory', ['meta']) };
}

async function readFrontmatter(filepath) {
  const raw = await fs.readFile(filepath, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { title: path.basename(filepath, path.extname(filepath)), description: '' };
  const fm = m[1];
  const title = (fm.match(/^title:\s*(.+)$/m)?.[1] || '').trim().replace(/^["']|["']$/g, '');
  const description = (fm.match(/^description:\s*(.+)$/m)?.[1] || '').trim().replace(/^["']|["']$/g, '');
  return { title: title || path.basename(filepath, path.extname(filepath)), description };
}

async function scanFolder(subdir) {
  const dir = path.join(DOCS, subdir);
  const files = await fs.readdir(dir);
  const results = [];
  for (const file of files) {
    if (!/\.(md|mdx)$/.test(file)) continue;
    if (file === 'index.mdx' || file === 'index.md') continue;
    const abs = path.join(dir, file);
    const { title, description } = await readFrontmatter(abs);
    let { folder, tags } = classify(title, description);

    // Для theory делим на подпапки meta/formal
    let subfolder = '';
    if (folder === 'theory') {
      const split = splitTheory(title);
      subfolder = split.sub;
      // Добавляем соответствующий тег, если его нет
      if (!tags.includes(split.tag)) tags = [...tags, split.tag];
    }

    const slug = toSlug(title);
    const fullFolder = subfolder ? `${folder}/${subfolder}` : folder;
    results.push({
      source: path.join(subdir, file),
      title,
      description,
      folder: fullFolder,
      tags,
      slug,
      currentUrl: `/${subdir}/${encodeURIComponent(path.basename(file, path.extname(file)).toLowerCase().replace(/\s+/g, '-'))}/`,
      newUrl: `/${fullFolder}/${slug}/`,
    });
  }
  return results;
}

const articlesPlan = await scanFolder('articles');
const novoePlan = await scanFolder('новое');
const allPlan = [...articlesPlan, ...novoePlan];

const grouped = {};
for (const item of allPlan) {
  (grouped[item.folder] ??= []).push(item);
}

// JSON для программной обработки
const outJson = path.resolve(__dirname, '..', 'migration-plan.json');
await fs.writeFile(outJson, JSON.stringify({ count: allPlan.length, grouped }, null, 2), 'utf8');

// Markdown для ревью
let md = `# План миграции\n\nВсего файлов: **${allPlan.length}**\n\n`;
for (const folder of Object.keys(grouped).sort()) {
  md += `## ${folder}/ (${grouped[folder].length})\n\n`;
  md += `| Текущий файл | Заголовок | Теги | Новый слаг |\n`;
  md += `|---|---|---|---|\n`;
  for (const item of grouped[folder].sort((a, b) => a.slug.localeCompare(b.slug))) {
    md += `| \`${item.source}\` | ${item.title} | ${item.tags.join(', ')} | \`${item.slug}\` |\n`;
  }
  md += '\n';
}
const outMd = path.resolve(__dirname, '..', 'migration-plan.md');
await fs.writeFile(outMd, md, 'utf8');

console.log(`Files scanned: ${allPlan.length}`);
for (const folder of Object.keys(grouped).sort()) {
  console.log(`  ${folder}: ${grouped[folder].length}`);
}
console.log(`\nWritten: migration-plan.json, migration-plan.md`);
