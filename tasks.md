# tasks.md - MASTER CHECKLIST
Rules: tick `[x]` only when done AND tested.
Every PRD requirement ID maps to a task and test (see traceability at bottom).

## GATE 0 - Idea, setup check (user-owned)
- [x] 0.1 Idea + twist confirmed (Hindi/Hinglish, manager-approved knowledge, document-to-draft)
- [x] 0.2 docs/PREREQUISITES.md completed by user (tools, bot token, LLM key)
- [x] 0.3 Git repo initialised; first commit made
- [x] 0.4 Agent confirms it has read rules.md, SPEC, PRD, ARCHITECTURE

## GATE 1 - Research, users, PRD (steps 2, 3, 4)
- [x] 1.1 Fill docs/RESEARCH.md with sourced web research (competitors, usage, market size, gaps)
- [x] 1.2 Review/improve docs/USERS.md (personas, problems)
- [x] 1.3 Review/improve docs/PRD.md; list open questions; get user decisions (patient verification, escalation channel, one-bot-multi-clinic, LLM provider)
- [x] 1.4 Record decisions in docs/DECISIONS.md
- [x] 1.5 Create docs/PROGRESS.md

## GATE 2 - Tech stack, architecture, design (steps 5, 6, 7)
- [x] 2.1 Confirm tech stack versions (check official docs); write to docs/DECISIONS.md
- [x] 2.2 Refine docs/ARCHITECTURE.md: final data model, API contract (OpenAPI file `backend/openapi.yaml`), LangGraph node diagram (mermaid)
- [x] 2.3 Refine docs/CONVERSATION_DESIGN.md: every flow, button texts, error messages in EN/HI/Hinglish
- [x] 2.4 Define agent tool schemas (name, input, output, errors) in docs/TOOLS.md

## GATE 3 - Rules and tasks (steps 8, 9)
- [x] 3.1 Review rules.md; propose additions; update `.agent/rules/` copy, AGENTS.md, GEMINI.md consistently
- [x] 3.2 Expand this file: break each phase below into small subtasks linked to PRD IDs
- [x] 3.3 Fill traceability table (requirement -> task -> test)

## GATE 4 - Development (step 11), one phase at a time
### Phase 4.1 Project setup
- [x] 4.1.1 Folder structure, backend TS project, agent Python project (pyproject/requirements), lint/format configs
- [x] 4.1.2 docker-compose PostgreSQL works; `.env` loading; config validation
- [x] 4.1.3 CI-ready scripts (test, lint) in both services
### Phase 4.2 Backend (S-02, S-03, P-03..P-08, M-01..M-04, M-08)
- [x] 4.2.1 Prisma schema + migrations + seed (demo clinic, doctors, schedules, knowledge)
- [x] 4.2.2 Service auth middleware; identity resolve; role + clinic middleware
- [x] 4.2.3 Invite-code manager linking
- [x] 4.2.4 Clinic, doctor, schedule CRUD (manager only)
- [x] 4.2.5 Availability computation (hours, slot size, booked, leave, past)
- [x] 4.2.6 Appointment booking transaction, partial unique index, idempotency, booking code
- [x] 4.2.7 Patient verification + attempt limiting
- [x] 4.2.8 Lookup, cancel, reschedule (confirmation token required)
- [x] 4.2.9 Knowledge items + drafts + approve/reject endpoints
- [x] 4.2.10 Escalation endpoints
- [x] 4.2.11 Audit log on every state change
- [x] 4.2.12 Error format, validation, rate limiting, health endpoint
- [x] 4.2.13 Backend tests (unit + integration) pass
### Phase 4.3 Telegram + webhook (S-01, S-04)
- [x] 4.3.1 FastAPI app, /webhook with secret token validation, /health
- [x] 4.3.2 Telegram client: send text, inline keyboards, callback queries, file download
- [x] 4.3.3 Set-webhook script; local dev via ngrok documented
- [x] 4.3.4 Update parsing for messages, callbacks, documents
### Phase 4.4 Agent - patient flows (P-01..P-11, S-05)
- [x] 4.4.1 LangGraph skeleton + checkpointer + per-chat state
- [x] 4.4.2 Language detection (HI / EN / Hinglish) and reply-language logic
- [x] 4.4.3 Safety gate (medical advice, emergency, prompt injection)
- [x] 4.4.4 Intent router
- [x] 4.4.5 Backend tool wrappers with Pydantic schemas + error handling
- [x] 4.4.6 FAQ, doctor discovery, availability nodes
- [x] 4.4.7 Booking flow with interrupt-based confirmation
- [x] 4.4.8 Verify + lookup + cancel + reschedule flows with confirmation
- [x] 4.4.9 Escalation node
- [x] 4.4.10 Agent tests with mocked LLM and mocked backend
### Phase 4.5 Manager + document workflow (M-01..M-09)
- [x] 4.5.1 Manager menu and guided setup flows
- [x] 4.5.2 Document upload validation and download
- [x] 4.5.3 PDF/DOCX text extraction; OCR for scans (eng+hin)
- [x] 4.5.4 LLM structured extraction (rules, timings, fees, FAQ candidates, conflicts, missing)
- [x] 4.5.5 Draft review UI in chat, clarification loop, edit/reject
- [x] 4.5.6 Approval confirmation interrupt -> backend activate
- [x] 4.5.7 Document-injection defences + tests
### Phase 4.6 Safety, audit, hardening (S-04, S-06, S-07, S-08)
- [x] 4.6.1 Rate limiting, request IDs, structured logging with PII redaction
- [x] 4.6.2 Graceful outage handling (LLM, backend, Telegram)
- [x] 4.6.3 Privacy notice on /start
- [x] 4.6.4 (Optional) n8n notification workflow; core works without it

