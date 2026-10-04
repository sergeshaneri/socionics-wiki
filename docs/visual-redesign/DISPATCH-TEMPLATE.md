# Шаблон выдачи задания субагенту

Использовать вместе с `packet <TASK>`; координатор подставляет реальные значения. Этот файл задаёт контракт запуска, а не автоматически вызывает модель.

## Implementer

```text
Выполни только TASK_ID в D:/Сережа/CODING/former-field, ветка visual/reading-experience.
Прочитай CLAUDE.md, AGENTS.md, PLAN.md, DESIGN-SPEC.md, AGENT-CONTRACT.md и RUNBOOK.md.
Полученный task packet содержит роль, dependencies, write_scope и acceptance IDs.
Сначала guard/status, затем claim --actor ACTOR_ID. Если dependency не accepted — остановись.
Прочитай exact upstream handoff paths из status, включая решения пользователя и риски.
Не меняй ничего вне write_scope; protected files и src/content/docs сохраняй побайтно.
Логотип, URL, научную семантику, цены/контакты и отзывы не менять.
Один writer; commits/push/deploy/destructive Git запрещены без отдельного разрешения.
Применяй RED → минимальный production change → GREEN вертикальными срезами.
Проверки и screenshots сохраняй настоящими tools; регистрируй через run/artifact.
Не объявляй missing selector, timeout или skipped проверкой passed.
Для final acceptance все proofs должны соответствовать final source snapshot.
Заполни все check IDs в handoff JSON, укажи measured results, ограничения и next_task.
Сделай submit, но не review/accept собственной задачи.
При blocker примени block с точным файлом/причиной, верни координатору вопрос.
Ответ по-русски: task_id/status/owner, paths, evidence IDs/exit codes, coverage, risks.
```

К packet приложить:

- `.harness/references/reader.png` и `.harness/references/title.png` через vision/images;
- только необходимые source paths из read_scope;
- exact upstream handoff handles и принятую версию токенов;
- текущий проверенный preview URL с base;
- actor ID, root/branch и ограничения выше.

## Independent reviewer

```text
Проверь TASK_ID другого исполнителя без правок production кода.
Прочитай task packet, handoff из status и соответствующие source/reference screenshots.
Выполни guard, проверь actual changed files против scope.
Не принимай заявленный pass без собственного выполнения/осмотра.
Запускай независимые checks через run под REVIEWER_ID в статусе review.
Зарегистрируй независимые screenshot/report artifacts; проверь каждый acceptance ID.
Укажи реальные expected/actual, commands/exit codes, skipped/blocked и severity defects.
При нарушениях подготовь decision=changes с конкретными исправлениями.
При соответствии подготовь decision=accept с passed=true и собственным evidence для каждого ID.
Не вызывай координаторский review, не закрывай task и не подменяй human approval.
Верни exact review path, evidence IDs, ограничения и окончательный recommendation.
```

## Действия координатора

1. Проверить root/branch, status и dependencies.
2. Отправить один self-contained packet implementer; не полагаться на знание им этого чата.
3. Если параллельно есть readers, явно запретить им source writes. Второй writer в общем дереве не запускать.
4. После submit зафиксировать stable snapshot и назначить другого reviewer.
5. Проверить реальные handles, hashes и достаточность proofs. Child self-report — основание для проверки, не подтверждение исполнения.
6. Применить review; для VR04/VR14 получить настоящее решение пользователя.
7. Передать accepted handoff следующему агенту; при reopen инвалидировать downstream approvals.
8. При прерывании child: state/diff review → transfer с причиной. Не предполагать, что child завершил действие.

При использовании фонового делегирования не опрашивать бесконечно child transcripts вместо результата. Сохранять state в harness, а ограниченную задачу выдавать с полным контекстом. Модельный worker не считается durable job после завершения родительской сессии.
