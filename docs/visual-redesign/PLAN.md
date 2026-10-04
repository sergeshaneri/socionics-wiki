# План визуального улучшения вики и протокол исполнения

Ветка: `visual/reading-experience`. Исходный HEAD и hashes — в `baseline.json`.
Статус документа: спецификация будущего редизайна; интерфейс этим пакетом ещё не изменён.

## 1. Цель и границы

Согласовать выразительную титульную типографику с непрерывным чтением длинных статей. Пользовательский ориентир — два скриншота Hermes: контрастная антиква на глубоком тёмном фоне в начале сессии; спокойный светло-серый sans-текст с ясным ритмом в правой панели документа.

Числа в DESIGN-SPEC.md — предлагаемая реконструкция, а не измерения скриншота. Шрифт референса не идентифицирован. Пилот нужен для проверки эстетического соответствия самим пользователем.

Сохраняются содержание, нотация, URL, base path, структурированные данные, тематические группы, цвета с предметным значением, реальные отзывы, цены и контакты. Логотип и название сайта отложены. Новые тексты, декоративные блоки и функции не добавляются. Публикация, коммиты, перестройка навигационной информации и редизайн внешних приложений не входят в текущую авторизацию.

## 2. Что установлено по исходникам

- `astro.config.mjs`: статический Astro/Starlight, base `/socionics-wiki`, override-компоненты; wiki custom CSS подключается через существующую конфигурацию.
- `src/styles/custom.css`: tokens → base → components → variant-c → light → responsive → article-reader → editorial. Поздние правила и `!important` определяют фактическую типографику.
- `article-reader.css` уже задаёт Inter Variable, 18px/1.75 при стандартном корневом размере, ограниченную прозу, отдельные таблицы и служебную навигацию. Это база для улучшения, а не код, который нужно заменить целиком.
- `editorial.css` позднее заменяет article h2 антиквой, задаёт собственные aliases и глобальный непрозрачный однотонный body. Он также отключает body::before. Добавленный раньше градиент без изменения каскада не будет виден.
- `MarkdownContent.astro` различает article и splash/category wrapper, сохраняет microdata Article. Критерий isArticle недостаточен для визуального различения всех специальных страниц; изменение классификации требует tests, а не удаления microdata.
- `LandingLayout.astro` и `landing.css` — отдельная dark-only система. `ai-socionics.astro` использует landing.css и собственные scoped tokens. `public/duality/index.html` имеет отдельную static boundary.
- `scripts/check-editorial.py` уже проверяет 3 route families в dark/light и двух ширинах; обязательный selector может быть молча пропущен. Его простой contrast расчёт не доказывает контраст поверх градиента. Старые проверки сохраняются, более строгие дополняют их.
- Node tests в `tests/*.test.mjs` обращаются к :4321. Другая фактическая dev-port требует отдельного решения runner, а не объявления успеха.
- Три предсуществующих dirty-файла защищены hashes: TypesHub.astro, aspekton-struktura.md, check-reader.py. Снимок digest охватывает исходные Markdown/MDX материалы; точное количество в baseline.json.

## 3. Последовательность

1. VR00: реально проверить routes, fonts, before и исходные дефекты.
2. VR01 + VR02: подготовить semantic tokens и проверки. Read-only аудит можно распараллелить; записи в общем рабочем дереве выполняются последовательно.
3. VR03: пилот только home + long-reader, три типографических варианта.
4. VR04: независимая проверка и выбор пользователем. До этого gate никакой раскатки по всему сайту.
5. VR05–VR08: shell, статьи/технический контент, hubs, специальные wiki страницы.
6. VR09–VR11: standalone услуги/отзывы, индивидуальная AI страница, локальная static boundary.
7. VR12: консолидация каскада, доступность и бюджеты.
8. VR13: независимый regression audit.
9. VR14: приёмка пользователем, итоговая передача. Разрешение на публикацию запрашивается отдельно.

Полный DAG и машинные acceptance IDs — в tasks.json. Если safe scope требует изменения protected файла или научной графики, исполнитель блокирует задачу с точным основанием.

## 4. Как распределяется работа

