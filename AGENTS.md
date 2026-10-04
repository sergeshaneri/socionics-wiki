# AGENTS.md

Read `CLAUDE.md` first; its scope and publishing constraints remain in force.

For the visual-redesign campaign also read:
1. `docs/visual-redesign/PLAN.md`
2. `docs/visual-redesign/DESIGN-SPEC.md`
3. `docs/visual-redesign/AGENT-CONTRACT.md`
4. `docs/visual-redesign/RUNBOOK.md`

Repository: `D:/Сережа/CODING/former-field`; branch: `visual/reading-experience`.
Run `python scripts/agent-harness.py guard` and `status`; claim a task before edits.
Use its packet, dependencies and write_scope. The SQLite harness is the shared
live register. Do not invent a separate completion ledger.

One writer in this shared working tree; read-only reviews may run in parallel.
No commits, push, deployment or destructive Git operations without explicit user
approval. Preserve content, domain notation and scientific diagram semantics.
Logo work is deferred.

Protected pre-existing dirty files:
- `src/components/TypesHub.astro`
- `src/content/docs/information-elements/aspekton-struktura.md`
- `scripts/check-reader.py`

Real tests and evidence precede acceptance. An independent reviewer supplies
proofs; the coordinator applies the transition. VR04 and VR14 require genuine
user approval. Actor names are workflow identities, not authentication; the
harness is not a security sandbox or an autonomous model launcher.

Outside this campaign follow CLAUDE.md. This file does not authorize changes to
other repositories, Hermes profiles, production or external services.
