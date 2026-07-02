# Signal — Frontend for AI Customer Support Portal

React + Vite + Tailwind frontend for the FastAPI backend in this project.

## Setup

```bash
npm install
cp .env.example .env   # point VITE_API_URL at your running backend
npm run dev
```

Runs at http://localhost:5173 by default. The backend's `ALLOWED_ORIGINS`
already includes this, so CORS works out of the box once the backend is
running (`uvicorn app.main:app --reload`, default port 8000).

## What's included

- **Auth** — register / login / JWT with silent refresh (`src/context/AuthContext.jsx`, `src/lib/api.js`)
- **Tickets** — list with status filters + search, create, detail view with
  threaded messages, internal agent notes, status changes, satisfaction rating
- **AI panel** (on ticket detail) — generate/regenerate summary + sentiment,
  draft an auto-response in a chosen tone, insert draft into the reply box
- **AI Assistant chat** — multi-conversation chatbot with suggested actions
- **Dashboard** (agent/admin only) — ticket volume chart, category breakdown,
  agent performance, AI usage stats, pulling from `/analytics/dashboard`

Role-aware throughout: customers see only their own tickets and a simplified
UI; agents/admins get the dashboard nav item, status controls, internal
notes, and AI drafting tools.

## Structure

```
src/
  lib/api.js          — typed fetch wrapper for every backend endpoint
  context/AuthContext  — user session, login/register/logout
  components/          — Shell (nav), status/priority badges
  pages/                — Login, Register, TicketList, NewTicket,
                          TicketDetail, Chat, Dashboard
```