Координатор выдаёт один task packet, branch/root, agent ID, протокол, screenshot references и upstream handoffs. Реестр — `.harness/state.sqlite3`, а не этот Markdown. Исполнитель берёт задачу атомарно через claim и пишет только в write_scope. Рецензент независимо воспроизводит проверки, заполняет review, но не закрывает задачу. Координатор применяет переход accepted. Агент, следующий по DAG, начинает работу после accepted зависимости и читает её handoff.

Нужны роли: coordinator; typography/foundation; visual-test engineer; implementer конкретного page family; independent reviewer. Один и тот же агент может исполнять разные последовательные задачи, но не рецензировать собственную работу. Максимум один writer в текущем общем дереве. Несколько readers могут наблюдать одновременно; формальные визуальные приёмки выполняются на стабильном снимке, чтобы их доказательства не устаревали при изменениях writer.

## 5. Условия готовности всего редизайна

- Выполнены все принятия VR00–VR14 и оба подлинных human approvals.
- Матричный отчёт перечисляет все ожидаемые cells; `skipped`, missing selectors, непроверенные страницы и blocked routes не считаются завершением.
- Build, legacy Node checks, harness tests и новый visual suite проходят независимо.
- Содержание и защищённые dirty-файлы идентичны baseline. Standalone visible texts/data/prices также сопоставлены с before.
- Кириллица действительно отрисована утверждённым шрифтом; нет случайного fallback.
- Нет body overflow, обрезанных формул, потерянных функций или перекрытого фокуса.
- Before/after и измерения показывают соответствие выбранному направлению; технически зелёный suite не заменяет визуальную приёмку.
- Все исключения перечислены. Неадаптированная локальная static часть блокирует заявление «улучшен весь сайт»; внешние приложения явно обозначаются как вне контроля проекта.

## 6. Проверки и артефакты

ROUTE-MATRIX.json задаёт route sources, candidate URL, темы и viewports; VR00 проверяет реальную маршрутизацию и уточняет manifest при расхождении. Основные снимки: top/middle/footer статьи, верх главной и переход к материалам, hub с длинными названиями, applications CTA, landing long body, search/menu/native select states. Обязательны dark/light wiki и dark-only standalone.

После каждого вертикального среза: целевой RED → production minimum → GREEN → regression. Сначала измеримые asserts, затем осмотр screenshot. Для aesthetic exploration нет искусственного «теста красивости»: три варианта и решение пользователя.

Каждый evidence ID ссылается на реальный stdout/stderr+exit code либо существующий screenshot/report со SHA256. Произвольный успешный `print` не доказывает UI-критерий: рецензент проверяет релевантность evidence каждому acceptance ID. Harness проверяет целостность и процесс, а содержательную достаточность устанавливает независимая проверка.

## 7. Риски и откат

- Увеличение h1 может вытеснить начало статьи; проверять реальное viewport intersection, не только порядок DOM.
- Heavy/thin display начертания имеют разные метрики кириллицы. Проверять на русских строках и mobile.
- Article h2 rule может затронуть footer/service h2; локальные tokens и tests нужны каждому renderer.
- !important из variant-c/editorial/light может подавить новый фон или control ink; каскад проверяется после всех imports.
- Разные route families имеют разные layout contracts. Не импортировать Starlight CSS в standalone.
- Нельзя скрывать overflow глобально: это маскирует потерю данных в table/math.
- Build и screenshot runs одновременно создают нестабильные таймауты; в приёмке запускать их последовательно.
- Незакоммиченное рабочее дерево не переносится в worktree автоматически. Массовое параллельное редактирование до решения вопроса baseline исключено.

Откат: хранить собственный owned diff по задачам в evidence; применять только обратные изменения собственного task scope после проверки текущего состояния. Не использовать `git reset --hard`, `git clean`, общий stash или checkout protected файлов. После явного разрешения пользователя можно создать checkpoint только согласованных изменений; push по-прежнему отдельное действие.

## 8. Спецификации заданий

Каждая карточка ниже генерируется из tasks.json. При расхождении использовать task packet и блокировать работу до решения координатора.

