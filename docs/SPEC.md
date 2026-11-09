# SPEC - AI Healthcare Receptionist (Telegram-Based AI Agent)
Source: docs/PROPOSAL.pdf (Version 1.0, college project proposal, 02 November 2026).
Team: Aman Gupta, Pankaj Kumar, Abhinav Kumar, Nayan Raj.

## 1. Problem
Small clinics handle appointment questions, doctor discovery and policy clarifications via fragmented manual
conversations -> delayed replies, repeated staff work, inconsistent information.

## 2. Users
- Patients: need clinic information or appointment help.
- Clinic managers: maintain doctors, schedules, fees, policies.

## 3. Why Telegram
Familiar text channel; accessible in Hindi, English and Hinglish without calling/audio/telephony infrastructure.

## 4. Solution
A focused conversational assistant that answers approved clinic FAQs, helps patients discover doctors and manages
verified appointment workflows. Clinic managers use the same channel to maintain approved information and review
document-extracted drafts.
- Patient assistant: FAQs, doctors, availability, booking confirmation, lookup, cancellation, rescheduling. Uncertain requests go to staff.
- Clinic-management assistant: clinic setup, doctors, schedules, fees, contact details, document review/approval via guided Telegram conversations.

## 5. Conversation boundary
Administrative healthcare access only - never clinical judgement, no diagnoses or prescriptions. Telegram is the only
user-facing channel. Patients share minimal data. Protected actions require secure backend verification.

## 6. Core features
### Patient workflows
| Capability | Behaviour |
|---|---|
| Approved clinic FAQs | Answers only from manager-approved info; unknown/sensitive requests escalated |
| Doctor discovery | Shows doctors, specialties, consultation fees, approved clinic details |
| Availability and booking | Checks slots, presents options, creates appointment only after explicit patient confirmation |
| Appointment support | Verified lookup, cancellation, rescheduling; consequential changes need confirmation |

### Clinic-management workflows
| Manager action | Assistant response |
|---|---|
| Configure clinic | Guided updates: clinic profile, contact info, doctors, schedules, working hours, fees |
| Upload policy PDF/DOCX | Extract text (OCR for scans if needed); identify rules, timings, fees, FAQ candidates |
| Review and clarify | Create structured draft, ask about missing/contradictory info, wait for manager approval |
| Activate approved information | Send only approved changes to backend; AI never writes directly to production DB |

Language: recognise Hindi, English, common Hinglish; testing covers all three.

## 7. Technology stack
Telegram Bot API (only channel) | Python (agent runtime) | FastAPI (webhook + agent API) | LangGraph (workflow/state/
approvals/escalation) | LangChain (LLM integration, tools) | Node.js + Express (backend: authorization, clinic ops,
appointment transactions, audit) | Prisma + PostgreSQL | PDF/DOCX parser + OCR | n8n (optional, non-critical).

Design principle: LangGraph manages conversation/workflow state. Node.js is the system of record. The agent can
request an authorized backend action but cannot directly alter production data.

## 8. Architecture
Patient/Manager -> Telegram Bot -> Webhook (FastAPI) -> LangGraph workflow (AI + state) -> Authorized tools
(Express APIs) -> PostgreSQL via Prisma.
LangGraph decides next permitted step: answer from approved data, ask for confirmation, request a tool call, ask a
manager to clarify, or escalate to staff. Express validates roles, clinic boundaries and transaction rules before
Prisma reads/writes. Every approved action can be audited.
Mandatory control points: (1) role and clinic check before any protected operation; (2) patient confirmation before
booking/cancelling/rescheduling; (3) manager approval before extracted policy becomes active.
Excluded: PSTN/SIP, media gateways, audio streaming, realtime speech-to-speech, telephony vendors.

## 9. Key flows
Patient booking: patient asks doctor/slot -> AI reads approved doctors/availability -> AI presents slots -> patient
explicitly confirms -> authorized backend creates appointment -> AI returns confirmation or escalates.
Document: manager sends PDF/DOCX in Telegram -> FastAPI extracts text (OCR if scan) -> AI identifies policies, times,
fees, FAQ candidates -> draft shown to manager -> manager clarifies gaps and explicitly approves -> backend saves
approved configuration.
Safeguards: if info unclear or verification fails, workflow stops and staff handle the exception; no medical advice.
Extraction produces a draft, never a live policy. Only manager-approved info is eligible for patient answers.

## 10. Team ownership
- Pankaj Kumar: AI agent and workflow (FastAPI, LangGraph, LangChain, intents, Hindi/Hinglish, tool coordination).
- Nayan Raj: document processing, testing and integration (upload, extraction/OCR, draft workflow, integration/e2e tests, docs).
- Aman Gupta: backend and database (Express, Prisma/PostgreSQL, APIs, booking transactions, auth, clinic isolation).
- Abhinav Kumar: Telegram bot and integration (bot, webhooks, flows, message/document handling, Hindi/Hinglish tests).
Shared: Aman+Pankaj validate messages/language vs real flows; Pankaj+Abhinav agree tool/API contracts and test auth,
confirmation, errors; Nayan+Abhinav; whole team runs e2e tests and reviews safety boundaries.

## 11. Automation level
| Stage | Automation | Human involvement |
|---|---|---|
| Patient FAQ | Automated | None - approved info only |
| Doctor discovery | Automated | None |
| Availability checking | Automated | None |
| Appointment booking | Automated after confirmation | Patient confirms |
| Policy document extraction | Automated | None initially; AI drafts |
| Policy activation | AI prepares draft | Manager reviews, clarifies, approves |
| Unclear requests | AI detects and escalates | Staff handles |
Protections: clinic data isolation; role-based access (backend-authorized, not model output); minimal patient data
(Telegram not appropriate for sensitive medical records).

## 12. Scope
Included: Telegram messages and document uploads; approved FAQ answers; doctor discovery and slot checking;
confirmed booking, lookup, cancellation, rescheduling; clinic configuration and policy-draft approval; Hindi,
English, Hinglish.
Not included: phone calling/telephony; realtime speech-to-speech; audio streaming/media gateways/barge-in; PSTN/SIP;
production-scale SaaS operations.