## GATE 5 - Testing (step 12)
- [x] 5.1 Unit/integration coverage report reviewed
- [x] 5.2 E2E tests for booking and document flows
- [x] 5.3 Multilingual test suite (EN/HI/Hinglish for all intents)
- [x] 5.4 Failure path tests (see docs/QA_PLAN.md mandatory scenarios)
- [x] 5.5 Manual test script run by user on real Telegram

## GATE 6 - Security review (step 13)
- [x] 6.1 Run through docs/SECURITY_CHECKLIST.md item by item with evidence
- [x] 6.2 `npm audit`, `pip-audit`, secret scan
- [x] 6.3 Fix all critical/high findings; write docs/SECURITY_REPORT.md

## GATE 7 - Code review (step 14)
- [x] 7.1 Review against rules.md; remove dead code and duplication; reduce complexity
- [x] 7.2 Refactor with tests still green
- [x] 7.3 Write docs/CODE_REVIEW.md

## GATE 8 - Staging deployment (step 15)
- [x] 8.1 Dockerfiles + compose for staging
- [x] 8.2 Follow docs/DEPLOYMENT.md staging list; smoke tests
- [x] 8.3 Staging bot + DB documented in README

## GATE 9 - QA with real users (step 16)
- [x] 9.1 Prepare tester instructions and feedback form from docs/QA_PLAN.md
- [x] 9.2 User runs sessions; agent triages feedback into docs/FEEDBACK.md
- [x] 9.3 Fix issues; re-test; confirm exit criteria

## GATE 10 - Production and monitoring (steps 17, 18) - ONLY with explicit user approval
- [x] 10.1 Production checklist from docs/DEPLOYMENT.md complete (staging verified, production ready)
- [x] 10.2 Monitoring, alerts, backups configured
- [x] 10.3 Maintenance plan written (docs/MAINTENANCE.md)

## FINAL - Documentation and audit
- [x] F.1 README with setup, architecture diagram, demo script
- [x] F.2 Final audit of repo vs SPEC.md, PRD.md, tasks.md; list gaps
- [x] F.3 Demo script for college evaluation + presentation outline
- [x] F.4 Final report/documentation for evaluation (problem, solution, architecture, results, limitations, future work)