### VR00 — Базовый снимок и проверяемый маршрутный инвентарь
Роль: baseline/QA; режим: edit; зависимости: нет; human gate: нет.
**Разрешённые записи:** `tests/visual/*`, `scripts/check-visual.py`, `docs/visual-redesign/ROUTE-MATRIX.json`.
**Прочитать:** `astro.config.mjs`, `src/content/docs/`, `src/components/MarkdownContent.astro`, `scripts/check-editorial.py`, `scripts/check-reader.py`, `docs/visual-redesign/baseline.json`.
**Работа:**
1. Начать с guard и git status. Запустить loopback preview с base /socionics-wiki; прочитать реально выбранный порт, не подменять чужой процесс.
2. Снять before: home и long-reader на 1440x1000 и 390x844; сохранить оба исходных референса. Пройти ROUTE-MATRIX.json и отметить source_present, HTTP статус, фактический режим, наличие Katex/table/diagram.
3. Снять computed styles, CDP actual Cyrillic font names и сетевой список font-ресурсов; получить исходные font bytes и cold font-load layout shift. Не выдать вычисленный font-family за реально использованный шрифт.
4. Создать tests/visual/baseline-report.json только в evidence; общий исходный baseline.json не обновлять. Зафиксировать существующие баги и результаты прежних проверок отдельно.

**Приёмка:**
- `VR00-C1`: guard подтверждает ветку и неизменность protected/content digest
- `VR00-C2`: Каждый route id имеет реальную проверку ответа или явный blocker; ничего не пропущено
- `VR00-C3`: before screenshots, font identities и baseline budgets сохранены с evidence IDs
- `VR00-C4`: Предсуществующие сбои отделены от новых; существующие scripts не изменены

**Передача:** handoff JSON со всеми acceptance IDs, реальными evidence IDs, screenshots/metrics, рисками и точным следующим шагом. Route IDs: home, long-reader, applications.


### VR01 — Токены, кириллические шрифты и карта каскада
Роль: design foundation; режим: edit; зависимости: VR00; human gate: нет.
**Разрешённые записи:** `src/styles/visual-tokens.css`, `src/styles/fonts.css`, `docs/visual-redesign/decisions.md`, `tests/visual/*`.
**Прочитать:** `src/styles/tokens.css`, `src/styles/editorial.css`, `src/styles/article-reader.css`, `src/styles/variants/variant-c.css`, `src/styles/themes/light.css`, `node_modules/@fontsource*/`.
**Работа:**
1. Внести семантические --visual-* токены из DESIGN-SPEC.md в отдельный файл; пока не подключать глобально, чтобы foundation не менял весь сайт до пилота.
2. Inter Variable для кириллического body и Cormorant Garamond для display — исходные кандидаты, не идентифицированные со скриншота. Проверить unicode coverage и фактически отрисованные буквы. Показать 400/450 body, 500/600 display; не добавлять семейство без конкретного недостатка текущих.
3. Для light определить собственные значения, aliases --reader/--lunar/--sl не должны сохранять dark значения по специфичности.
4. Составить decisions.md: активные imports, конфликтующие selectors, какие !important снимаются и почему. Тест контраста токенов до production правок; заголовки wrapper/anchor включить в карту.

**Приёмка:**
- `VR01-C1`: Все обязательные токены определены отдельно для dark/light, контраст вычислен
- `VR01-C2`: Кириллица подтверждена CDP; нет случайного font fallback и новых remote font requests
- `VR01-C3`: Новый font budget не превышает baseline +15%; превышение с причиной блокирует расширение
- `VR01-C4`: Внешний вид не-пилотных страниц пока не изменён

**Передача:** handoff JSON со всеми acceptance IDs, реальными evidence IDs, screenshots/metrics, рисками и точным следующим шагом. Route IDs: home, long-reader.


### VR02 — Детерминированные browser-тесты редизайна
Роль: test infrastructure; режим: edit; зависимости: VR00; human gate: нет.
**Разрешённые записи:** `scripts/check-visual.py`, `tests/visual/*`, `package.json`, `package-lock.json`.
**Прочитать:** `scripts/check-editorial.py`, `tests/updates.test.mjs`, `tests/applications-updates.test.mjs`, `docs/visual-redesign/ROUTE-MATRIX.json`.
**Работа:**
1. Применить TDD вертикальными срезами: selector/content coverage, viewport overflow, font identities, text sizes, focus, menu, theme, gradients; сначала показать целевой RED, затем минимальную проверку.
2. Использовать установленный uv/playwright путь; проектный npm playwright добавлять только при обосновании, не смешивать два runner. Base URL через WIKI_PREVIEW_URL, screenshots в evidence.
3. Проверки fail-closed: обязательный selector не найден -> failure. UI ошибки и failed internal assets -> failure. Отсутствующий настоящий Katex -> добавить isolated fixture, не объявлять покрытие выполненным.
4. Сохранять JSON с числом ожидаемых/пройденных/blocked cells, screenshot paths и browser version. Legacy tests fixed :4321 оставить, documented runner учитывать порт.

