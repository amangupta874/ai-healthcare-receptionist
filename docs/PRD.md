# PRD - AI Healthcare Receptionist (Telegram MVP)

## 1. Goal
Reduce routine reception workload for small healthcare clinics via an autonomous Telegram assistant for clinic FAQs, doctor discovery, and verified appointment management, while ensuring clinic managers retain total editorial control over published clinic information and exceptions.

## 2. Success Metrics (MVP Acceptance)
- **Booking Speed**: Patient can discover an active doctor, pick an open slot, and complete a confirmed booking within 2 minutes of chat.
- **100% Confirmation Enforced**: 100% of state-changing operations (booking, cancellation, rescheduling) are preceded by explicit user confirmation (`Yes/No` inline interrupt). Direct API calls without a valid confirmation token are rejected with HTTP 400.
- **Zero Medical Advice Hallucination**: 0 cases of clinical diagnosis, drug recommendations, or medical advice in automated and manual test suites.
- **Document-to-Draft Accuracy**: Manager can upload a clinic policy PDF/DOCX and receive a structured draft (rules, timings, fees, FAQ items) with identified conflicts or missing data, requiring explicit manager approval before activating.
- **Tri-Script Multilingual Support**: 100% passing rate on English, Hindi (Devanagari), and Hinglish (Latin script) test testbeds for all patient intents.

## 3. Roles and Access Control
- **Patient**: Unauthenticated or session-verified public user. Can query clinic FAQs, view doctors/fees, check availability, book with confirmation, and manage appointments with verification.
- **Manager**: Authenticated clinic administrator linked via one-time backend invite code. Can configure clinic details, manage doctors and schedules, upload policy documents, review extracted drafts, and approve/reject active items.
- **Staff**: Designated clinic staff or manager who receives escalated unresolved inquiries.
- **Service**: Internal service role for FastAPI agent-to-Express backend communication authenticated via pre-shared `SERVICE_API_KEY`.

## 4. Functional Requirements Traceability Matrix

### Patient Requirements
- **P-01 Language Detection & Response**:
  - Automatically detect language: English, Hindi, or Hinglish.
  - Formulate responses in the user's selected language and script style.
- **P-02 FAQ from Approved Knowledge**:
  - Answer clinic queries (timings, parking, visiting rules, insurance, fees) strictly from `APPROVED` knowledge records.
  - If information is missing or ambiguous, output a polite refusal and escalate to staff. Never fabricate or extrapolate.
- **P-03 Doctor Discovery**:
  - Query and display active doctors, specialties, consultation fees, and clinic location.
  - Support filtering by medical specialty (e.g. Cardiologist, Dentist, General Physician).
- **P-04 Availability Checking**:
  - Calculate real-time open slots based on doctor schedules, slot duration, existing active bookings, and blocked/leave days.
  - Filter out past time slots and already-booked slots.
- **P-05 Appointment Booking**:
  - Show appointment summary (Doctor, Date, Time, Consultation Fee).
  - Require explicit patient confirmation (`[Yes, confirm]` / `[No, cancel]`) via LangGraph interrupt.
  - Invoke backend transaction to reserve the slot, returning a unique 6-character booking code (e.g., `APT-8F2B`).
  - Enforce atomic database transaction and unique index to prevent double-booking.
- **P-06 Verified Appointment Lookup**:
  - Require booking code + phone number/name matching for privacy.
  - Limit attempts to 3 per session to prevent brute force; lockout and escalate upon 3 failures.
  - Display only the matching appointment record.
- **P-07 Verified Cancellation**:
  - Require verification + explicit confirmation step.
  - Atomically update appointment status to `CANCELLED`, freeing the slot for other patients, and write an audit record.
- **P-08 Verified Rescheduling**:
  - Require verification + slot selection + explicit confirmation.
  - Atomically transition old appointment to `RESCHEDULED` and create new appointment at selected slot.
- **P-09 Escalation Handling**:
  - Automatically log escalation on unknown medical queries, verification failures, or user request for human help.
  - Record query context, user contact, and timestamp in backend `Escalation` table; notify staff.
