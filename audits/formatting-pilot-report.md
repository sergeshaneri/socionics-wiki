# Пилот очистки Markdown-разметки

Дата: 2026-08-11

## Исходное состояние

- Ветка: `main`
- Исходный commit: `4ce60a9820c6b86177af880b195c2e85df63cd6b`
- Исходно изменённые файлы, исключённые из пилота:
  - `src/content/docs/beginners/metodichka.md`
- Ограничение: исправляется только Markdown/HTML-разметка; текст, пунктуация, регистр, URL и порядок смысловых фрагментов не меняются.

## Выбор пилота до исправлений

1. `src/content/docs/english/express-typing-questionaire.md` — пустые маркеры списков, создающие пустые элементы списка.
2. `src/content/docs/english/generations-therory-gemini-translation.md` — пустые маркеры списков и нумерации внутри сложных списков.
3. `src/content/docs/beginners/socionika-vvedenie-2016.md` — одиночные незакрытые маркеры `**` в начале и конце страницы.
4. `src/content/docs/beginners/zhil-byl-fraktal-2022.md` — одиночные незакрытые маркеры `**` в начале и конце страницы.
5. `src/content/docs/applied/oprosnik-ehkspress-tipirovanie-novoe.md` — пустые маркеры списков и нумерации между содержательными блоками.
6. `src/content/docs/applied/kak-prokachivat-bi.md` — одиночный незакрытый маркер `**` в конце страницы.
7. `src/content/docs/theory/formal/teoriya-pokolenij.md` — серия неразрывных пробелов, оставшаяся от внешнего редактора.
8. `src/content/docs/theory/meta/nabrosok-lsp-2017.md` — заголовок Markdown-таблицы расположен после separator-строки; таблица разбирается неверно.
9. `src/content/docs/information-elements/lsp-bl.md` — пустые элементы и разрывы вложенных Markdown-списков.
10. `src/content/docs/information-elements/obuchenie-bi.md` — многочисленные пустые маркеры списков и нумерации.
11. `src/content/docs/types/opisaniya-timov-ot-nejronok.md` — длинная страница; пустые элементы списка в описании СЛИ.
12. `src/content/docs/types/Баль 2.1 Семантика.md` — длинная страница; одиночный незакрытый маркер `**` в конце.

Все 12 страниц опубликованы (`draft: true` отсутствует), исходно чисты и представляют разные разделы. Сомнительные bold-only строки, которые лишь могут быть заголовками, заранее исключены из автоисправления.

## Результаты исправлений

- Проверено страниц: **12**.
- Исправлено страниц: **12**.
- Принято высокоуверенных кандидатов: **136 из 136**.
- Основные правки:
  - удалены пустые маркеры ненумерованных и нумерованных списков;
  - удалены standalone-строки `**`, не содержащие текста;
  - серия из четырёх NBSP заменена обычным пробельным разделением;
  - у первой таблицы `nabrosok-lsp-2017.md` восстановлен правильный порядок header/separator и удалена фиктивная пустая header-строка;
  - в четырёх файлах добавлен отсутствовавший конечный перевод строки.

### Правки по страницам

- `english/express-typing-questionaire.md` — удалены 28 строк с пустыми list markers разных уровней.
- `english/generations-therory-gemini-translation.md` — удалены 18 пустых list/ordered markers; добавлен финальный LF.
- `beginners/socionika-vvedenie-2016.md` — удалены две standalone-строки `**`.
- `beginners/zhil-byl-fraktal-2022.md` — удалены две standalone-строки `**`.
- `applied/oprosnik-ehkspress-tipirovanie-novoe.md` — удалены три пустых `*` и два пустых `3.`; добавлен финальный LF.
- `applied/kak-prokachivat-bi.md` — удалены две standalone-строки `**`.
- `theory/formal/teoriya-pokolenij.md` — удалены четыре NBSP; добавлен финальный LF.
- `theory/meta/nabrosok-lsp-2017.md` — исправлена первая Markdown-таблица; добавлен финальный LF.
- `information-elements/lsp-bl.md` — удалены 10 пустых `*`.
- `information-elements/obuchenie-bi.md` — удалены 62 пустых list/ordered markers.
- `types/opisaniya-timov-ot-nejronok.md` — удалены два пустых `*`.
- `types/Баль 2.1 Семантика.md` — удалены две standalone-строки `**`; после пользовательского визуального просмотра добавлена согласованная иерархия Markdown-заголовков для общего описания, восьми функций, смысловых уровней, групп и 16 интертипных отношений. Числовые и смысловые названия одного уровня не дублируются в оглавлении.

## Спорные места

Оставлены без изменения **3** случая:

1. `theory/formal/teoriya-pokolenij.md` — `**` прикреплены к началу первого и концу последнего содержательного текста. В браузере начальный маркер виден буквально, но без подтверждения исходного замысла пара не удалялась.
2. `theory/meta/nabrosok-lsp-2017.md` — аналогичная пара `**` охватывает большой фрагмент через множество абзацев и видна буквально; оставлена как сомнительная.
3. `theory/meta/nabrosok-lsp-2017.md` — строка `|||||` после первой строки данных может быть пустой строкой таблицы либо намеренным разделителем; оставлена.

