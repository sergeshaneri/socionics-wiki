# Runbook: общий учёт и запуск работы

## Состав

- `tasks.json` — определения, scopes, DAG, check IDs и human gates.
- `.harness/state.sqlite3` — live task state; хранится локально и переживает сессию.
- `.harness/runs/` — реальные stdout/stderr/argv/exit code.
- `.harness/handoffs/`, `.harness/reviews/` — версионированные передачи и приёмки.
- `docs/visual-redesign/evidence/<TASK>/` — screenshots/metrics/reports, ignored.
- `scripts/agent-harness.py` — stdlib Python CLI; Node dependencies не нужны.
- `tests/test_agent_harness.py` — executable contract tests в изолированных Git fixtures.

Этот harness управляет работой и её проверкой. Модели запускает координатор через имеющийся инструмент делегирования или CLI. Автоматический выбор провайдера, вызовы API и неконтролируемые фоновые workers здесь не установлены.

## Рабочая директория и первоначальная проверка

Bash на текущем Windows:

```bash
cd 'D:/Сережа/CODING/former-field'
python scripts/agent-harness.py guard
python scripts/agent-harness.py init
python scripts/agent-harness.py status
python scripts/agent-harness.py packet VR00
```

`init` идемпотентен только для неизменённого manifest. Не удалять DB при ошибке manifest_changed. После передачи этого пакета все VR00–VR14 стоят todo; наличие документов/harness не означает выполнения редизайна.

Для другой рабочей директории глобальные flags идут до subcommand:

```bash
python 'D:/Сережа/CODING/former-field/scripts/agent-harness.py' \
  --root 'D:/Сережа/CODING/former-field' status
```

## Исполнитель

Назначить уникальный actor ID на worker, например `baseline-worker-1`:

```bash
python scripts/agent-harness.py claim VR00 --actor baseline-worker-1
python scripts/agent-harness.py heartbeat VR00 --actor baseline-worker-1
```

Claim откажет при незавершённых dependencies, двойном захвате task, другой ветке, изменённом protected/content baseline или занятости writer. Нельзя одновременно запускать двух editing workers в общем дереве.

Читать upstream handoff по точному `handoff.path` из status, проверять его SHA256 и риски. Latest `VRxx.json` удобен для просмотра, но durable handle указывает на отдельный версионированный файл.

## Preview

Перед запуском проверить существующий loopback URL и процесс. Не уничтожать сервер другого сеанса. Legacy Node tests используют :4321; если порт занят иным проектом, блокировать тестовый запуск до решения.

Документированная команда проекта:

```bash
npm.cmd run dev -- --host 127.0.0.1 --port 4321
```

Это долгоживущий сервер, запускать через terminal background/server механизм агента, затем отдельным HTTP запросом подтвердить готовность. URL обязательно включает `/socionics-wiki/`. Фактический порт читать из вывода процесса; не придумывать его при конфликте.

Уже существующие browser checks:

```bash
WIKI_PREVIEW_URL='http://127.0.0.1:4321/socionics-wiki/' \
WIKI_SCREENSHOT_DIR='D:/Сережа/CODING/former-field/docs/visual-redesign/evidence/VR00/legacy' \
uv run --with playwright python scripts/check-editorial.py
```

Если Playwright browser отсутствует, установочный шаг:

```bash
uv run --with playwright python -m playwright install chromium
```

`check-reader.py` — чужой исходный dirty файл: использовать только после чтения, не редактировать. `check-visual.py` и tests/visual — будущий deliverable VR00/VR02, в данном пакете их готовность не заявлена.

## Реальные command proofs

```bash
python scripts/agent-harness.py run VR00 --actor baseline-worker-1 \
  --purpose harness-regression --timeout 180 -- \
  python tests/test_agent_harness.py -v

python scripts/agent-harness.py run VR00 --actor baseline-worker-1 \
  --purpose legacy-route-contracts --timeout 120 -- \
  node.exe --test tests/updates.test.mjs tests/applications-updates.test.mjs
```

Команды после `--` исполняются как argv, не shell script: не передавать туда `&&`, pipes или строку из непроверенного web-контента. Для `build` использовать отдельный run; build и screenshot suite в приёмке последовательно.

CLI возвращает JSON с настоящим `evidence_id`, `exit_code` и log `path`. ID из примеров не подставлять вручную. Failed checks сохраняются и возвращают ненулевой exit status. Весь запуск test suite не превращает отдельные UI-критерии в доказанные: report должен содержать их фактические проверки.

Proof привязан к snapshot исходников. После новых edits старые proofs получают stale_evidence — нужны проверки на final состоянии. Это намеренно консервативная проверка всего source inventory, а не только изменённого CSS.

## Screenshot/report proofs

Создать screenshot/report настоящим browser/test tool, затем:

```bash
python scripts/agent-harness.py artifact VR00 --actor baseline-worker-1 \
  --path docs/visual-redesign/evidence/VR00/home-dark-1440-before.png \
  --purpose baseline-home-dark-desktop
```