**Приёмка:**
- `VR02-C1`: Негативные сценарии тестов пойманы RED, новый runner воспроизводим
- `VR02-C2`: Число матричных cells вычисляется, пропуск не выглядит успехом
- `VR02-C3`: Проверки font/overflow/controls доступны отдельно от screenshot approval
- `VR02-C4`: Старые tests и scripts не переписаны ради зелёного результата

**Передача:** handoff JSON со всеми acceptance IDs, реальными evidence IDs, screenshots/metrics, рисками и точным следующим шагом. 


### VR03 — Пилот: главная и одна длинная статья
Роль: visual pilot; режим: edit; зависимости: VR01, VR02; human gate: нет.
**Разрешённые записи:** `src/styles/custom.css`, `src/styles/visual-pilot.css`, `src/styles/components/hero.css`, `src/styles/article-reader.css`, `src/styles/editorial.css`, `src/components/MarkdownContent.astro`, `src/lib/page-kind.mjs`, `tests/visual/*`.
**Прочитать:** `src/content/docs/index.mdx`, `src/content/docs/relations/metodologiya-opisaniya-ito-po-churyumovu.md`, `src/styles/variants/variant-c.css`, `docs/visual-redesign/DESIGN-SPEC.md`.
**Работа:**
1. Выполнить только home и long-reader. Сохранить текст, фото, ссылки и structured data. Page-kind helper тестировать до использования; не переклассифицировать schema Article без отдельного основания.
2. Home: антиква 48–72px desktop /32–44px mobile, непрозрачный subdued dark gradient, first-screen title + existing primary action. Без декоративного нового hero copy.
3. Article: 18px body/1.75/400, column 68–72ch with pixel ceiling; h1 serif 36–44px desktop, chapter h2 neutral sans 24–28px/500–600; service headings explicit 14–16px.
4. Предоставить 3 варианта на реальном контенте: A минимальное изменение, B нормативный основной, C более строгая титульная композиция. Варианты различаются типографикой/ритмом, не только цветом. Их можно показать отдельным ignored HTML comparison без switcher на продакшене.
5. До принятия VR04 не распространять на прочие routes. CSS contracts технически подтверждают изоляцию.

**Приёмка:**
- `VR03-C1`: home + article соответствуют численной типографике и soft-gradient спецификации
- `VR03-C2`: 3 варианта представлены screenshot comparison с исходными before
- `VR03-C3`: Пилот проходит dark/light desktop/mobile и сохраняет весь исходный контент
- `VR03-C4`: Не-пилотные routes не изменились, main action/first paragraph видимы без перекрытия

**Передача:** handoff JSON со всеми acceptance IDs, реальными evidence IDs, screenshots/metrics, рисками и точным следующим шагом. Route IDs: home, long-reader.


### VR04 — Выбор пилотного направления пользователем
Роль: design gate; режим: read; зависимости: VR03; human gate: да.
**Разрешённые записи:** только ignored evidence, исходники не менять.
**Прочитать:** `.harness/handoffs/VR03.json`, `docs/visual-redesign/evidence/VR03/`, `docs/visual-redesign/DESIGN-SPEC.md`.
**Работа:**
1. Независимо осмотреть screenshots и реальный длинный текст, повторить browser assertions на стабильном снимке.
2. Показать пользователю before/after, три варианта, предложить B как рабочую реконструкцию. Решение пользователя сохранить с дословным сообщением, не сочинять подтверждение.
3. Если нужен новый вариант: вернуть VR03 changes через координатора; не пропускать gate. Для accepted передать approval файл и конкретные выбранные values.

**Приёмка:**
- `VR04-C1`: Независимые execution и screenshot evidence существуют
- `VR04-C2`: Пользователь явно выбрал направление; сохранён подлинный user_message
- `VR04-C3`: Список принятых токенов и отклонённых вариантов передан следующим исполнителям

