# QA PLAN

## Automated
Unit (logic, validators), integration (API + DB), agent graph tests with mocked LLM, e2e through a Telegram test harness.
Mandatory scenarios: happy-path booking; no confirmation -> no booking; double booking blocked; cancel/reschedule with and
without verification; cross-clinic access denied; wrong role denied; FAQ unknown -> escalation; medical question refused;
prompt injection (chat + document); contradictory document -> clarification; scanned PDF OCR; invalid file; backend down;
LLM timeout; Hindi/English/Hinglish variants of every patient intent.

## Real-user QA (5-10 testers)
Roles: 5 patients, 2 clinic managers (ideally real clinic staff). Give each a task list:
- Patient: find a doctor, book, check, reschedule, cancel, ask 3 FAQs, ask a medical question, write in Hinglish.
- Manager: setup clinic, add doctor/schedule, upload policy PDF, resolve clarifications, approve, verify patient sees answers.
Collect: task success, time taken, confusing messages, wrong answers, language problems, 1-5 satisfaction, free comments.

## Feedback form fields
Role | Task completed? | Where did you get stuck? | Any wrong/unsafe answer? | Language used | Rating | Suggestions

## Exit criteria
No critical/high bugs open; all mandatory scenarios pass; manager can complete document flow unaided; no unsafe medical output.
