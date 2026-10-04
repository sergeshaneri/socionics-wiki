# Спецификация визуальной системы: reading experience

Статус: предлагаемые нормативные значения пилота. Они не измерены со скриншотов и не являются утверждением об уже изменённом сайте. После VR04 выбранные отклонения фиксируются в decisions.md; будущие агенты используют принятое решение, а не собственный вкус.

## 1. Визуальные режимы

Основной режим сайта — чтение/обучение; каталоги — поиск и выбор материала. Титульная страница поддерживает выразительное вступление, статья обеспечивает устойчивое длительное чтение.

- **Display:** главная/вступление, антиква, свободное окружение, мягкий непрозрачный dark gradient.
- **Reader:** длинная проза на непрерывной поверхности, neutral sans, умеренные заголовки, стабильная ширина строки.
- **Navigation:** 14–16px sans, ясный active/focus, плотнее reader, без неоновой конкуренции с текстом.
- **Technical:** таблицы, KaTeX и схемы сохраняют собственные метрики/значимые цвета; локальный overflow.

Главная и каталоги сохраняют существующее содержание. Не добавлять новые рекламные формулы, пустые слоганы, искусственные статистики, центровку всех разделов и одинаковые крупные карточки.

## 2. Палитра

Все основные поверхности непрозрачны. Цветовой акцент выбран из пользовательского референса, а не из framework defaults. Проза не набирается полупрозрачным текстом на нескольких полупрозрачных слоях.

| Семантический токен | Dark | Light |
|---|---|---|
| --visual-bg | #09070f | #faf8fc |
| --visual-bg-deep | #07060b | #f5f1f9 |
| --visual-surface | #100d17 | #f3eff8 |
| --visual-surface-raised | #14111d | #ffffff |
| --visual-text | #d8d5df | #302c38 |
| --visual-text-strong | #e5e2e9 | #211c2b |
| --visual-text-muted | #a7a2b0 | #625c6d |
| --visual-link | #c5a7ed | #68359a |
| --visual-link-hover | #e2d1f8 | #442061 |
| --visual-border | #302b3b | #d8d2df |
| --visual-border-strong | #494252 | #bdb3cb |
| --visual-action-bg | #c9adf2 | #653a8f |
| --visual-action-ink | #20132f | #ffffff |
| --visual-focus | #c9adf2 | #653a8f |

Предложенные foreground/background пары рассчитаны в token-contrast.json. Это проверка плоских токенов, не доказательство контраста после полного CSS cascade.

**Фон display:** допустим вертикальный переход #161020 → #09070f → #07060b и один очень слабый радиальный оттенок у края. Самый светлый используемый участок ограничить #161020 либо отдельно проверить более светлый цвет. Градиент статический, не анимированный, без ярких пятен за буквами. Для текста в центральной области contrast считается в нескольких реальных участках backdrop.

**Фон reader:** #09070f с небольшой неоднородностью до #100c18. Под длинной прозой переход почти не должен ощущаться; нельзя создавать отдельную карточку вокруг каждого абзаца. Sidebar/nav — собственный непрозрачный surface. Без backdrop blur и film-grain слоя под чтением.

**Light wiki:** отдельная согласованная палитра. Не наследовать dark rgba из поздних global правил. Standalone услуги/отзывы и custom-dark материалы остаются dark-only согласно проектной политике.

## 3. Шрифты и кириллица

Исходные кандидаты: Inter Variable для body/navigation, Cormorant Garamond для display, существующий mono stack для кода. Эти семейства уже присутствуют в проекте; точный шрифт Hermes по изображению не установлен.

Условия применения:

1. Проверить installed font CSS и unicode-range кириллицы: Ё/ё, Й/й, Щ/щ, Ъ/ъ, Д/д, Ж/ж, цифры и математические обозначения.
2. На реальных кириллических nodes использовать Chromium CDP CSS.getPlatformFontsForNode. Computed font-family и document.fonts.check недостаточны для доказательства фактического glyph rendering.
3. На 1440px и 390px сравнить 400/450 body и 500/600 display. Не выбирать тонкое начертание, которое теряет штрихи на телефоне, и не утяжелять всю страницу.
4. Все font assets локальные, без новых Google Fonts/CDN. Импортировать только реально используемые веса/подмножества. Дополнительный шрифт требует дефекта текущего кандидата и согласованного budget.
5. Font-display, preload и fallback выбирать по измерениям cold load. Не preloading всех файлов/весов.

## 4. Типографическая шкала

Значения px ниже — целевое computed оформление при стандартном корневом размере 16px. Production размеры задаются rem/clamp, пользовательский размер и zoom не блокируются. Body tracking/word-spacing — normal; отрицательный tracking допустим только для display после осмотра кириллицы.

| Роль | Desktop | Mobile | Weight | Line-height |
|---|---|---|---|---|
| Home display h1 | 48–72px | 32–44px | 500; 600 только выбранный вариант | 1.05–1.15 |
| Article title h1 | 36–44px | 28–34px | 500 | 1.2–1.3 |
| Article chapter h2 | 24–28px | 23–25px | 500–600 | 1.35–1.45 |
| Article h3 | 20–22px | 20px | 500–600 | 1.4–1.5 |
| Article h4–h6 | 18–19px | 18px | 500–600 | 1.45–1.55 |
| Main prose | 18px (1.125rem) | 18px | 400; 450 сравнить в пилоте | 1.75 |
| Lists | тот же body | тот же body | 400 | 1.7–1.75 |
| Table text | 16–17px | 16px | 400; th 500–600 | 1.5–1.6 |
| Captions/meta | 14–16px | 14–16px | 400–500 | 1.5–1.6 |
| Navigation/TOC | 14–16px | 15–16px | 400–500 | 1.45–1.6 |
| Service headings | 14–16px | 14–16px | 500 | 1.5 |

Основной предложенный режим: антиква только в display и title; нейтральный sans для внутренних article headings. Это выбор реконструкции правой читающей панели, а не запрет антиквы вообще. Вариант с serif chapter h2 можно показать в VR03; применять его только если пользователь выберет. Служебные Backlinks/UpdatesFeed/TOC headings никогда не наследуют chapter display scale.

Strong: 600 для коротких смысловых выделений, без добавления новых bold paragraphs. Существующее авторское выделение сохраняется. Caps/широкая разрядка используются только в редких служебных метках, не в прозе и не в каждом heading.

## 5. Ритм и колонки

Reader prose: 68–72ch, старт 70ch, дополнительный ceiling 48rem. ch описывает метрику нуля выбранного шрифта и не является точным числом русских букв. Ограничение распространяется на prose/list/blockquote, а таблица и схема могут использовать доступную ширину основного контента.

- Paragraph gap: 1–1.125rem. Не совмещать внешний и внутренний margin так, чтобы интервалы случайно удваивались.
- Chapter before: 2–2.5rem, after: 0.75–1rem. h3 before: 1.5–2rem, after: 0.625–0.75rem.
- Заголовок вместе с Starlight wrapper/anchor должен иметь одну шкалу. Подзаголовок не отрывается от следующего текста.
- Tight li gap: около 0.3em; paragraph-based li gap: 0.65–0.75em. Nested indent: 1.2–1.4em. Продолжение строки выравнивается с текстом, не с маркером.
- Gutter: 16–20px на 320px, 20–24px на 390px, 28–40px desktop внутри main, не суммировать gutter родителя и content-panel вслепую.
- Article title + meta не должны создавать пустой первый экран. На 390x844 первая строка основного материала или полезная technical visual должна реально пересекаться с viewport после header/title/meta.
- Главная: h1 и существующее primary action в первом viewport; дальше действующие introduction/material links. Не вставлять полноэкранный декоративный hero между читателем и материалами.
- Переходы внутри документа сохраняют native hash и scroll-margin под sticky header.

