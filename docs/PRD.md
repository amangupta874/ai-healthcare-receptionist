# PRD - AI Healthcare Receptionist (Telegram MVP)

## 1. Goal
Reduce routine reception work for small clinics via a Telegram assistant for FAQs, doctor discovery and appointments,
while keeping managers/staff in control of information and exceptions.

## 2. Success metrics (MVP demo)
- Patient can find a doctor and book an appointment end to end in under 2 minutes of chat.
- 100% of bookings/cancellations/reschedules preceded by explicit confirmation.
- 0 cases of medical advice given in test suite.
- Manager can turn an uploaded policy PDF/DOCX into approved FAQs/config with explicit approval.
- Hindi, English and Hinglish test conversations all pass.

## 3. Roles
Patient, Manager (per clinic), Staff (escalation receiver), Service (internal agent-to-backend identity).

## 4. Functional requirements (ID -> requirement -> acceptance criteria)

### Patient
- **P-01 Language detection/reply**: Understand Hindi, English, Hinglish; reply in the user's language. AC: tests in all three pass.
- **P-02 FAQ from approved data**: AC: answer matches approved entries only; unknown question -> escalation message, no guess.
- **P-03 Doctor discovery**: list doctors, specialty, fee, clinic details. AC: only active doctors of that clinic; filter by specialty.
- **P-04 Availability**: show open slots for a doctor/date. AC: no booked or past slots shown; respects working hours.
- **P-05 Booking**: AC: summary shown -> explicit Yes -> backend creates appointment -> confirmation with booking code. No confirmation = no booking. Double-booking impossible.
- **P-06 Lookup**: AC: only after verification; shows only the requester's appointments.
- **P-07 Cancel**: AC: verification + explicit confirmation; slot released; audit record.
- **P-08 Reschedule**: AC: verification + show new slot + explicit confirmation; old slot released atomically.
- **P-09 Escalation**: AC: unclear/sensitive/failed-verification requests create an escalation record and notify staff; patient told what happens next.
- **P-10 Medical boundary**: AC: symptom/diagnosis/prescription questions get a polite refusal + suggestion to consult doctor/book appointment; emergency wording gets "contact emergency services" message.
- **P-11 Minimal data**: AC: only name + contact needed for booking; no medical records requested.

### Manager
- **M-01 Manager authentication**: AC: only Telegram accounts linked via backend (invite code) can use manager flows; clinic-scoped.
- **M-02 Clinic setup**: guided create/update of clinic profile, contact, working hours.
- **M-03 Doctor management**: add/edit/deactivate doctors, specialty, fee.
- **M-04 Schedule management**: weekly schedule, slot duration, leave/blocked dates.
- **M-05 Policy upload**: accept PDF/DOCX in Telegram; size/type validation. AC: invalid files rejected with clear message.
- **M-06 Extraction**: text extraction; OCR for scanned PDFs. AC: extracts rules, timings, fees, FAQ candidates into structured draft.
- **M-07 Review/clarify**: AC: missing/contradictory items are listed and asked about; draft shown in readable form.
- **M-08 Approval/activation**: AC: nothing becomes active without explicit approval; only approved items become patient-visible; version/audit kept.
- **M-09 Edit/undo**: manager can reject or modify draft items before approval.

### System
- **S-01 Webhook security**: secret token validated; invalid requests rejected.
- **S-02 Audit**: every state-changing action recorded (who, what, when, before/after).
- **S-03 Clinic isolation**: enforced in backend for every query.
- **S-04 Error handling**: user-friendly errors, no stack traces, graceful LLM/backend outage message.
- **S-05 Conversation state**: persists across messages (LangGraph checkpointer in PostgreSQL/Redis-less option).
- **S-06 Rate limiting and abuse protection**.
- **S-07 Observability**: structured logs, health endpoints.
- **S-08 n8n (optional)**: non-critical notifications only.

## 5. Non-functional
Security and privacy first; response time target < 5s typical; reproducible setup via docker-compose; documented;
tested; code follows rules.md.

## 6. Out of scope
Calling/telephony, speech, SIP/PSTN, payments, medical records, EHR integration, multi-region SaaS operations,
web dashboard (optional future).

## 7. Assumptions to confirm (Gate 1)
Single bot with multi-clinic support vs one bot per clinic; patient verification method; staff escalation channel;
LLM provider and model; time zone (Asia/Kolkata) and slot rules.
