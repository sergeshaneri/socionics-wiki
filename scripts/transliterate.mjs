// GOST 7.79-2000 System B — ASCII-only кириллица → латиница для URL-слагов.
// Применение: `node scripts/transliterate.mjs "Название статьи"` → `nazvanie-statyi`
// Или импорт: `import { toSlug } from './scripts/transliterate.mjs'`.

const GOST_B = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo',
  ж: 'zh', з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'shh',
  ъ: '', ы: 'y', ь: '', э: 'eh', ю: 'yu', я: 'ya',
};

export function transliterate(input) {
  return [...input.toLowerCase()]
    .map((ch) => (ch in GOST_B ? GOST_B[ch] : ch))
    .join('');
}

export function toSlug(input) {
  return transliterate(input)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const invokedFile = process.argv[1]?.replace(/\\/g, '/');
if (invokedFile && import.meta.url === `file://${invokedFile}`) {
  const input = process.argv.slice(2).join(' ');
  if (!input) {
    console.error('Usage: node transliterate.mjs "Название"');
    process.exit(1);
  }
  console.log(toSlug(input));
}