## 6. Компоненты

**Navigation:** непрозрачные surfaces, тонкая border там, где она разделяет области; active item без glow. Hover небольшое изменение fill/ink без прыжка. Search dialog и native select options — реальная theme-aware подложка. Touch controls проекта целятся в 44px; этот проектный размер не выдаётся за универсальное требование WCAG AA.

**Links/CTA:** in-prose link имеет видимый cue помимо цвета. Primary action использует отдельные ink/fill токены. Проверка после article a color обязательна. CTA text не становится сиреневым на сиреневом fill из-за более общего selector.

**Quotes/code:** blockquote — отступ, subdued ink и небольшая смысловая граница; без glow/глубокой тени. pre/Expressive Code сохраняют syntax semantics и local scroll. Inline code не превращает длинную фразу в ряд огромных pill.

**Tables/math:** local horizontal scroll при необходимости; таблица не обрезается, th/td сохраняют alignment. KaTeX свои fonts/line-height; display-math контейнер и вертикальный запас не обрезают дроби/индексы. Если реальный route не рендерит KaTeX, нужен отдельный test fixture, а не успешный missing selector.

**Images/diagrams:** object fit по смыслу, никакой blanket круглой маски для научной схемы. Цветовые индексы, порядок функций, стрелки, muted/unused semantics не меняются. Captions subdued readable, local container widths проверяются независимо от viewport.

**Catalogs/cards:** hierarchy через type/spacing, grouping сохраняется. Не всем элементам одинаковая большая карточка, glow и иконка сверху. Existing card components могут стать спокойнее без новой content strategy.

**Service UI:** Backlinks, UpdatesFeed, footer CTA, meta, pagination читаемы, но вторичны. Их headings имеют явный local token. Landing reviews сохраняют filter/carousel logic и тексты данных.

## 7. Accessibility и воспроизводимость

WCAG AA устанавливает минимум 4.5:1 для обычного текста, 3:1 для достаточного крупного текста; проект целится минимум в 4.5:1 и для основных крупных headings, чтобы упростить проверку.[1]

Reflow проверяется на ширине 320 CSS px: смысловое двумерное содержимое вроде таблицы может прокручиваться локально; обычная проза не требует горизонтального скролла всей страницы.[2]

Text spacing override тестирует line-height 1.5, paragraph spacing 2em, letter-spacing 0.12em и word-spacing 0.16em без потери содержимого или функций. Это стресс-проверка пользовательских настроек, а не предлагаемый обычный tracking страницы.[3]

Обязательные проектные проверки: keyboard focus visible и не закрыт fixed UI; menu/search Escape и правильное возвращение фокуса; reduced-motion; 200% zoom; text selection; native options в dark/light; no-JS smoke для длинного контента. Все страницы проверяются на ширинах ROUTE-MATRIX.json, плюс narrow component containers.

Результаты сериализуются: route/theme/viewport/selector, measured style/font, expected vs actual, status, evidence path. Missing required selector -> failure. Технический pass не оценивает эстетическую удачность; VR04/VR14 требуют подлинного решения пользователя.

## 8. Бюджеты и внедрение

Предварительные budgets для пилота, не измеренные результаты: total font transfer <= исходного +15%; font-induced cold-load CLS <=0.05; никакой новой page-load анимации, мешающей чтению. Измерять тем же browser/network profile и отличать font-induced shift от других источников. Изменение budget требует отдельного решения.

Внедрение сначала isolated visual-tokens.css и pilot. После принятия — нормализовать существующие aliases --sl/--reader/--lunar/--ln. Избежать новой бесконечной стены !important; снять конкретные старые конфликтующие declarations с tests. Light aliases задаются на достаточной специфичности. В конце один ясный owner каждого токена и README каскада в decisions.md.

Не использовать CSS для скрытия source defects, переписывания текста, подмены broken links или предметных обозначений. Не менять JavaScript domain logic ради оформления.

## Sources

[1] https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
[2] https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
[3] https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html
