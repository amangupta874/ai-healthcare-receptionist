# tasks.md - MASTER CHECKLIST
Rules: tick `[x]` only when done AND tested. Stop at the end of each GATE and wait for user approval.
Every PRD requirement ID must map to a task (see traceability at bottom).

## GATE 0 - Idea, setup check (user-owned)
- [ ] 0.1 Idea + twist confirmed (Hindi/Hinglish, manager-approved knowledge, document-to-draft)
- [ ] 0.2 docs/PREREQUISITES.md completed by user (tools, bot token, LLM key)
- [ ] 0.3 Git repo initialised; first commit made
- [ ] 0.4 Agent confirms it has read rules.md, SPEC, PRD, ARCHITECTURE

## GATE 1 - Research, users, PRD (steps 2, 3, 4)
- [ ] 1.1 Fill docs/RESEARCH.md with sourced web research (competitors, usage, market size, gaps)
- [ ] 1.2 Review/improve docs/USERS.md (personas, problems)
- [ ] 1.3 Review/improve docs/PRD.md; list open questions; get user decisions (patient verification, escalation channel, one-bot-multi-clinic, LLM provider)
- [ ] 1.4 Record decisions in docs/DECISIONS.md
- [ ] 1.5 Create docs/PROGRESS.md
**STOP - user approval**

## GATE 2 - Tech stack, architecture, design (steps 5, 6, 7)
- [ ] 2.1 Confirm tech stack versions (check official docs); write to docs/DECISIONS.md
- [ ] 2.2 Refine docs/ARCHITECTURE.md: final data model, API contract (OpenAPI file `backend/openapi.yaml`), LangGraph node diagram (mermaid)
- [ ] 2.3 Refine docs/CONVERSATION_DESIGN.md: every flow, button texts, error messages in EN/HI/Hinglish
- [ ] 2.4 Define agent tool schemas (name, input, output, errors) in docs/TOOLS.md
**STOP - user approval**

## GATE 3 - Rules and tasks (steps 8, 9)
- [ ] 3.1 Review rules.md; propose additions; update `.agent/rules/` copy, AGENTS.md, GEMINI.md consistently
- [ ] 3.2 Expand this file: break each phase below into small subtasks linked to PRD IDs
- [ ] 3.3 Fill traceability table (requirement -> task -> test)
**STOP - user approval**

## GATE 4 - Development (step 11), one phase at a time
### Phase 4.1 Project setup
- [ ] 4.1.1 Folder structure, backend TS project, agent Python project (pyproject/requirements), lint/format configs
- [ ] 4.1.2 docker-compose PostgreSQL works; `.env` loading; config validation
- [ ] 4.1.3 CI-ready scripts (test, lint) in both services
### Phase 4.2 Backend (S-02, S-03, P-03..P-08, M-01..M-04, M-08)
- [ ] 4.2.1 Prisma schema + migrations + seed (demo clinic, doctors, schedules)
- [ ] 4.2.2 Service auth middleware; identity resolve; role + clinic middleware
- [ ] 4.2.3 Invite-code manager linking
- [ ] 4.2.4 Clinic, doctor, schedule CRUD (manager only)
- [ ] 4.2.5 Availability computation (hours, slot size, booked, leave, past)
- [ ] 4.2.6 Appointment booking transaction, partial unique index, idempotency, booking code
- [ ] 4.2.7 Patient verification + attempt limiting
- [ ] 4.2.8 Lookup, cancel, reschedule (confirmation token required)
- [ ] 4.2.9 Knowledge items + drafts + approve/reject endpoints
- [ ] 4.2.10 Escalation endpoints
- [ ] 4.2.11 Audit log on every state change
- [ ] 4.2.12 Error format, validation, rate limiting, health endpoint
- [ ] 4.2.13 Backend tests (unit + integration) pass
### Phase 4.3 Telegram + webhook (S-01, S-04)
- [ ] 4.3.1 FastAPI app, /webhook with secret token validation, /health
- [ ] 4.3.2 Telegram client: send text, inline keyboards, callback queries, file download
- [ ] 4.3.3 Set-webhook script; local dev via ngrok documented
- [ ] 4.3.4 Update parsing for messages, callbacks, documents
### Phase 4.4 Agent - patient flows (P-01..P-11, S-05)
- [ ] 4.4.1 LangGraph skeleton + checkpointer + per-chat state
- [ ] 4.4.2 Language detection (HI / EN / Hinglish) and reply-language logic
- [ ] 4.4.3 Safety gate (medical advice, emergency, prompt injection)
- [ ] 4.4.4 Intent router
- [ ] 4.4.5 Backend tool wrappers with Pydantic schemas + error handling
- [ ] 4.4.6 FAQ, doctor discovery, availability nodes
- [ ] 4.4.7 Booking flow with interrupt-based confirmation
- [ ] 4.4.8 Verify + lookup + cancel + reschedule flows with confirmation
- [ ] 4.4.9 Escalation node
- [ ] 4.4.10 Agent tests with mocked LLM and mocked backend
### Phase 4.5 Manager + document workflow (M-01..M-09)
- [ ] 4.5.1 Manager menu and guided setup flows
- [ ] 4.5.2 Document upload validation and download
- [ ] 4.5.3 PDF/DOCX text extraction; OCR for scans (eng+hin)
- [ ] 4.5.4 LLM structured extraction (rules, timings, fees, FAQ candidates, conflicts, missing)
- [ ] 4.5.5 Draft review UI in chat, clarification loop, edit/reject
- [ ] 4.5.6 Approval confirmation interrupt -> backend activate
- [ ] 4.5.7 Document-injection defences + tests
### Phase 4.6 Safety, audit, hardening (S-04, S-06, S-07, S-08)
- [ ] 4.6.1 Rate limiting, request IDs, structured logging with PII redaction
- [ ] 4.6.2 Graceful outage handling (LLM, backend, Telegram)
- [ ] 4.6.3 Privacy notice on /start
- [ ] 4.6.4 (Optional) n8n notification workflow; core works without it
**STOP after each phase - user approval**