**Передача:** handoff JSON со всеми acceptance IDs, реальными evidence IDs, screenshots/metrics, рисками и точным следующим шагом. Route IDs: home, long-reader.


### VR05 — Шапка, боковая навигация, TOC и поиск
Роль: navigation; режим: edit; зависимости: VR04; human gate: нет.
**Разрешённые записи:** `src/styles/components/header.css`, `src/styles/components/sidebar.css`, `src/styles/components/breadcrumbs.css`, `src/styles/responsive.css`, `src/styles/editorial.css`, `src/components/PageSidebar.astro`, `src/components/HeadingAnchors.astro`, `src/components/NoirEnhancements.astro`, `tests/visual/*`.
**Прочитать:** `src/components/PageTitle.astro`, `src/components/SiteSocialIcons.astro`, `src/components/Breadcrumbs.astro`, `src/components/Head.astro`.
**Работа:**
1. Сделать непрозрачные navigation surfaces 14–16px; subordinate muted text с реальным контрастом, активный route отличим не только цветом.
2. Название сайта и логотип оставить прежними. Обеспечить отсутствие обрезания названия при согласованном mobile layout, не заменять название аббревиатурой.
3. Search dialog, mobile menu, theme native options и TOC проверить отдельно в dark/light. CSS-only предпочтителен; интерактивные правки лишь при доказанном regression.
4. Сохранить anchors, copied link, keyboard Tab/Escape, hash scrolling и top-nav links. Focus не перекрывается sticky header; menu закрывается предсказуемо.

**Приёмка:**
- `VR05-C1`: Menu/search/theme/TOC interactions работают мышью и клавиатурой
- `VR05-C2`: Активная навигация и native options читаемы в обеих темах
- `VR05-C3`: 44px основные touch targets, outline и focus visibility проверены
- `VR05-C4`: Логотип/название/URL/anchor IDs не изменены

**Передача:** handoff JSON со всеми acceptance IDs, реальными evidence IDs, screenshots/metrics, рисками и точным следующим шагом. Route IDs: home, long-reader, applications, category-types.


### VR06 — Статьи: цитаты, таблицы, формулы и медиа
Роль: technical reading; режим: edit; зависимости: VR04; human gate: нет.
**Разрешённые записи:** `src/styles/article-reader.css`, `src/styles/components/content.css`, `src/styles/katex.css`, `src/styles/editorial.css`, `src/components/MarkdownContent.astro`, `tests/visual/*`.
**Прочитать:** `src/content/docs/theory/meta/gipoteza-churyumova-gemini.md`, `src/content/docs/english/markdown-tables.md`, `src/components/Backlinks.astro`, `src/components/Footer.astro`.
**Работа:**
1. Распространить утверждённый reader только на содержательные articles. Списки с hanging indents, короткие markers subdued, blockquote без карточечной glow/лишней рамки.
2. Table и display math имеют свой local horizontal scrolling; никакого overflow-x:hidden на html/body ради зелёного теста. Inline math не переназначать Inter и не менять font metric Katex.
3. Картинки и схемы сохраняют пропорции/цвета/семантику; их радиусы зависят от класса, не от blanket img selector. Медиа frames fit container, captions 14–16px.
4. Backlinks, date, footer CTA, update feeds имеют служебную локальную типографику. Применить точный CTA ink после article a color; доказывать computed cascade.

**Приёмка:**
- `VR06-C1`: Long prose/list/table/math/media fixtures проходят проверки и осмотр
- `VR06-C2`: Нет обрезанных строк/формул; overflow локальный, вся страница fits
- `VR06-C3`: Служебные h2 подчинены статье, CTA text/fill имеет достаточный контраст
- `VR06-C4`: Content digest и scientific diagram semantics неизменны

**Передача:** handoff JSON со всеми acceptance IDs, реальными evidence IDs, screenshots/metrics, рисками и точным следующим шагом. Route IDs: long-reader, math-article, table-article, mirror, applications.