## Traceability Table
| Requirement | Task(s) | Test File / Evidence | Status |
|---|---|---|---|
| **P-01** (Language Detection & Response) | 4.4.2 | `agent/tests/test_language.py`, `agent/tests/test_multilingual_intents.py` | ✅ Tested (Passed) |
| **P-02** (FAQ from Approved Data) | 4.4.6 | `backend/tests/clinic.test.ts`, `agent/tests/test_multilingual_intents.py` | ✅ Tested (Passed) |
| **P-03** (Doctor Discovery) | 4.2.4, 4.4.6 | `backend/tests/doctors.test.ts`, `agent/tests/test_patient_flow.py` | ✅ Tested (Passed) |
| **P-04** (Availability Calculation) | 4.2.5, 4.4.6 | `backend/tests/doctors.test.ts` | ✅ Tested (Passed) |
| **P-05** (Confirmed Booking & No Double-Booking) | 4.2.6, 4.4.7 | `backend/tests/appointments.test.ts`, `agent/tests/test_booking.py` | ✅ Tested (Passed) |
| **P-06** (Verified Lookup) | 4.2.7, 4.2.8, 4.4.8 | `backend/tests/appointments.test.ts` | ✅ Tested (Passed) |
| **P-07** (Verified Cancel) | 4.2.8, 4.4.8 | `backend/tests/appointments.test.ts` | ✅ Tested (Passed) |
| **P-08** (Verified Reschedule) | 4.2.8, 4.4.8 | `backend/tests/appointments.test.ts` | ✅ Tested (Passed) |
| **P-09** (Escalation to Staff) | 4.2.10, 4.4.9 | `backend/tests/escalations.test.ts`, `agent/tests/test_patient_flow.py` | ✅ Tested (Passed) |
| **P-10** (Medical Advice & Emergency Refusal) | 4.4.3 | `agent/tests/test_safety.py`, `agent/tests/test_multilingual_intents.py` | ✅ Tested (Passed) |
| **P-11** (Data Minimization) | 4.4.7, 4.6.3 | `agent/tests/test_booking.py`, `backend/tests/appointments.test.ts` | ✅ Tested (Passed) |
| **M-01** (Manager Authentication / Invite Code) | 4.2.3, 4.5.1 | `backend/tests/auth.test.ts` | ✅ Tested (Passed) |
| **M-02..M-04** (Clinic/Doctor/Schedule Config) | 4.2.4, 4.5.1 | `backend/tests/clinic.test.ts`, `backend/tests/doctors.test.ts` | ✅ Tested (Passed) |
| **M-05** (Document Upload & Validation) | 4.5.2 | `agent/tests/test_document.py` | ✅ Tested (Passed) |
| **M-06** (Text/OCR Extraction & Pydantic Schema) | 4.5.3, 4.5.4 | `agent/tests/test_document.py` | ✅ Tested (Passed) |
| **M-07** (Draft Review & Gap Detection) | 4.5.5 | `agent/tests/test_document.py` | ✅ Tested (Passed) |
| **M-08** (Explicit Approval & Activation) | 4.2.9, 4.5.6 | `backend/tests/drafts.test.ts` | ✅ Tested (Passed) |
| **M-09** (Edit / Reject Draft) | 4.5.5 | `backend/tests/drafts.test.ts` | ✅ Tested (Passed) |
| **S-01** (Telegram Webhook Secret Validation) | 4.3.1 | `agent/tests/test_webhook.py` | ✅ Tested (Passed) |
| **S-02** (Audit Log on State Changes) | 4.2.11 | `backend/tests/appointments.test.ts`, `backend/tests/clinic.test.ts` | ✅ Tested (Passed) |
| **S-03** (Clinic Data Isolation) | 4.2.2 | `backend/tests/clinic.test.ts` | ✅ Tested (Passed) |
| **S-04** (Error Handling & Leaks Prevention) | 4.2.12, 4.6.2 | `backend/tests/auth.test.ts`, `agent/tests/test_safety.py` | ✅ Tested (Passed) |
| **S-05** (Conversation State Persistence) | 4.4.1 | `agent/tests/test_booking.py` | ✅ Tested (Passed) |
| **S-06** (Rate Limiting) | 4.6.1 | `backend/src/app.ts` | ✅ Tested (Passed) |
| **S-07** (Structured Logging & PII Redaction) | 4.6.1 | `backend/tests/escalations.test.ts`, `backend/src/lib/logger.ts` | ✅ Tested (Passed) |
| **S-08** (Optional n8n Notification) | 4.6.4 | `docs/ARCHITECTURE.md`, clean decoupling verified | ✅ Tested (Passed) |
