# USERS - Target Personas, User Journeys and Boundary Design

## Persona 1: Patient (e.g. "Ravi Kumar", 34, small-town / city clinic visitor)
- **Background**: Private employee; visits neighborhood clinic for family healthcare. Uses smartphone apps and Telegram daily.
- **Language**: Types comfortably in Hindi, English, and Romanized Hinglish (*"kal subah Dr. Sharma se milna hai"*, *"appointment cancel karni hai"*).
- **Key Goals**:
  1. Quickly check if a doctor is available on a specific day.
  2. Know exact consultation fees and clinic timings before visiting.
  3. Book, reschedule, or cancel appointments without calling during busy OPD hours.
  4. Receive immediate booking confirmation and reference code.
- **Pain Points**:
  - Clinic reception line constantly busy or unanswered.
  - Uncertainty about doctor timings and consultation fees.
  - Frustration when forced to download heavy proprietary apps for a simple appointment.
- **Privacy & Security Constraints**:
  - Should only provide minimal details: Name and 10-digit mobile number.
  - Must never be asked to share medical history, symptom photos, or prescriptions over Telegram.

## Persona 2: Clinic Manager / Receptionist (e.g. "Meena Sharma", 40)
- **Background**: Front-desk administrator at a multi-doctor clinic. Manages doctor rosters, paper fee charts, and phone inquiries.
- **Technical Literacy**: Non-technical; proficient with smartphone messaging (Telegram/WhatsApp), but does not write code or manage databases.
- **Key Goals**:
  1. Upload clinic policy circulars, working hour notices, and fee lists (PDF/DOCX) and have the system convert them into usable bot knowledge.
  2. Review extracted drafts, resolve conflicting information (e.g. timing clashes), and approve only verified details.
  3. Ensure the bot never provides incorrect fees or unauthorized medical advice.
  4. View pending patient escalations when complex queries occur.
- **Pain Points**:
  - Overwhelming phone call volume during morning and evening rush hours.
  - Manual, repetitive work explaining clinic policies and fees.
  - Anxiety that an autonomous AI might invent policies or promise unavailable slots.

## Persona 3: Escalation Staff / On-duty Attendant (e.g. "Dr. Anand / Staff Suresh", 28)
- **Background**: Clinic receptionist or junior assistant monitoring exceptions.
- **Key Goals**:
  1. Receive timely notifications when a patient's request cannot be resolved automatically (unknown policy, verification failure, emergency detection).
  2. Review patient context (name, phone, query) to follow up directly.

## Edge Cases & User Boundaries
1. **Clinical Symptoms / Medical Advice Request**:
   - Patient asks: *"Mujhe 3 din se bukhar aur ulti ho rahi hai, kaunsi dawai lu?"*
   - Bot Response: Refuses medical diagnosis/prescription politely. Encourages consulting a qualified doctor and offers an appointment booking option.
2. **Emergency Detection**:
   - Patient mentions: *"Severe chest pain"*, *"Saans lene me taklif"*, *"Behosh ho gaya"*.
   - Bot Response: Immediately flags emergency, provides emergency helpline advice, and instructs them to visit the nearest emergency trauma center.
3. **Repeated Verification Failure**:
   - After 3 incorrect attempts at booking code / phone matching, the workflow halts and an escalation ticket is generated for human staff review.

## Decisions on Open Questions (Gate 1)
- **Patient Verification**: Two-factor matching: 6-character alphanumeric `bookingCode` + phone number or patient name entered at booking. Enforces maximum 3 attempts before locking and escalating.
- **Manager Linking**: Backend-issued 8-character single-use invite code entered via `/link <invite-code>`. Links the Telegram user ID to the clinic with `MANAGER` role.
- **Clinic Routing (One Bot vs Many Clinics)**: Single Telegram bot hosting multi-clinic capability. Supports a default demo clinic (`clinic_default`), with multi-clinic routing via start payload `t.me/newton_receptionist_bot?start=clinic_<id>` or `/clinic <id>`.
- **Escalation Notification**: Escalation tickets saved to PostgreSQL `Escalation` table, logged via structured logging, and notified to the clinic manager's Telegram chat if registered.
- **LLM Selection**: Google Gemini 2.5 Flash (`gemini-2.5-flash`) via LangChain / Google GenAI SDK for low-latency (<1.5s), reliable multilingual comprehension, and native JSON structured output.