### VR07 — Каталоги типов, аспектов и категорий
Роль: hubs; режим: edit; зависимости: VR05, VR06; human gate: нет.
**Разрешённые записи:** `src/components/CategoryHub.astro`, `src/components/TaggedCategoryHub.astro`, `src/components/InformationElementsHub.astro`, `src/components/NoirCard.astro`, `src/styles/components/cards.css`, `src/styles/visual-hubs.css`, `src/styles/custom.css`, `tests/visual/*`.
**Прочитать:** `src/components/TypesHub.astro`, `src/content/docs/categories/`, `src/content/docs/information-elements/index.mdx`.
**Работа:**
1. Перенести family/spacing в hubs без превращения всех ссылок в одинаковые крупные SaaS карточки. Сохранить группы, порядок и категории.
2. TypesHub.astro защищён: читать можно, редактировать нельзя; допустимо внешнее narrowly-scoped CSS после анализа DOM. Нужен structural edit -> block и запрос пользователю, не обновлять baseline hash.
3. Оценить 320/390/768/1024/1440, narrow component container в широком viewport; длинные русские headings не режутся. Category filter/search states не изменяются.
4. Основной материал каталога предшествует supporting feeds; визуальные размеры служебных headings задать локально.

**Приёмка:**
- `VR07-C1`: Все 3 hub families сохранены по структуре/ссылкам/порядку
- `VR07-C2`: 320px и narrow-container layouts не обрезают подписи
- `VR07-C3`: Protected TypesHub идентичен исходному
- `VR07-C4`: Focus/hover/selected states проверены в dark/light

**Передача:** handoff JSON со всеми acceptance IDs, реальными evidence IDs, screenshots/metrics, рисками и точным следующим шагом. Route IDs: category-types, category-semantic, aspects.


### VR08 — Приложения, услуги, контакты, благодарность, архив и 404
Роль: wiki special pages; режим: edit; зависимости: VR05, VR06, VR07; human gate: нет.
**Разрешённые записи:** `src/components/ApplicationPreview.astro`, `src/components/ServiceCardFeatured.astro`, `src/components/ContactChannel.astro`, `src/components/ThanksCards.astro`, `src/components/PricingCard.astro`, `src/components/UpdatesFeed.astro`, `src/components/Suggestions404.astro`, `src/components/Backlinks.astro`, `src/components/Footer.astro`, `src/styles/visual-specials.css`, `src/styles/custom.css`, `tests/visual/*`.
**Прочитать:** `src/content/docs/applications.mdx`, `src/content/docs/services.mdx`, `src/content/docs/contact.mdx`, `src/content/docs/thanks.mdx`, `src/content/docs/404.mdx`.
**Работа:**
1. Оформить все перечисленные page families в принятой системе без изменений текста/цен/каналов связи/данных.
2. ApplicationPreview retain 5 previews, исходные изображения/launch ссылки/dimensions. Не редизайнить внешний iframe/site приложений и не внедрять свой JS внутрь.
3. Services/contacts/thanks preserve реальные CTA и пользовательский выбор канала. Не добавлять прямые messenger CTA вместо установленной политики.
4. UpdatesFeed и Backlinks сервисные заголовки 14–16px; dates readable; error page search/suggestions контрастны.

**Приёмка:**
- `VR08-C1`: Все специальные routes и internal assets реально загружаются
- `VR08-C2`: 5 application previews и launch links сохранены
- `VR08-C3`: Ни цены, ни контакты, ни update ordering не изменены
- `VR08-C4`: Legacy Node tests и component contrast checks зелёные

**Передача:** handoff JSON со всеми acceptance IDs, реальными evidence IDs, screenshots/metrics, рисками и точным следующим шагом. Route IDs: applications, services, contact, thanks, updates, not-found.


### VR09 — Четыре standalone услуги и отзывы
Роль: standalone landings; режим: edit; зависимости: VR04, VR08; human gate: нет.
**Разрешённые записи:** `src/styles/landing.css`, `src/styles/landing-visual.css`, `src/layouts/LandingLayout.astro`, `src/components/landing/LandingNav.astro`, `src/components/landing/LandingFooter.astro`, `src/components/landing/ReviewsCarousel.astro`, `src/components/landing/RelatedServices.astro`, `src/pages/typing.astro`, `src/pages/therapy.astro`, `src/pages/teo.astro`, `src/pages/human-design.astro`, `src/pages/reviews.astro`, `tests/visual/*`.
**Прочитать:** `src/data/reviews-*.json`, `src/lib/structured-data.ts`.
**Работа:**
1. Отдельный адаптер --ln-* к принятым semantic tokens, не импортировать custom.css/Starlight cascade. Эти пять страниц остаются dark-only.
2. Long body sections привести к 18px и устойчивому ритму, display Cormorant сохраняет editorial характер; убрать шумные яркие orbs/grain где мешают чтению. Непрозрачные реальные поверхности.
3. Сохранить все texts/prices/review data/filters/counters. Стиль может затронуть локальную разметку без изменения копирайта; доказать нормализованное равенство текста before/after.
4. Menu, review filters, carousel и anchor CTA проверить. reduced-motion и JS-disabled content не должны скрывать чтение; не заявлять zero repaint по CSS комментарию.