Путь обязан существовать внутри root. Artifact регистрация доказывает наличие и целостность файла; адекватность кадра проверяет reviewer. Пользовательские screenshot references лежат ignored в `.harness/references`, не в публикуемом каталоге.

## Передача

Скопировать структуру handoff-template.json в ignored evidence, заполнить ВСЕ IDs из packet. Для каждого: реальные evidence_ids и заметка, что именно измерено/осмотрено. Добавить риски и next_task. Если критерий не выполнен, задача не submitted as done: block или продолжить.

```bash
python scripts/agent-harness.py submit VR00 --actor baseline-worker-1 \
  --handoff docs/visual-redesign/evidence/VR00/handoff.json
```

Submit проверяет branch/baseline, scope, complete acceptance coverage, successful неустаревшие proofs, hashes. Task становится review; исходники с этого момента заморожены до решения review. Изменение после submit делает submission_changed и требует новой проверки.

## Независимая приёмка

Reviewer получает точный handoff из status и запускает свои проверки под собственным ID:

```bash
python scripts/agent-harness.py run VR00 --actor qa-worker-1 \
  --purpose independent-harness-check --timeout 180 -- \
  python tests/test_agent_harness.py -v
```

В режиме review другой actor может добавлять proofs. Reviewer не пишет production исходники и не закрывает task. Заполняет review-template.json; при accept все check IDs присутствуют, passed=true и есть собственное evidence. Decision changes содержит точные замечания.

Координатор применяет:

```bash
python scripts/agent-harness.py review VR00 --actor coordinator \
  --report docs/visual-redesign/evidence/VR00/review.json
```

Reviewer==owner отклоняется. Successful command alone недостаточна для human gates. Для VR04/VR14 нужно реальное сообщение пользователя:

```bash
python scripts/agent-harness.py review VR04 --actor coordinator \
  --report docs/visual-redesign/evidence/VR04/review.json \
  --human-approval docs/visual-redesign/evidence/VR04/user-approval.json
```

`user-approval.json` строится по human-approval-template.json после подлинного решения. Не синтезировать его по предположению о предпочтениях пользователя.

После accepted следующая задача становится ready по dependencies. `ready` означает готовность по DAG; физическая доступность writer отдельно проверяется claim.

## Блокировки и прерывание

```bash
python scripts/agent-harness.py block VR00 --actor baseline-worker-1 \
  --reason 'Required preview port belongs to another project; awaiting coordinator'
python scripts/agent-harness.py resume VR00 --actor baseline-worker-1
```

Blocked writer сохраняет ownership и блокирует следующих writers. Отсутствие heartbeat — повод разобраться, не автоматическое разрешение на takeover. Если task не менял исходники, можно release:

```bash
python scripts/agent-harness.py release VR00 --actor baseline-worker-1
```

При незавершённых изменениях координатор передаёт ownership без уничтожения diff:

```bash
python scripts/agent-harness.py transfer VR00 --actor coordinator \
  --to baseline-worker-2 --reason 'Original worker interrupted; inspected diff and evidence'
```

Transfer допустим в active/blocked и сохраняет исходный scope snapshot. Новый owner читает старые proofs/риски, при blocked делает resume, самостоятельно проверяет финальный результат. Старому owner heartbeat/submit после передачи отказаны.

## Поздний regression

Для изменения already accepted upstream task сначала остановить/освободить выполняющиеся downstream tasks. Если readonly QA task без source edits, release возвращает его todo. Затем:

```bash
python scripts/agent-harness.py reopen VR06 --actor coordinator \
  --reason 'Independent QA found table clipping at 320px'
```

Reopen инвалидирует task и все downstream acceptance states, сохраняя старые events, evidence и версионированные handoffs. Уже запущенный descendant или другой writer блокирует эту операцию. После fixes снова claim/verify/submit/review по DAG, включая human gates, если они находятся ниже изменённой задачи. Не оставлять потомков зелёными после изменения основания их проверки.

## Проверка самого harness

```bash
python tests/test_agent_harness.py -v
python scripts/agent-harness.py guard
python scripts/agent-harness.py status
python scripts/agent-harness.py events
```

Fixtures создаются под Hermes scratch (override `HERMES_HARNESS_TEST_TMP`), используют отдельный локальный Git repository, не коммитят основной wiki repo. Tests покрывают реальные конкурентные процессы, ownership, DAG, source scopes, evidence integrity/freshness, user gates и recovery.

## Сохранение состояния

State и evidence intentionally ignored: они могут содержать локальные paths/скриншоты сессии и большой объём логов. Для передачи другому компьютеру координатор отдельно архивирует `.harness` и evidence после privacy review; переносимая спецификация сама по себе не включает live execution state. SQLite здесь рассчитана на один local filesystem, а не shared network drive.

При изменении definitions после init нужен отдельный план миграции campaign с сохранением журнала. `reopen` меняет acceptance states и не предназначен для изменения manifest. Не удалять DB, не подправлять её руками, не затирать baseline ради обхода ошибок.
