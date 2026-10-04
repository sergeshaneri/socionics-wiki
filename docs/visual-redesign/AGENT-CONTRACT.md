# Контракт субагента и передачи работы

## Обязательный старт

Прочитать CLAUDE.md, AGENTS.md, PLAN.md, DESIGN-SPEC.md, RUNBOOK.md и task packet. Работать только в `D:/Сережа/CODING/former-field`, ветка `visual/reading-experience`. Выполнить guard и status до claim. Не начинать зависимую задачу до accepted всех depends_on.

Исходники референсов доступны локально: `.harness/references/reader.png` и `.harness/references/title.png`. Это ignored приватные копии: не включать screenshots с содержимым сессии в публикацию автоматически. При делегировании vision-агенту координатор передаёт эти paths через images. Если референс не виден — сообщить об этом; не приписывать ему точный шрифт.

## Роли и полномочия

- **Coordinator:** владелец DAG, выдаёт scope, проверяет целостность и применяет review. Только он обозначен в coordinators manifest.
- **Implementer:** claim, minimal edits, реальные проверки, submit. Самоприёмка запрещена.
- **Independent reviewer:** read-only review другой работы; сам запускает проверки с собственным actor ID, осматривает screenshots, пишет review JSON.
- **User:** выбирает пилот и принимает окончательное оформление. Agent approval не заменяет user approval.

Actor ID — протокольное имя, не аутентификация. Harness не является sandbox: агент с доступом к файловой системе может его обойти. Он защищает дисциплину и фиксирует нарушения при приёмке, а не обеспечивает безопасность от злонамеренного участника.

## Учёт и ownership

Единый authoritative state — `.harness/state.sqlite3`: SQLite транзакции, task statuses, owner/heartbeat, evidence rows и append-only событийный журнал на уровне CLI. tasks.json хранит определения, не live statuses. Не редактировать DB/журнал вручную, не вести второй JSON-реестр «done».

Статусы: todo → active → review → accepted. blocked хранит причину; resume возвращает owner в active. review changes возвращает задачу владельцу. Зависимости разблокируются только accepted.

Claim атомарен: две конкурентные попытки не получают один task. В общем working tree один writer в active/review/blocked. Несколько readers допустимы, но visual acceptance проводится после стабилизации исходников. Scope readers учитывает известных writers: diff их разрешённых файлов не приписывается reader автоматически. Attribution внутри общей директории требует независимой проверки; это известное ограничение, а не доказательство отсутствия любых чужих записей.

Blocked writer удерживает lock: сначала разрешить вопрос/передать незавершённую работу, потом запускать следующего writer. Heartbeat не даёт автоматического права украсть задачу. Release допустим только при отсутствии изменений с момента claim. При прерывании owner координатор читает состояние, проверяет diff/evidence и применяет transfer с причиной и новым owner; scope snapshot сохраняется, незавершённые изменения не сбрасываются.

Поздний regression accepted задачи обрабатывается через coordinator reopen. Её acceptance и все downstream acceptance states инвалидируются; действующий descendant должен сначала прекратить работу/release. Старые события, proofs и версионированные handoffs сохраняются. После fixes требуется повторная цепочка проверок, включая downstream human gates. Изменение manifest этим не разрешается.

## Scope

Писать только в write_scope task. Дополнительно разрешены ignored `.harness/` и `docs/visual-redesign/evidence/<TASK>/` для артефактов. Generated dist/.astro/node_modules не source deliverables; не менять их вручную.

Запрещены commits, push, deployment, reset/clean/stash чужого дерева, редактирование protected-файлов, содержания src/content/docs, научной семантики и незаявленных функций. Source-content digest и protected hashes проверяются при командах. Обновлять baseline ради обхода запрета нельзя.

Если нужны записи вне scope: block с exact file/reason, представить минимальный новый scope координатору. Definitions заморожены checksum после init. Изменение задач требует отдельной спланированной миграции/новой кампании с сохранением старого журнала; удалять state.sqlite3 ради «re-init» запрещено.

## Доказательства

Command evidence создаёт `run`: argv без shell, cwd, UTC started/finished, stdout, stderr и реальный exit code. Artifact evidence регистрирует существующий screenshot/report через artifact и сохраняет SHA256. Failed run сохраняется как failed evidence, а не исчезает. Timeout=124 требует проверки дочерних процессов; сам timeout не гарантирует остановку всего дерева браузера/Node.

Все acceptance IDs должны ссылаться на релевантные evidence IDs. Рецензент должен иметь собственное evidence для каждого критерия. Один общий report допускается для нескольких критериев лишь если действительно содержит проверку каждого. `print('passed')` сам по себе не доказательство соответствия UI.

Хеши подтверждают целостность файла с момента регистрации. Рецензент проверяет его содержание, URL/route/viewport, выполнение реальной команды и отсутствие fabricated metrics. Для скриншота нужен visual inspection, для design gate — настоящее сообщение пользователя.

Каждый proof также связан со snapshot исходников. Изменение исходников после проверки делает proof stale_evidence: выполнить релевантные checks на final состоянии заново. Это включает консервативный freeze общего дерева, а не только конкретного stylesheet. Не редактировать служебную документацию после финальных proofs до завершения review.

## Handoff

Шаблон handoff-template.json: task_id, summary, acceptance map с evidence_ids и note, risks, next_task. Перед submit владелец добавляет build/tests и screenshot IDs, точные границы реализации, оставшиеся ограничения. Harness дописывает changed_files и freeze snapshot. После submit source changes запрещены; они делают приёмку устаревшей. Если требуются fixes, сначала review changes, затем новые checks и повторный submit.

Следующий агент получает task packet и handoff зависимостей из `.harness/handoffs/`. Он обязан прочитать changes/risks/decisions, подтвердить guard и самостоятельно проверить совместимость интерфейсов. Получение чужого handoff не доказывает завершение его acceptance criteria.

Точный durable handle с path/SHA256 возвращает status. Latest `<TASK>.json` используется как удобная копия; версионированный файл остаётся неизменным после повторных submit/reopen.

## Review

review-template.json содержит reviewer, decision accept/changes, все acceptance IDs, passed и evidence_ids. Coordinator применяет переход, а не поручает child закрыть задачу. Accept проверяет отличие reviewer/owner, хеши handoff/evidence, прежние successful proofs, независимые proof actor IDs и неизменность submission snapshot. Весь source tree freeze проверяется; ignored evidence можно добавлять.

Human gates VR04 и VR14 дополнительно требуют human-approval-template.json с дословным user_message и decision approved. Это протокольный документ, не техническая подпись пользователя. Координатор несёт ответственность за подлинность записи. Approval результата не означает разрешения на commit/push.

## Формат ответа субагента

Возвращать JSON или короткий русский отчёт:

- task_id, current status и owner;
- изменённые paths и существующий handoff path;
- реальные evidence IDs, commands/exit codes и screenshot paths;
- acceptance coverage: выполненные, failed, blocked IDs;
- риски, нерешённые вопросы и следующий task;
- фактические limits verification.

Не писать «всё готово» при пропущенных проверках. Parent перепроверяет handles и переходы в DB. Внешние side effects здесь не разрешены. Между сессиями сохраняются файлы/DB; делегированный процесс не считается durable job и может быть прерван.