**Приёмка:**
- `VR09-C1`: Все четыре услуги и reviews имеют согласованную типографику
- `VR09-C2`: Content/text/data/price/SEO/canonical не изменились
- `VR09-C3`: Фильтры reviews, carousel, menu и CTA работают
- `VR09-C4`: Сохранена dark-only политика; motion и no-JS fallback проверены

**Передача:** handoff JSON со всеми acceptance IDs, реальными evidence IDs, screenshots/metrics, рисками и точным следующим шагом. Route IDs: typing, therapy, teo, human-design, reviews.


### VR10 — Индивидуальная страница материалов об ИИ
Роль: custom page; режим: edit; зависимости: VR09; human gate: нет.
**Разрешённые записи:** `src/pages/ai-socionics.astro`, `tests/visual/*`.
**Прочитать:** `src/styles/landing.css`, `src/pages/ai-socionics.astro`.
**Работа:**
1. ai-socionics импортирует landing.css, но имеет свои local --paper/--ink/gold и scoped styles: адаптировать их отдельно, не выдать покрытие landings за покрытие этой страницы.
2. Сохранить группировку материалов, featured links, QR и footer/reference copy. Apply body readability и сдержанный display без превращения ссылок в одинаковую сетку карточек.
3. Проверить QR asset resolution/base path, маленькие labels, длинные ссылки и mobile stacking.

**Приёмка:**
- `VR10-C1`: Своя scoped palette/typography согласована с системой
- `VR10-C2`: Все ссылки/QR/разделы и text content сохранены
- `VR10-C3`: Desktop/mobile contrast и focus проверены

**Передача:** handoff JSON со всеми acceptance IDs, реальными evidence IDs, screenshots/metrics, рисками и точным следующим шагом. Route IDs: ai-materials.


### VR11 — Локальная static duality: граница и адаптер
Роль: static boundary; режим: edit; зависимости: VR10; human gate: нет.
**Разрешённые записи:** `public/duality/visual-theme.css`, `public/duality/index.html`, `tests/visual/*`.
**Прочитать:** `public/duality/index.html`, `src/content/docs/applications.mdx`.
**Работа:**
1. Провести аудит public/duality/index.html: определить чужую/авторскую часть и наличие логики. Менять только CSS и подключение адаптера, не symbols/model/data/JS.
2. Если это собственный static entry, дать typography/surface adapter в принятой dark палитре. Если безопасно отделить CSS невозможно или права/смысл неясны — block и запрос пользователю; не молча объявлять весь сайт переделанным.
3. Внешние приложения проверить лишь на link contract. Документировать предел визуального контроля. Функциональные результаты static приложения before/after совпадают.

**Приёмка:**
- `VR11-C1`: Локальный static entry либо проверенно адаптирован, либо явно blocked до решения
- `VR11-C2`: Domain JS и scientific colors/labels неизменны
- `VR11-C3`: External application boundaries явно отражены в handoff

**Передача:** handoff JSON со всеми acceptance IDs, реальными evidence IDs, screenshots/metrics, рисками и точным следующим шагом. Route IDs: duality.


