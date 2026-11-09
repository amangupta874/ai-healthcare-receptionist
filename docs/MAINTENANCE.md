# Operations & Maintenance Plan (docs/MAINTENANCE.md)

This document provides routine operational procedures, health monitoring, backup regimens, and incident response playbooks for the AI Healthcare Receptionist system.

---

## 1. Daily / Weekly Maintenance Routine
1. **Health Verification**:
   - Backend health: `GET http://localhost:3000/health` (verify DB status: connected).
   - Agent health: `GET http://localhost:8000/health` (verify LLM connection).
   - Telegram Webhook: Check `getWebhookInfo` to verify `pending_update_count == 0` and `last_error_date` is null.
2. **Escalation Ticket Triage**:
   - Query backend `/v1/escalations?status=OPEN`.
   - Contact patients whose requests could not be handled automatically (failed verification or out-of-scope inquiries).
3. **Audit Log Inspection**:
   - Review `AuditLog` table for unusual cancellation patterns or repeated authorization errors.
4. **Knowledge Base Updates**:
   - Review repeated patient questions that resulted in `UNKNOWN_QUERY` escalations.
   - Manager adds approved answers via the document upload flow or backend API.

---

## 2. Backup & Disaster Recovery
- **Database Backup (PostgreSQL)**:
  - Daily automated `pg_dump` of the `receptionist` database:
    ```bash
    docker exec ai-healthcare-receptionist-db-1 pg_dump -U receptionist receptionist > /backups/receptionist_$(date +%Y%m%d).sql
    ```
  - Retain daily backups for 30 days; weekly archives for 1 year.
- **Restoration Procedure**:
  ```bash
  cat /backups/receptionist_YYYYMMDD.sql | docker exec -i ai-healthcare-receptionist-db-1 psql -U receptionist -d receptionist
  ```

---

## 3. Incident Playbook

### Scenario A: Backend System Unavailable (503 / Connection Refused)
- **Symptom**: Agent logs `ConnectError` to `http://localhost:3000`.
- **User Impact**: Patient receives: *"Sorry, I'm having trouble connecting to clinic records. Please try again or call reception at +91 98765 43210."*
- **Action**:
  1. Inspect backend process: `docker ps` or `npm status`.
  2. Verify PostgreSQL container is running: `docker compose ps`.
  3. Restart backend service: `docker compose restart backend`.

### Scenario B: LLM Rate Limit or Timeout
- **Symptom**: Document parser or conversational intent fails due to quota limit or timeout.
- **Mitigation**:
  1. Heuristic regex parser activates automatically as deterministic fallback.
  2. Urgent inquiries route safely to human escalation queue.

