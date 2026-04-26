# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# Project Context

## Что это

Wiki Сергея Шанэри (психолог, исследователь соционики) + четыре landing-страницы под услуги. Деплой — GitHub Pages. Production: `https://sergeshaneri.github.io/socionics-wiki/`.

## Стек

- Astro 6 + Starlight 0.38 (доки-фреймворк)
- `base: '/socionics-wiki'` — все ссылки должны учитывать base
- `output: 'static'` — SSG, никакого SSR
- Sharp в зависимостях (для изображений)
- Шрифты: Cormorant Garamond (display), DM Sans (body), Space Mono (mono) — все через `@fontsource/`

## Архитектура (две параллельные системы)

**1. Standalone landings — `src/pages/*.astro`**
Чистые Astro-страницы, НЕ через Starlight. Используют `LandingLayout`, свой CSS (`src/styles/landing.css`), свою навигацию (`LandingNav`) и футер (`LandingFooter`).

- `typing.astro` — соционическое типирование (от 3000 ₽)
- `human-design.astro` — Дизайн Человека (от 3000 ₽)
- `therapy.astro` — духовная психотерапия (от 1000 ₽)
- `teo.astro` — групповая практика ТЭО (1000 ₽)
- `reviews.astro` — все 121 отзывы с фильтром по 4 направлениям
- `wiki-search-index.json.ts` — эндпоинт со всеми wiki-страницами для fuzzy-search

**2. Wiki articles — `src/content/docs/*.{md,mdx}`**
Starlight content collection. Сайдбар, breadcrumbs, поиск, темы.

- `index.mdx`, `services.mdx`, `contact.mdx`, `404.mdx` — splash-страницы
- `theory/`, `types/`, `signs/`, `relations/`, `books/` и т.д. — 366+ статей

## Ключевые компоненты

**Кастомные overrides Starlight** (зарегистрированы в `astro.config.mjs > components`):
- `Head.astro` — добавляет JSON-LD Person schema, OG-теги, NoirEnhancements скрипты
- `Footer.astro` — CTA «Обсудить в чате» (`https://t.me/+3PS2UiI8Dec4NWZi`) на статьях, скрыт на splash
- `PageTitle.astro` — добавляет breadcrumbs + reading-time
- `SocialIcons.astro` — переопределение

**Для лендингов:**
- `LandingLayout.astro` — обёртка с навом/футером/Person JSON-LD
- `landing/LandingNav.astro` — фиксированный glass-pill с burger на мобильном
- `landing/ReviewsCarousel.astro` — горизонтальная карусель отзывов
- `landing/RelatedServices.astro` — блок «Также интересно» внизу лендингов
- `JsonLd.astro` + `lib/structured-data.ts` — переиспользуемые schema.org объекты

**Wiki-специфичные:**
- `NoirCard.astro` — editorial карточка с шевроном
- `ServiceCardFeatured.astro` — «крупная» карточка услуги для services.mdx
- `ContactChannel.astro` — карточка канала связи (TG, VK, и т.п.)
- `Breadcrumbs.astro`, `CategoryTags.astro`, `Suggestions404.astro`

## Дизайн-система

**Editorial luxury, ТОЛЬКО тёмная тема** (для standalone лендингов).
- Cormorant Garamond italic для display + цитат
- Глубокий ink-violet вместо ярких акцентов
- Hairline-границы (0.5px)
- Архитектурные углы (4–8px), НЕ pill для всего
- Двойной bezel (`ln-bezel` + `ln-bezel__inner`)
- CSS-переменные в `src/styles/landing.css` и `src/styles/variants/variant-c.css`

Wiki-страницы поддерживают и тёмную, и светлую тему — стили в `src/styles/themes/`.

## Данные

- `src/data/reviews-{typing,human-design,therapy,teo}.json` — OCR'd отзывы (всего 121)
- `public/photos/` — исходные скриншоты отзывов, в `.gitignore` (только текст в JSON)
- `scripts/extract-reviews.py` и `scripts/map-photos-to-topics.py` — пайплайн извлечения

## Соглашения и важные решения

**НЕ делать:**
- Светлую тему для standalone лендингов — editorial-стиль строится на тёмном фоне
- Прямые ссылки в мессенджер из CTA — пользователь должен сам выбрать канал из контактов
- Редизайн всей wiki под лендинги — это уже пробовали, ломало навигацию
- Добавлять светлый/яркий шум в editorial-кнопки (была долгая итерация — пользователь хочет угрюмо-премиум)

**Делать:**
- Использовать `base` префикс (`import.meta.env.BASE_URL`) для всех ссылок
- На splash-страницах использовать `template: splash` в frontmatter
- Сначала минимально работающее, расширения по запросу

## Контакты Сергея (для копирайта в CTA)

- Telegram: `@SergeyShaneri` (личный), `@shaneripsy` (фрактальная психология), `@fractalscn` (соционика), `@shaneristihi` (стихи), `@shanerireviews` (отзывы)
- Соционический чат: `https://t.me/+3PS2UiI8Dec4NWZi`
- VK: `vk.com/shaneri`, YouTube: `@SergeyShaneri`
- Email: `shaneri.ser@gmail.com`, телефон: `+7 952 511-59-37`
- Instagram: `@sergeyshaneri`, FB profile id `100004267483676`

## Команды

- `npm run dev` — dev-сервер на :4321 (используется через `mcp__Claude_Preview` для preview)
- `npm run build` — статическая сборка в `dist/`
- Деплой автоматический через GitHub Actions при push в `main`

## Стиль работы (на этом проекте)

- Отвечаем по-русски
- Не предлагать кучу всего сразу — короткий приоритизированный список с одной рекомендацией
- Не коммитить и не пушить без явного «делай пуш» / «пуш»
- Использовать TodoWrite для нетривиальных многошаговых задач
- Перед серьёзным изменением — короткий план, ждём подтверждения

