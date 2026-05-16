/**
 * Переиспользуемые JSON-LD схемы для structured data.
 * Используется компонентом JsonLd.astro и встраивается на лендинги/wiki.
 */

const SITE_URL = 'https://sergeshaneri.github.io/socionics-wiki/';

export const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Сергей Шанэри',
  alternateName: ['Sergey Shaneri', 'Шанэри'],
  jobTitle: 'Психотерапевт, исследователь соционики',
  description:
    'Духовный психолог, психотерапевт и исследователь соционики, эксперт в системах самопознания, ведущий медитаций. 12 лет практики в соционике, 8 лет в психотерапии.',
  url: SITE_URL,
  image: `${SITE_URL}shaneri.jpg`,
  sameAs: [
    'https://t.me/SergeyShaneri',
    'https://t.me/shaneripsy',
    'https://t.me/fractalscn',
    'https://vk.com/shaneri',
    'https://www.youtube.com/@SergeyShaneri',
    'https://www.instagram.com/sergeyshaneri/',
    'https://www.facebook.com/profile.php?id=100004267483676',
  ],
  knowsAbout: [
    'Соционика',
    'Фрактальная соционика',
    'Дизайн Человека',
    'Генные Ключи',
    'Психотерапия',
    'Медитация',
    'Признаки Рейнина',
    'Модель А',
    'Гипнотерапия',
    'Регрессии в прошлые жизни',
  ],
  alumniOf: {
    '@type': 'EducationalOrganization',
    name: 'Школа Семёна Чурюмова (соционика); Школа Екатерины Самойловой (психология)',
  },
};

interface ServiceSchemaInput {
  name: string;
  description: string;
  serviceType: string;
  url: string;
  lowPrice: number;
  highPrice: number;
}

export function serviceSchema(input: ServiceSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    serviceType: input.serviceType,
    url: input.url,
    provider: {
      '@type': 'Person',
      name: 'Сергей Шанэри',
      url: SITE_URL,
    },
    areaServed: {
      '@type': 'Place',
      name: 'Worldwide (онлайн)',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'RUB',
      lowPrice: String(input.lowPrice),
      highPrice: String(input.highPrice),
      availability: 'https://schema.org/InStock',
    },
  };
}

interface ArticleSchemaInput {
  headline: string;
  description?: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  image?: string;
  inLanguage?: string;
  keywords?: string[];
}

/**
 * Article schema для wiki-статей — даёт rich snippets в Google
 * и помогает краулерам понять структуру контента.
 */
export function articleSchema(input: ArticleSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    ...(input.description ? { description: input.description } : {}),
    url: input.url,
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    image: input.image ?? `${SITE_URL}shaneri.jpg`,
    inLanguage: input.inLanguage ?? 'ru',
    ...(input.keywords?.length ? { keywords: input.keywords.join(', ') } : {}),
    author: {
      '@type': 'Person',
      name: 'Сергей Шанэри',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Person',
      name: 'Сергей Шанэри',
      url: SITE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': input.url,
    },
  };
}

interface ReviewItem {
  author: string;
  text: string;
  date?: string;
}

/**
 * ItemList всех отзывов для /reviews/.
 * Каждый элемент — отдельный Review объект.
 */
export function reviewsListSchema(reviews: ReviewItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: reviews.map((r, i) => ({
      '@type': 'Review',
      position: i + 1,
      author: { '@type': 'Person', name: r.author },
      reviewBody: r.text.slice(0, 600), // обрезаем длинные
      datePublished: r.date ?? undefined,
      itemReviewed: {
        '@type': 'Person',
        name: 'Сергей Шанэри',
      },
    })),
  };
}