Bold-only строки, которые лишь похожи на заголовки, не менялись.

## Независимая проверка

Отдельный read-only агент выдал вердикт **«принять» для 12 из 12 файлов**.

Проверка относилась к исходной механической правке пилота. Последующая согласованная с пользователем иерархия заголовков страницы `Баль 2.1 Семантика` проверена оркестратором по diff, сборкой и локальным рендером, но не входила в этот независимый вердикт.

- Содержательные токены, пунктуация, регистр, URL и порядок текста не менялись.
- Новые heading не создавались.
- Удалены только пустые элементы списков/нумерации, standalone-разделители `**`, NBSP и фиктивная table-header строка.
- Неблокирующая оговорка: удаление пустых ordered items сжимает отображаемую нумерацию; это ожидаемое устранение пустых `<li>`, а не перестановка содержательных пунктов.

## Техническая и визуальная проверка

- `git diff --check`: **пройдено**.
- Целевой повторный аудит: `node scripts/check-formatting-pilot.mjs` — **12/12 `textPreserved: true`**, оставшихся высокоуверенных пустых markers/NBSP нет.
- `npm.cmd run build`: **пройдено**, 377 страниц собрано. Остались прежние несвязанные предупреждения о коллизиях landing routes, browser-externalized `util` и крупных chunks; новых ошибок сборки нет.
- Новые битые ссылки: **нет** — URL в diff не менялись; сборка прошла.
- Новые битые code fences: **нет** — fences не менялись; сборка прошла.
- Таблицы: изменённая первая таблица `nabrosok-lsp-2017.md` имеет четыре корректных `<th>`: `Психические функции`, `Черты`, `Понятия`, `Соц. проявления`.
- Визуальная проверка: **12/12 страниц открыты локально и осмотрены**. Все имеют ожидаемый `h1`; на всех исправленных страницах DOM содержит **0 пустых `<li>`**. Страница `Баль 2.1 Семантика` проверена по каноническому URL `/socionics-wiki/types/баль-21-семантика/`.
- Повторная проверка `Баль 2.1 Семантика` после согласования заголовков: локальный рендер корректен; DOM содержит 11 `h2`, 67 `h3` и 8 `h4`; оглавление отражает функции и их смысловые уровни. `git diff --check` и `npm.cmd run build` пройдены 2026-08-12.
- Проверка сохранности текста: отдельный детерминированный checker сравнил рабочие файлы с `HEAD`, отбросив только разрешённые пустые markers/table separator/whitespace; **12/12 совпали**.

## Оценка метода и рекомендации

### Точность поиска

- Precision на высокоуверенных классах пилота: **100% (136/136 приняты независимым проверяющим)**.
- Recall не измерен: текущий общий `audit-content.mjs` почти целиком находит `suspected-heading` и пропускает standalone `**`, пустые list markers и пустые ordered markers.
- Новый `scripts/check-formatting-pilot.mjs` детерминирован, read-only относительно `src/content/docs`, проверяет сохранность видимого текста и повторное появление высокоуверенных дефектов на 12 страницах.

### Следующая волна

1. Добавить в отдельный candidate-report детекторы `empty-list-marker`, `empty-ordered-marker`, `dangling-standalone-strong` и `excess-nbsp`.
2. Не автоисправлять `suspected-heading`, прикреплённые `**`, пустые table rows и «склеенные» plain-text строки без ручного подтверждения.
3. Следующую волну ограничить 25–40 страницами; снова исключить исходно грязные и `draft: true`.
4. Для каждого файла запускать text-invariant checker, независимый diff review, build и DOM-проверку изменённых блоков.

### Самостоятельные commit оркестратора

Позже можно разрешить самостоятельный commit только для подтверждённых механических классов из этого пилота и только после чистых checker/build/review. Для heading, таблиц с неоднозначными пустыми строками и склеенных абзацев сохранить отдельное одобрение. До успешной второй волны автоматический commit всей массовой очистки не рекомендуется.

## Файлы, изменённые пилотом

### Контент — 12

- `src/content/docs/english/express-typing-questionaire.md`
- `src/content/docs/english/generations-therory-gemini-translation.md`
- `src/content/docs/beginners/socionika-vvedenie-2016.md`
- `src/content/docs/beginners/zhil-byl-fraktal-2022.md`
- `src/content/docs/applied/oprosnik-ehkspress-tipirovanie-novoe.md`
- `src/content/docs/applied/kak-prokachivat-bi.md`
- `src/content/docs/theory/formal/teoriya-pokolenij.md`
- `src/content/docs/theory/meta/nabrosok-lsp-2017.md`
- `src/content/docs/information-elements/lsp-bl.md`
- `src/content/docs/information-elements/obuchenie-bi.md`
- `src/content/docs/types/opisaniya-timov-ot-nejronok.md`
- `src/content/docs/types/Баль 2.1 Семантика.md`

### Служебные файлы — 2

- `scripts/check-formatting-pilot.mjs`
- `audits/formatting-pilot-report.md`

Исходно грязный `src/content/docs/beginners/metodichka.md` не изменялся пилотом и не входит в список.
