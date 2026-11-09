# ARCHITECTURE

## 1. Request path
Telegram user -> Telegram Bot API -> POST /webhook (FastAPI, validates secret token) -> LangGraph workflow
-> agent tools (HTTP) -> Express API (auth, roles, clinic check, transactions) -> Prisma -> PostgreSQL.
Replies go back FastAPI -> Telegram sendMessage (with inline keyboards).

## 2. Services
| Service | Folder | Tech | Responsibility |
|---|---|---|---|
| backend | `backend/` | Node.js, Express, TS, Prisma, zod | System of record: auth, roles, clinic isolation, doctors, schedules, slots, appointments, approved knowledge, escalations, audit |
| agent | `agent/` | Python, FastAPI, LangGraph, LangChain | Webhook, intent/language, workflow state, tool calls, document extraction pipeline, Telegram sending |
| db | docker | PostgreSQL | Data (backend via Prisma). Agent checkpoints use a separate schema/DB user |
| n8n (optional) | - | n8n | Non-critical notifications only |

## 3. Agent graph (LangGraph) - nodes
1. `ingest` (normalize Telegram update, identify user + role via backend)
2. `safety_gate` (medical-advice/emergency/prompt-injection screening)
3. `intent_router` (faq, doctors, availability, book, lookup, cancel, reschedule, manager_*, smalltalk, unknown)
4. Patient nodes: `faq_answer`, `doctor_discovery`, `availability`, `booking_collect`, `booking_confirm` (interrupt: wait for Yes/No),
   `booking_execute`, `verify_patient`, `lookup`, `cancel_confirm`, `cancel_execute`, `reschedule_confirm`, `reschedule_execute`
5. Manager nodes: `manager_menu`, `clinic_setup`, `doctor_mgmt`, `schedule_mgmt`, `doc_receive`, `doc_extract`, `draft_review`,
   `clarify_gaps`, `approval_confirm` (interrupt), `activate_execute`
6. `escalate` (create escalation, notify staff, tell user)
7. `respond` (language-matched final message)
State is checkpointed per Telegram chat id. Confirmation nodes MUST use interrupts; the LLM can never skip them.

## 4. Document pipeline
Upload (Telegram file) -> download -> validate type/size -> extract text (pdf: pdfplumber/pypdf; docx: python-docx) ->
if little/no text then OCR (pytesseract + pdf2image, languages eng+hin) -> LLM structured extraction (Pydantic schema:
rules, timings, fees, faq_candidates, doctors, conflicts, missing) -> store as DRAFT via backend -> show manager ->
clarify -> approve -> backend activates. Document text is untrusted data; never executed as instructions.

## 5. Data model (Prisma draft - agent must refine)
- Clinic(id, name, address, phone, email, timezone, workingHours JSON, isActive)
- User(id, clinicId?, telegramId unique, role[PATIENT|MANAGER|STAFF], name, phone, createdAt)
- InviteCode(id, clinicId, role, codeHash, expiresAt, usedAt)
- Doctor(id, clinicId, name, specialty, consultationFee, isActive)
- Schedule(id, doctorId, weekday, startTime, endTime, slotMinutes)
- Leave/Block(id, doctorId, date, reason)
- Appointment(id, clinicId, doctorId, patientId, startsAt, endsAt, status[BOOKED|CANCELLED|COMPLETED|RESCHEDULED], bookingCode unique, createdAt)
  - unique constraint (doctorId, startsAt) where status=BOOKED (partial unique index)
- KnowledgeItem(id, clinicId, type[FAQ|POLICY|TIMING|FEE], question?, content, status[APPROVED|ARCHIVED], version, approvedBy, approvedAt)
- DocumentDraft(id, clinicId, uploadedBy, fileName, status[PENDING|NEEDS_CLARIFICATION|APPROVED|REJECTED], extractedJson, issuesJson, createdAt)
- Escalation(id, clinicId, userId, reason, summary, status[OPEN|RESOLVED], createdAt)
- AuditLog(id, clinicId, actorType, actorId, action, entity, entityId, beforeJson, afterJson, requestId, createdAt)

## 6. Backend API contract (all require service auth header + `x-telegram-user-id`; backend resolves role/clinic)
Public to agent (service only):
- POST /v1/identity/resolve -> {role, clinicId, userId}
- POST /v1/identity/link-invite (manager invite code)
- GET /v1/clinics/:clinicId/knowledge?approved=true
- GET /v1/clinics/:clinicId/doctors?specialty=
- GET /v1/doctors/:id/availability?date=
- POST /v1/appointments (requires `confirmation: {confirmed:true, confirmationId}` and idempotencyKey)
- POST /v1/appointments/verify -> verification result (bookingCode + phone/name)
- GET /v1/appointments?patientId= (verified only)
- POST /v1/appointments/:id/cancel (requires confirmation)
- POST /v1/appointments/:id/reschedule (requires confirmation)
- POST /v1/escalations
- Manager: POST/PATCH clinics, doctors, schedules; POST /v1/drafts; GET /v1/drafts/:id; POST /v1/drafts/:id/approve (requires explicit approval flag); POST /v1/drafts/:id/reject
- GET /health
Rules: role + clinic checks in middleware; zod validation; audit write in the same transaction as the change; consistent error format
`{error:{code,message}}`.

## 7. Patient verification (proposed - confirm with user)
After booking the patient receives a bookingCode. Lookup/cancel/reschedule requires bookingCode + phone number or name given at
booking, matched by the backend. Failure -> escalation after 3 attempts.

## 8. Phases
1 Setup & infra | 2 Backend | 3 Telegram + webhook | 4 Agent patient flows | 5 Manager + document workflow | 6 Safety/audit/hardening |
7 Testing | 8 Security review | 9 Code review | 10 Staging | 11 QA | 12 Production + monitoring.

## 9. Suggested repo layout
```
backend/  src/{routes,services,middleware,schemas,lib} prisma/ tests/
agent/    app/{main.py,graph/,tools/,documents/,telegram/,prompts/,schemas/} tests/
docs/     ...
docker-compose.yml  .env.example
```
