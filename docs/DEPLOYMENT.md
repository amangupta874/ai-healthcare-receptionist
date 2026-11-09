# DEPLOYMENT

## Staging
- [ ] Dockerfile for backend and agent; docker-compose for local/staging
- [ ] Separate staging bot token and staging database
- [ ] Public HTTPS URL; set Telegram webhook with secret token
- [ ] Run migrations (`prisma migrate deploy`) and seed demo clinic
- [ ] Smoke tests: /health on both services, booking flow, document flow, escalation
- [ ] Verify logs have no personal data

## Production (only after QA exit criteria and security checklist pass; user must approve)
- [ ] Separate production secrets, bot, DB; backups + restore test
- [ ] HTTPS, security headers, rate limits on
- [ ] Error tracking + uptime monitoring + alerts (backend down, webhook failures, LLM errors, high latency)
- [ ] Rollback plan (previous image tag + DB migration strategy)
- [ ] Privacy notice and clinic consent documented

## Monitoring and maintenance
Weekly: review errors, escalations, unanswered questions -> add approved FAQs; update dependencies; check costs of LLM usage;
review audit logs; collect feedback.
