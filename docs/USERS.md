# USERS - Target users and problems

## Persona 1: Patient (e.g. "Ravi", 34, small-town / city clinic visitor)
- Uses Telegram/WhatsApp daily; writes Hindi, English or Hinglish ("kal subah doctor available hai?").
- Goals: find the right doctor, know fees/timings, book/cancel/reschedule quickly, without calling and waiting.
- Pain: clinic phones busy, slow replies, inconsistent answers, unclear fees.
- Constraints: low patience, may type short/informal messages, shares minimal data.

## Persona 2: Clinic manager / receptionist (e.g. "Meena", 40)
- Maintains doctors, schedules, fees, policies; answers the same questions repeatedly.
- Goals: reduce repetitive questions, keep info consistent, stay in control of what the bot says.
- Pain: policy documents live in PDFs/Word files; manual retyping; fear of the bot giving wrong info.
- Constraints: not technical; needs guided, step-by-step Telegram conversations; wants to approve everything.

## Persona 3 (secondary): Clinic staff handling escalations
- Receives uncertain/sensitive requests the bot cannot handle; needs context (what the patient asked, what was tried).

## Problem statements
1. Patients cannot get fast, consistent clinic info or book appointments outside staff availability.
2. Managers waste time repeating answers and converting policy documents into usable information.
3. Clinics need AI help without losing control or exposing patients to medical advice or wrong data.

## Open questions (agent must raise these in Gate 1)
- How is a patient "verified" on Telegram for lookup/cancel/reschedule? (suggestion: booking code + name/phone)
- How is a Telegram account linked to a clinic manager role? (suggestion: one-time invite code issued by admin)
- One bot per clinic or one bot serving many clinics? (affects clinic isolation design)
- Who receives escalations: a staff Telegram group, a manager chat, or a dashboard?
