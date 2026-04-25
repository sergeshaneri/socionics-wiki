import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/**
 * Лёгкий индекс wiki-страниц для клиентского fuzzy-suggest на 404.
 * Возвращает массив { url, title, slug } по всем docs-страницам.
 */
export const GET: APIRoute = async () => {
  const docs = await getCollection('docs');
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');

  const index = docs
    .filter((d) => d.id !== '404') // не подсказывать саму 404
    .map((d) => ({
      url: `${base}${d.id}/`.replace(/\/index\/$/, '/'),
      title: d.data.title,
      slug: d.id,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, 'ru'));

  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
