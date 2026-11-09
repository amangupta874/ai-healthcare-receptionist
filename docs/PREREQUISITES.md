# PREREQUISITES (you do these - the AI agent cannot)

## Software
- [ ] Git
- [ ] Node.js LTS (>= 20) + npm
- [ ] Python 3.11+ and pip/venv (or uv)
- [ ] Docker Desktop (for PostgreSQL via docker-compose) - or PostgreSQL 15+ installed locally
- [ ] Tesseract OCR with English + Hindi language data (`tesseract-ocr`, `tesseract-ocr-hin`) and Poppler (for pdf2image)
- [ ] ngrok or cloudflared (public HTTPS URL for Telegram webhook during development)
- [ ] Google Antigravity (or your AI IDE) installed and signed in

## Accounts / keys
- [ ] Telegram bot: talk to @BotFather -> /newbot -> save BOT TOKEN. Create a second test bot if you want a staging bot.
- [ ] LLM API key (e.g. Google Gemini or other) -> `LLM_API_KEY`
- [ ] (Optional) n8n instance
- [ ] (Later) hosting account for staging/production (Render, Railway, Fly.io, a VPS, etc.)
- [ ] (Later) error tracking account (e.g. Sentry)

## Test accounts
- [ ] 2 Telegram accounts: one as manager, one as patient
- [ ] Sample files: a policy PDF (text), a policy PDF (scanned), a policy DOCX, a contradictory one, an invalid file

## Setup steps
1. Copy `.env.example` to `.env` and fill values.
2. `docker compose up -d` to start PostgreSQL.
3. Never commit `.env`.