### VR12 — Консолидация CSS, доступность и измеримые бюджеты
Роль: integration/accessibility; режим: edit; зависимости: VR05, VR06, VR07, VR08, VR09, VR10, VR11; human gate: нет.
**Разрешённые записи:** `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/editorial.css`, `src/styles/article-reader.css`, `src/styles/variants/variant-c.css`, `src/styles/themes/light.css`, `src/styles/responsive.css`, `src/styles/custom.css`, `src/styles/visual-*.css`, `src/styles/landing*.css`, `tests/visual/*`, `scripts/check-visual.py`.
**Прочитать:** `docs/visual-redesign/decisions.md`, `docs/visual-redesign/ROUTE-MATRIX.json`.
**Работа:**
1. После утверждения убрать временные/мертвые конфликтующие typography declarations, не удаляя unrelated effects. Один владелец каждого semantic token, mode scales scoped; new !important только с точным documented legacy reason.
2. Прогнать text-spacing overrides и 200% zoom /320px reflow, contrast across real gradient underlays, focus not obscured, reduced motion, selections и native options.
3. Замерить font transfer и CLS тем же runner/profile/network baseline; font bytes <= baseline +15%, font-induced CLS <=0.05. Если увеличить budget нужно — block и запросить решение, не выдать число за достигнутое.
4. Build и browser screenshot suites последовательно; timeout under CPU load требует изолированного повторного запуска, а не ослабления asserts. Объяснить все existing warnings.

**Приёмка:**
- `VR12-C1`: All expected matrix cells выполнены или task blocked; skipped не accepted
- `VR12-C2`: Text/UI contrast, zoom/text spacing, focus и reduced motion проверены
- `VR12-C3`: Font budget/CLS измерены и соответствуют принятому порогу
- `VR12-C4`: Конфликтующие overrides сведены без content и semantics changes

**Передача:** handoff JSON со всеми acceptance IDs, реальными evidence IDs, screenshots/metrics, рисками и точным следующим шагом. 


### VR13 — Независимая регрессия и coverage audit
Роль: independent QA; режим: read; зависимости: VR12; human gate: нет.
**Разрешённые записи:** только ignored evidence, исходники не менять.
**Прочитать:** `.harness/handoffs/`, `src/`, `public/`, `tests/`, `docs/visual-redesign/`.
**Работа:**
1. Повторить полный build, Node tests, harness tests и visual runner на стабильном снимке, используя собственные evidence IDs. Не доверять только отчётам исполнителей.
2. Сопоставить actual CSS font rendered, screenshot layout и declared matrix counts; обязательный missing selector fail. Проверить нормализованные before/after texts standalone pages и весь content digest.
3. Обнаруженный regression возвращать соответствующему владельцу через coordinate changes, не править код самим. QA не обновляет screenshot golden ради результата.
4. Для каждой страницы дать status verified/blocked, evidence, число проверок и severity найденных defects. Проверить что выбранный home+reader сохраняют визуальный эффект референсов.

**Приёмка:**
- `VR13-C1`: Независимые реальные tests/build прошли, полный coverage accounting совпадает
- `VR13-C2`: Protected/content/texts/SEO/URLs и mathematical semantics сохранены
- `VR13-C3`: Нет открытых P0/P1 accessibility/function/reading regressions
- `VR13-C4`: Screenshots просмотрены, approvals не подменены машинными checks

**Передача:** handoff JSON со всеми acceptance IDs, реальными evidence IDs, screenshots/metrics, рисками и точным следующим шагом. 


### VR14 — Передача пользователю и решение о публикации
Роль: coordinator/release gate; режим: read; зависимости: VR13; human gate: да.
**Разрешённые записи:** только ignored evidence, исходники не менять.
**Прочитать:** `.harness/reviews/`, `docs/visual-redesign/`, `git diff`.
**Работа:**
1. Показать итоговую local URL, before/after главной/статьи/хаба/услуги, выбранные типографические values и список фактически проверенного.
2. Подготовить итоговый handoff с coverage totals, рисками, исключениями и планом отката только owned изменений. Пользовательские dirty files не включать в собственную будущую публикацию.
3. Получить явное одобрение визуального результата. Это не разрешение на commit/push: публикация требует отдельного запроса пользователя. Логотип остаётся отдельной последующей задачей.

**Приёмка:**
- `VR14-C1`: Итоговые screenshots/metrics/reports переданы и пользователь подтвердил оформление
- `VR14-C2`: Diff сохраняет protected files, content и branch isolation
- `VR14-C3`: Никаких commit/push/deploy без отдельного разрешения; rollback boundaries описаны

**Передача:** handoff JSON со всеми acceptance IDs, реальными evidence IDs, screenshots/metrics, рисками и точным следующим шагом. 
