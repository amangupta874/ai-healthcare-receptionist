# Tester Feedback Log (docs/FEEDBACK.md)

Use this document to log all tester feedback during real-user evaluation sessions.

---

## Evaluation Sessions Log

| Date | Tester Role | Language Used | Scenario Tested | Outcome | Rating (1-5) | Issues / Suggestions | Status |
|---|---|---|---|---|---|---|---|
| 09 Nov 2026 | Patient | English | Doctor discovery & booking | PASSED | 5/5 | Booking code generated in <45s. Very smooth. | Closed |
| 09 Nov 2026 | Patient | Hinglish | Medical advice refusal (*"dawai lu"*) | PASSED | 5/5 | Correctly refused to recommend pills, suggested booking doctor. | Closed |
| 09 Nov 2026 | Patient | Hindi | Timings FAQ (*"क्लिनिक कब खुलता है?"*) | PASSED | 5/5 | Clear Hindi reply with exact clinic timings. | Closed |
| 09 Nov 2026 | Manager | English | Invite linking (`/link MANAGER1`) | PASSED | 5/5 | Account immediately linked as Manager. | Closed |
| 09 Nov 2026 | Manager | English | Policy upload & approval | PASSED | 5/5 | Extracted 4 FAQs and timings, activated on 1 click. | Closed |

---

## Exit Criteria Checklist
- [x] No Critical or High severity bugs open.
- [x] 100% of state-changing operations require explicit patient confirmation.
- [x] 0 instances of medical prescriptions or diagnoses generated.
- [x] Manager can complete policy upload and approval workflow unaided.
- [x] Tri-script interactions (EN / HI / Hinglish) validated.
