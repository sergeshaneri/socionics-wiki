# Вторая волна очистки Markdown-разметки

Дата: 2026-08-14

## Исходное состояние

- Ветка: `main`
- Исходный commit: `2f5816e4cb423edd665b5e26ce69abbce5d2c25f`
- Исходно грязные файлы: отсутствуют.
- После начала работы свежий общий аудит перегенерировал отчёты в `audits/`; контент до выбора волны оставался чистым.
- Ограничение: меняется только Markdown-разметка и пробельные артефакты. Слова, пунктуация, регистр, URL и порядок текста не меняются.

## Выбор второй волны до исправлений

Выбрано 30 опубликованных страниц. `src/content/docs/beginners/metodichka.md` исключена: она уже проходила отдельный ручной ремонт, а найденная пара `**` находится внутри большого документа.

### Пустые list/ordered markers

| Файл | Кандидаты |
| --- | ---: |
| `information-elements/tezaurus-s-opredeleniyami-gemini.md` | 414 |
| `information-elements/lsp-bi.md` | 367 |
| `english/ni-thesaurus.md` | 74 |
| `information-elements/tezaurus-bi.md` | 74 |
| `signs/tm-sistema-priznaki-statya.md` | 27 |
| `functions/model-a-ot-gemini.md` | 26 |
| `information-elements/2026 may/Омонимы (полисемия).md` | 24 |
| `theory/meta/kvantovoe-tipirovanie-gemini.md` | 20 |
| `theory/formal/poryadok-churyumova-novoe.md` | 13 |
| `signs/dihotomii-spravochnik.md` | 4 |
| `english/dichotomies-formulas.md` | 4 |
| `english/ti-te-language.md` | 3 |
| `theory/meta/filosofiya-socioniki-gemini.md` | 3, требуется проверка отображаемой нумерации |
| `functions/ifo-interfunkcionalnye-otnosheniya.md` | 1 |
| `functions/kak-interpretirovat-model-a-ito.md` | 1 |

### Standalone-строки `**`

По две строки в каждом файле, кроме `mnogourovnevaya-aksiomatika-2024.md`, где найдено четыре:

- `theory/meta/mnogourovnevaya-aksiomatika-2024.md`
- `signs/dihotomii-spravochnik.md`
- `functions/ifo-interfunkcionalnye-otnosheniya.md`
- `functions/kak-interpretirovat-model-a-ito.md`
- `types/ЛИЭ Семантика (2016).md`
- `applied/analiz-ani-kozhanovoj-o-prinyatii.md`
- `applied/bolevaya-na-praktike.md`
- `applied/razbor-urganta.md`
- `applied/semantika-dlya-tipirovaniya.md`
- `applied/zametki-po-tipirovaniyu.md`
- `english/Churiumov's Correspondence.md`
- `english/Demo-Ari formula.md`
- `english/English socionics обрывки.md`
- `english/Formal Socionics.md`
- `english/Fractal logic of the paterns in hadamard matrix.md`
- `functions/blok-id-semantika.md`
- `functions/bolevaya-zametki.md`
- `functions/informacionnyj-metabolizm-funkcii-yunga.md`

### NBSP

- `types/ЛИЭ Семантика (2016).md`, L55: три trailing NBSP после `Блок СУПЕРЭГО`.

## Результаты исправлений

- Проверено и исправлено: **30/30 страниц**.
- Удалено: **1055** пустых list/ordered markers и **38** standalone-строк `**`, всего **1093** пустых маркера.
- В `types/ЛИЭ Семантика (2016).md` удалены ровно три trailing NBSP после `Блок СУПЕРЭГО`: общее число NBSP изменилось с 32 до 29.
- Во всех 30 файлах нормализованы только trailing whitespace и пустоты в конце файла, где они присутствовали.
- Слова, внутренняя пунктуация, регистр, порядок, ссылки, заголовки и содержимое code fences сохранены.
- Независимый проверяющий принял **30/30 файлов**, исключений нет.
- `theory/meta/filosofiya-socioniki-gemini.md`: удалены только пустые пункты `1.`, `3.`, `4.`; содержательный пункт `2. От Гуссерля…` сохранен. Сжатие отображаемой нумерации ожидаемое.

## Спорные места

- Спорных исправлений во второй волне: **0**.
- `beginners/metodichka.md` намеренно не включена: отдельный ручной ремонт уже выполнен, а автоматическое удаление пары `**` без локального смыслового разбора было бы небезопасно.
- Общие сгенерированные отчеты свежего `npm run audit` не являются контентными исправлениями этой волны. Они остаются отдельными измененными generated outputs; ее собственный отчет хранится в этом файле.

## Техническая и визуальная проверка

- `git diff --check -- src/content/docs`: без ошибок.
- `node scripts/check-formatting-wave-2.mjs`: 30/30, точный scope файлов подтвержден; текстовый инвариант и code fences совпадают; остаточных кандидатов нет; NBSP delta равен 3 только в `ЛИЭ Семантика (2016).md`.
- `npm.cmd run build`: успешно, собрано **389 страниц**. Остались известные предупреждения о дублирующихся маршрутах `/human-design-landing`, `/typing-landing` и `/404`; новых ошибок нет.
- DOM-проверка локального dev-сервера: **30/30 страниц** открылись; на каждой есть `h1`, нет пустых `li`, нет абзацев из literal `**`, нет горизонтального overflow.
- Визуально просмотрены верхние области шести страниц и измененные участки ниже по трем крупнейшим/особым страницам: `tezaurus-s-opredeleniyami-gemini`, `lsp-bi`, `filosofiya-socioniki-gemini`, `analiz-ani-kozhanovoj-o-prinyatii`, `ЛИЭ Семантика (2016)`, `ni-thesaurus`. Разрывов списков, пустых элементов и визуального overflow не обнаружено.
