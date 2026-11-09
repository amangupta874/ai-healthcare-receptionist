# AI Healthcare Receptionist (Telegram) - Antigravity Starter Kit

This folder is the complete "brain" for building the project with an AI coding agent
(Google Antigravity or any similar tool). The agent forgets things when the spec lives
only in chat, so everything lives in files here.

## What is inside
| File | Purpose |
|---|---|
| `START_HERE_PROMPT.md` | The ONE prompt you paste into Antigravity to begin |
| `rules.md` | Non-negotiable rules the agent must follow (also mirrored in `AGENTS.md`, `GEMINI.md`, `.agent/rules/`) |
| `tasks.md` | Full ordered checklist of the 18-step workflow + every build task |
| `docs/PROPOSAL.pdf` | Your original proposal (source of truth) |
| `docs/SPEC.md` | Text version of the proposal |
| `docs/PRD.md` | Requirements, user stories, acceptance criteria |
| `docs/USERS.md` | Personas and problems |
| `docs/RESEARCH.md` | Research brief (agent must fill it using web search) |
| `docs/ARCHITECTURE.md` | Components, phases, API contracts, data model |
| `docs/CONVERSATION_DESIGN.md` | Telegram "UI/UX": flows, buttons, Hindi/English/Hinglish samples |
| `docs/PREREQUISITES.md` | What YOU must install/create before starting |
| `docs/SECURITY_CHECKLIST.md` | Used in the security-review step |
| `docs/QA_PLAN.md` | Test plan for real users |
| `docs/DEPLOYMENT.md` | Staging and production checklist |
| `.env.example`, `docker-compose.yml`, `.gitignore` | Setup scaffolding |

## How to use (5 minutes)
1. Unzip. Do everything in `docs/PREREQUISITES.md` (install tools, get bot token, API key).
2. Open this folder as a workspace in Antigravity.
3. Run `git init && git add . && git commit -m "starter kit"`.
4. Open `START_HERE_PROMPT.md`, copy the prompt, paste it into the Antigravity agent.
5. The agent works in **gates**. It stops after each one. Read the output, then reply
   "approved, continue" (or give corrections).
6. After each gate ask: "Compare the repo against docs/SPEC.md and tasks.md. What is missing?"
7. Commit to Git after every gate.

## Tips
- If Antigravity has a Rules / Workspace Rules setting, also paste `rules.md` there.
- Start a fresh chat per gate and begin with: "Read rules.md, tasks.md and docs/SPEC.md first."
- Do not trust "done" claims. Run tests yourself.
