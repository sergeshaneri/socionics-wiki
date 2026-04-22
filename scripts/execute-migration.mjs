// Применяет migration-plan.json: переносит файлы по новым путям, добавляет
// categories: в frontmatter, собирает список редиректов для astro.config.
// Поддерживает --dry-run для предпросмотра без изменений.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'src', 'content', 'docs');

const DRY_RUN = process.argv.includes('--dry-run');

const plan = JSON.parse(await fs.readFile(path.join(ROOT, 'migration-plan.json'), 'utf8'));

// Текущий слаг Starlight: имя файла без расширения, lowercase, пробелы→дефис
function currentSlug(sourcePath) {
  const basename = path.basename(sourcePath, path.extname(sourcePath));
  return basename.toLowerCase().replace(/\s+/g, '-');
}

function currentUrl(sourcePath) {
  // sourcePath: "articles\\Квантовая Соционика.md" или "новое\\файл.md"
  const parts = sourcePath.split(/[\\/]/);
  const subdir = parts[0];
  return `/${subdir}/${currentSlug(parts[parts.length - 1])}`;
}

function newUrl(item) {
  return `/${item.folder}/${item.slug}`;
}

// Добавляет / обновляет поле categories в YAML frontmatter
function ensureCategories(content, categories) {
  const tagsValue = `[${categories.join(', ')}]`;
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fmMatch) {
    // Нет frontmatter — добавляем минимальный
    return `---\ntitle: (без заголовка)\ncategories: ${tagsValue}\n---\n\n${content}`;
  }
  const fm = fmMatch[1];
  if (/^categories:/m.test(fm)) {
    // Обновляем существующее
    const updated = fm.replace(/^categories:.*$/m, `categories: ${tagsValue}`);
    return content.replace(fmMatch[0], `---\n${updated}\n---\n`);
  }
  // Добавляем строку categories перед закрывающим ---
  return content.replace(fmMatch[0], `---\n${fm}\ncategories: ${tagsValue}\n---\n`);
}

async function ensureDir(dir) {
  if (DRY_RUN) return;
  await fs.mkdir(dir, { recursive: true });
}

// Отслеживаем target-коллизии для обработки дубликатов
const targetCount = new Map();
const redirects = {};
const operations = [];
const collisions = [];

const allItems = [];
for (const folder of Object.keys(plan.grouped)) {
  for (const item of plan.grouped[folder]) {
    allItems.push(item);
  }
}

// Первый проход — собираем целевые пути, выявляем коллизии
for (const item of allItems) {
  const baseTarget = path.join(DOCS, item.folder, `${item.slug}.md`);
  const count = (targetCount.get(baseTarget) || 0) + 1;
  targetCount.set(baseTarget, count);
}

// Второй проход — разрешаем коллизии через суффикс
const usedTargets = new Set();
for (const item of allItems) {
  const originalTarget = path.join(DOCS, item.folder, `${item.slug}.md`);
  let target = originalTarget;
  let finalSlug = item.slug;

  if (targetCount.get(originalTarget) > 1) {
    // Коллизия — первый файл получает обычный слаг, последующие — суффикс
    if (usedTargets.has(originalTarget)) {
      // source из "новое/" → суффикс "-novoe"; остальные → "-alt"
      const isNovoe = item.source.startsWith('новое') || item.source.startsWith('новое\\');
      const suffix = isNovoe ? '-novoe' : '-alt';
      finalSlug = `${item.slug}${suffix}`;
      target = path.join(DOCS, item.folder, `${finalSlug}.md`);
      collisions.push({ source: item.source, originalSlug: item.slug, finalSlug });
    }
  }
  usedTargets.add(target);

  operations.push({
    sourceAbs: path.join(DOCS, item.source),
    targetAbs: target,
    sourceRel: item.source,
    targetRel: path.relative(DOCS, target),
    title: item.title,
    categories: item.tags,
    slug: finalSlug,
    folder: item.folder,
  });

  // Редирект: текущий URL → новый
  const from = `/${item.source.split(/[\\/]/)[0]}/${currentSlug(item.source)}`;
  const to = `/${item.folder}/${finalSlug}`;
  redirects[from] = to;
}

// Выполнение
let moved = 0;
let skipped = 0;
for (const op of operations) {
  try {
    await fs.access(op.sourceAbs);
  } catch {
    skipped++;
    continue;
  }

  if (DRY_RUN) {
    moved++;
    continue;
  }

  const content = await fs.readFile(op.sourceAbs, 'utf8');
  const updated = ensureCategories(content, op.categories);
  await ensureDir(path.dirname(op.targetAbs));
  await fs.writeFile(op.targetAbs, updated, 'utf8');
  await fs.unlink(op.sourceAbs);
  moved++;
}

// Отчёт
console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Операций: ${moved} (пропущено: ${skipped})`);
console.log(`Коллизий (дубликатов): ${collisions.length}`);
for (const c of collisions) {
  console.log(`  ${c.source}: ${c.originalSlug} → ${c.finalSlug}`);
}

// Сохраняем редиректы в отдельный файл — потом вольём в astro.config
const redirectsFile = path.join(ROOT, 'migration-redirects.json');
if (!DRY_RUN) {
  await fs.writeFile(redirectsFile, JSON.stringify(redirects, null, 2), 'utf8');
  console.log(`\nРедиректы: ${Object.keys(redirects).length}, записаны в migration-redirects.json`);
} else {
  console.log(`\n[DRY RUN] Было бы редиректов: ${Object.keys(redirects).length}`);
  console.log(`Первые 5:`);
  for (const [from, to] of Object.entries(redirects).slice(0, 5)) {
    console.log(`  ${from} → ${to}`);
  }
}