## GATE 5 - Testing (step 12)
- [ ] 5.1 Unit/integration coverage report reviewed
- [ ] 5.2 E2E tests for booking and document flows
- [ ] 5.3 Multilingual test suite (EN/HI/Hinglish for all intents)
- [ ] 5.4 Failure path tests (see docs/QA_PLAN.md mandatory scenarios)
- [ ] 5.5 Manual test script run by user on real Telegram
**STOP**

## GATE 6 - Security review (step 13)
- [ ] 6.1 Run through docs/SECURITY_CHECKLIST.md item by item with evidence
- [ ] 6.2 `npm audit`, `pip-audit`, secret scan
- [ ] 6.3 Fix all critical/high findings; write docs/SECURITY_REPORT.md
**STOP**

## GATE 7 - Code review (step 14)
- [ ] 7.1 Review against rules.md; remove dead code and duplication; reduce complexity
- [ ] 7.2 Refactor with tests still green
- [ ] 7.3 Write docs/CODE_REVIEW.md
**STOP**

## GATE 8 - Staging deployment (step 15)
- [ ] 8.1 Dockerfiles + compose for staging
- [ ] 8.2 Follow docs/DEPLOYMENT.md staging list; smoke tests
- [ ] 8.3 Staging bot + DB documented in README
**STOP**

## GATE 9 - QA with real users (step 16)
- [ ] 9.1 Prepare tester instructions and feedback form from docs/QA_PLAN.md
- [ ] 9.2 User runs sessions; agent triages feedback into docs/FEEDBACK.md
- [ ] 9.3 Fix issues; re-test; confirm exit criteria
**STOP**

## GATE 10 - Production and monitoring (steps 17, 18) - ONLY with explicit user approval
- [ ] 10.1 Production checklist from docs/DEPLOYMENT.md complete
- [ ] 10.2 Monitoring, alerts, backups configured
- [ ] 10.3 Maintenance plan written (docs/MAINTENANCE.md)

## FINAL - Documentation and audit
- [ ] F.1 README with setup, architecture diagram, demo script
- [ ] F.2 Final audit of repo vs SPEC.md, PRD.md, tasks.md; list gaps
- [ ] F.3 Demo script for college evaluation + presentation outline
- [ ] F.4 Final report/documentation for evaluation (problem, solution, architecture, results, limitations, future work)

## Traceability (agent must fill during Gate 3 and keep updated)
| Requirement | Task(s) | Test(s) | Status |
|---|---|---|---|
| P-01 | 4.4.2 | | |
| P-02 | 4.4.6 | | |
| P-03 | 4.2.4, 4.4.6 | | |
| P-04 | 4.2.5, 4.4.6 | | |
| P-05 | 4.2.6, 4.4.7 | | |
| P-06 | 4.2.7, 4.2.8, 4.4.8 | | |
| P-07 | 4.2.8, 4.4.8 | | |
| P-08 | 4.2.8, 4.4.8 | | |
| P-09 | 4.2.10, 4.4.9 | | |
| P-10 | 4.4.3 | | |
| P-11 | 4.4.7, 4.6.3 | | |
| M-01 | 4.2.3 | | |
| M-02..M-04 | 4.2.4, 4.5.1 | | |
| M-05 | 4.5.2 | | |
| M-06 | 4.5.3, 4.5.4 | | |
| M-07 | 4.5.5 | | |
| M-08 | 4.2.9, 4.5.6 | | |
| M-09 | 4.5.5 | | |
| S-01 | 4.3.1 | | |
| S-02 | 4.2.11 | | |
| S-03 | 4.2.2 | | |
| S-04 | 4.2.12, 4.6.2 | | |
| S-05 | 4.4.1 | | |
| S-06 | 4.6.1 | | |
| S-07 | 4.6.1 | | |
| S-08 | 4.6.4 | | |