- **P-10 Medical Boundary Guardrails**:
  - Immediately intercept symptom, diagnosis, or prescription queries with a polite disclaimer and offer of appointment booking.
  - Detect medical emergencies (chest pain, unconsciousness, heavy bleeding) and provide immediate emergency contact numbers and directions to visit the nearest emergency department.
- **P-11 Data Minimization**:
  - Collect strictly minimum necessary details: Patient Name and 10-digit mobile number.
  - Never ask for or store medical history, diagnostic reports, or prescriptions over Telegram.

### Manager Requirements
- **M-01 Manager Authentication**:
  - Link Telegram ID to a clinic manager profile using a secure single-use 8-character invite code (`/link <CODE>`).
  - Enforce clinic boundary checks on all subsequent manager operations.
- **M-02 Clinic Profile Management**:
  - Interactive commands to view and update clinic name, address, contact phone, operating hours, and active status.
- **M-03 Doctor Management**:
  - Add, edit, or deactivate doctors; update specialty and consultation fees.
- **M-04 Schedule & Slot Management**:
  - Set working days, hours, slot duration (e.g., 15 or 30 mins), and block out doctor leave dates.
- **M-05 Policy Document Ingestion**:
  - Accept PDF and DOCX files sent to the Telegram bot.
  - Validate file size (max 10MB), MIME type, and magic bytes. Reject unauthorized formats.
- **M-06 Text & OCR Extraction**:
  - Extract text using `pypdf` / `pdfplumber` / `python-docx`.
  - Fall back to OCR (`pytesseract` with `eng+hin`) for scanned or image-based PDFs.
  - Use structured LLM extraction (Pydantic schema) to parse rules, timings, fee tables, and potential FAQ entries.
- **M-07 Draft Review & Gap Identification**:
  - Surface extracted policies as a structured `PENDING` draft in Telegram.
  - Highlight detected gaps or contradictions (e.g. conflicting OPD timings or missing doctor fees).
- **M-08 Explicit Approval & Activation**:
  - Require explicit manager confirmation button (`[Approve & Activate]`) before writing to `KnowledgeItem` table.
  - Only `APPROVED` items are visible to patient workflows.
- **M-09 Edit / Rejection**:
  - Allow the manager to modify draft values or reject the entire draft (`[Reject Draft]`).

### System Requirements
- **S-01 Webhook Security**:
  - Validate `X-Telegram-Bot-Api-Secret-Token` header on every incoming webhook request.
- **S-02 Audit Logging**:
  - Record every mutation (who, what, when, before/after JSON) in `AuditLog` table.
- **S-03 Multi-Tenant Clinic Isolation**:
  - Enforce `clinicId` partitioning on every backend route and Prisma query.
- **S-04 Resilient Error Handling**:
  - Catch all exceptions; return clean, polite user messages without leaking stack traces or internal IDs.
  - Graceful degradation if LLM or external services timeout.
- **S-05 Persistent State**:
  - LangGraph per-chat checkpointing in PostgreSQL/memory ensuring state persists across message turns.
- **S-06 Rate Limiting**:
  - Rate-limit Telegram user updates (max 20 messages/minute) to prevent flood abuse.
- **S-07 Structured Observability**:
  - JSON-formatted structured logging with request IDs and automatic redaction of secrets/tokens/PII.
- **S-08 Optional Automations (n8n)**:
  - Clean webhook trigger interface for optional external notifications.

## 5. Confirmed Architectural Decisions (Gate 1)
1. **Patient Verification**: Alphanumeric booking code + mobile number or name given at booking. 3 attempts max before lockout and escalation.
2. **Manager Linking**: Backend single-use invite code entered via `/link <invite_code>`.
3. **Bot Deployment Model**: Single Telegram bot hosting multi-clinic capability with a default `clinic_default` (Demo Clinic) and deep-linking support (`/start clinic_<id>`).
4. **Escalation Notification**: PostgreSQL escalation queue + structured alert log + manager Telegram notification dispatch.
5. **LLM Provider**: Google Gemini (`gemini-2.5-flash`) via official SDK with native structured JSON output and low latency.
6. **Timezone**: `Asia/Kolkata` (IST, UTC+05:30) used for all schedule calculations, availability slots, and audit timestamps.
