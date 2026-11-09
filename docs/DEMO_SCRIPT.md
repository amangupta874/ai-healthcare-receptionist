# DEMO SCRIPT - Live Presentation & Evaluation Script (docs/DEMO_SCRIPT.md)

**Project Title**: AI Healthcare Receptionist (Telegram-Based AI Agent)  
**Bot Username**: `@newton_receptionist_bot`  
**Live Public Webhook**: `https://purplish-rearview-fleshy.ngrok-free.dev/webhook`  
**Evaluation Roleplay**: Evaluator acts as Patient (Ravi Kumar) and Clinic Manager (Meena Sharma).

---

## Part 1: Presentation Introduction (2 Minutes)
1. **Greeting & Problem Overview**:
   - "Good morning respected evaluators. Small clinics in India handle thousands of routine inquiries every month—timings, fees, doctor availability, and appointment booking. Reception lines are jammed, staff are overwhelmed, and traditional chatbots often hallucinate wrong advice."
2. **Our Solution**:
   - "We built the AI Healthcare Receptionist: an autonomous, approval-led assistant on Telegram. It speaks Hindi, English, and Hinglish, enforces strict medical safety boundaries, guarantees zero double-booking, and lets clinic managers upload policy documents to create verified knowledge drafts."

---

## Part 2: Live Telegram Interactive Demo (5 Minutes)

### Step 1: Initialize Bot & Privacy Notice
- **Action**: Open `@newton_receptionist_bot` in Telegram and send `/start`.
- **Key Highlight**:
  - Show the clean greeting and the **DPDP Act 2023 Privacy Notice** clearly stating that only name and phone are collected, and no medical records should be sent.
  - Show the interactive inline keyboard: `[Find a Doctor]`, `[Book Appointment]`, `[My Appointment]`, `[Clinic Info / FAQ]`, `[Talk to Staff]`.

### Step 2: Tri-Script Understanding & Clinic FAQs
- **Action 1 (Hindi)**: Send `"क्लिनिक कब खुलता है?"`
  - *Bot Response*: Responds in clean Hindi with approved timings: Monday to Saturday 09:00 AM to 06:00 PM, Sunday closed.
- **Action 2 (Hinglish)**: Send `"Dr Sharma ki fees kitni hai?"`
  - *Bot Response*: Responds in Hinglish citing Dr. Priya Sharma's approved fee (₹600) and the 7-day free follow-up policy.
- **Action 3 (English)**: Send `"Is parking available at the clinic?"`
  - *Bot Response*: Confirms free dedicated two-wheeler and four-wheeler parking in front of the clinic.

### Step 3: Medical Advice Refusal & Emergency Gate (Safety Guardrails)
- **Action 1 (Medical Question)**: Send `"mujhe bukhar hai kaunsi dawai lu?"`
  - *Bot Response*: Refuses politely: *"⚕️ I am an administrative assistant and cannot give medical advice or prescriptions. Would you like to book an appointment with a doctor?"*. Show that zero medicines or dosages were given.
- **Action 2 (Emergency Alert)**: Send `"Patient has severe chest pain and unconscious"`
  - *Bot Response*: Immediately triggers the high-priority **EMERGENCY ALERT**, displaying emergency numbers **112** and **108** and instructing immediate visit to the nearest hospital emergency room.

### Step 4: End-to-End Confirmed Appointment Booking
- **Action**: Click `[📅 Book Appointment]`.
- **Flow**:
  1. Click `Dr. Priya Sharma (Cardiology)`.
  2. Click `Tomorrow`.
  3. Select an open slot (e.g. `10:00 AM`).
  4. Enter details: `Ravi Kumar, 9876543210`.
  5. **Highlight Interrupt**: Show the confirmation prompt: *"📋 Please Confirm Your Appointment: Dr. Priya Sharma, Tomorrow at 10:00 AM, Fee ₹600. Do you confirm?"*
  6. Click `[✅ Yes, Book It]`.
  7. **Show Result**: Booking code generated: `APT-XXXX`.
  8. Point out: The slot is locked; double-booking is mathematically prevented by the database constraint.

### Step 5: Verified Appointment Lookup & Cancellation
- **Action**: Click `[📋 My Appointment]`.
- **Flow**:
  1. Enter: `APT-XXXX 9876543210`.
  2. Show appointment details: Dr. Priya Sharma, Status: BOOKED.
  3. Click `[❌ Cancel Appointment]`.
  4. Click `[✅ Yes, Cancel]`.
  5. Show: Appointment cancelled and slot immediately released back into available inventory.

### Step 6: Clinic Manager Ingestion & Policy Approval
- **Action 1 (Manager Linking)**: Send `/link MANAGER1`.
  - Show that the bot elevates the Telegram account to `MANAGER` for City Care Clinic.
- **Action 2 (Document Ingestion)**: Send a sample policy PDF/DOCX into the chat.
  - Show the bot extracting text, running OCR, parsing rules, timings, and fees into a structured DRAFT.
  - Highlight that the bot surfaces missing fees or conflicting timings as a gap for the manager to review.
- **Action 3 (Explicit Approval)**: Click `[✅ Approve & Activate]`.
  - Show that the items are instantly live for patient Q&A!

---

## Part 3: Evaluation Summary
- 60 automated tests passing (24 Backend, 36 Agent).
- End-to-end booking in < 45 seconds.
- 100% human confirmation enforced.
- 0 medical advice given.
- Ready for questions from the evaluation committee.

