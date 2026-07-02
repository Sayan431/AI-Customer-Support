# 🤖 AI Customer Support Portal

A full-stack AI-powered customer support system with a **FastAPI** backend, **OpenAI** integration, **PostgreSQL** database, and a **React** frontend.

## Features

- 🧠 **AI Chatbot** — Conversational support agent with persistent multi-turn session memory
- 📋 **Ticket Summarization** — AI-generated 2-3 sentence summaries with sentiment, key points & routing suggestions
- ✉️ **Auto-Response Generation** — Draft professional replies in 4 tones (professional / friendly / formal / empathetic)
- 🎫 **Ticket Management** — Full CRUD with status, priority, category, and message threading
- 👤 **JWT Authentication** — Access + refresh tokens, bcrypt passwords, role-based access (customer / agent / admin)
- 📊 **Analytics Dashboard** — Ticket stats, category breakdown, daily volume, agent leaderboard, AI usage metrics
- 🖥️ **React Frontend** — Full UI ("Signal") covering auth, tickets, AI assistant chat, and the analytics dashboard

## Tech Stack

| Layer        | Technology              |
|--------------|--------------------------|
| API          | FastAPI 0.111 (Python 3.11) |
| AI / LLM     | OpenAI (GPT-4o / GPT-4o-mini) |
| Database     | PostgreSQL 18 + SQLAlchemy 2 (async, via asyncpg) |
| Auth         | JWT (python-jose) + bcrypt (passlib) |
| Frontend     | React 18 + Vite + Tailwind CSS + React Router |
| Charts       | Recharts |

> **Note:** the original project scaffolding included Celery, Redis, and Docker for background bulk-AI processing. The setup below runs the API directly with `uvicorn` against a native local PostgreSQL install — no Docker, Redis, or Celery required for core functionality (chat, tickets, summarization, auto-response, dashboard). `bulk-summarize` (`/api/v1/ai/bulk-summarize`) still depends on Celery/Redis and is not covered by this quick-start.

---

## Project Structure

```
AI Customer Support/
├── app/
│   ├── main.py                         # FastAPI app factory
│   ├── api/
│   │   ├── deps.py                     # Auth dependencies & role guards
│   │   └── v1/
│   │       ├── router.py               # Mounts all sub-routers
│   │       └── endpoints/
│   │           ├── auth.py             # POST /register /login /refresh, GET /me
│   │           ├── chatbot.py          # POST /chatbot/message, GET /conversations
│   │           ├── tickets.py          # Full ticket CRUD + message threads
│   │           ├── summarization.py    # POST /ai/summarize /ai/auto-response
│   │           └── analytics.py        # GET /analytics/dashboard
│   ├── core/
│   │   ├── config.py                   # Pydantic settings (env vars)
│   │   ├── security.py                 # JWT + bcrypt
│   │   └── database.py                 # Async SQLAlchemy engine & session
│   ├── models/
│   │   ├── user.py                     # User ORM (customer/agent/admin)
│   │   ├── ticket.py                   # Ticket ORM with AI fields
│   │   ├── message.py                  # TicketMessage ORM
│   │   └── conversation.py             # Conversation + ChatMessage ORM
│   ├── schemas/
│   │   ├── user.py                     # Register / login / token schemas
│   │   ├── ticket.py                   # Ticket CRUD + AI action schemas
│   │   ├── chatbot.py                  # Chat request/response schemas
│   │   └── analytics.py                # Dashboard schemas
│   ├── services/
│   │   ├── ai_service.py               # OpenAI API calls (summarize/respond/chat)
│   │   ├── chatbot_service.py          # Conversation management logic
│   │   ├── ticket_service.py           # Ticket business logic
│   │   └── summarization_service.py    # Orchestrates AI summarization
│   └── tasks/
│       └── celery_tasks.py             # Async background AI tasks (bulk-summarize only)
├── frontend/                           # React + Vite + Tailwind UI ("Signal")
│   ├── src/
│   │   ├── lib/api.js                  # Fetch wrapper for every backend endpoint
│   │   ├── context/AuthContext.jsx     # Session state, login/register/logout
│   │   ├── components/                 # Shell (nav), status/priority badges
│   │   └── pages/                      # Login, Register, TicketList, NewTicket,
│   │                                   #   TicketDetail, Chat, Dashboard
│   └── .env                            # VITE_API_URL, pointed at the backend
├── tests/
│   ├── test_auth.py
│   └── test_tickets.py
├── .env                                # Backend environment variables (not committed)
├── .env.example                        # Environment variable template
├── requirements.txt
├── pytest.ini
├── Dockerfile
└── docker-compose.yml
```

---

## Quick Start (local, no Docker)

### 1. Backend

```bash
# From the project root
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

pip install -r requirements.txt
```

Install and start PostgreSQL locally (see below), then create the database:

```bash
psql -U postgres
CREATE DATABASE ai_support_db;
\q
```

Copy `.env.example` to `.env` and fill in:

```
SECRET_KEY=some-long-random-string
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/ai_support_db
ALLOWED_ORIGINS=["http://localhost:5173"]

OPENAI_API_KEY=your-openai-key-here
OPENAI_MODEL=gpt-4o
OPENAI_FLASH_MODEL=gpt-4o-mini
```

Run the API (excluding `venv/` from the reload watcher keeps logs clean):

```bash
uvicorn app.main:app --reload --reload-dir app
```

Tables are created automatically on startup — no manual migration step needed for local dev. API docs: **http://localhost:8000/docs**

### 2. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:8000/api/v1
```

```bash
npm run dev
```

Runs at **http://localhost:5173**.

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/register` | — | Register new user |
| `POST` | `/api/v1/auth/login` | — | Login, get JWT tokens |
| `POST` | `/api/v1/auth/refresh` | — | Refresh access token |
| `GET`  | `/api/v1/auth/me` | ✅ | Get current user |
| `POST` | `/api/v1/chatbot/message` | ✅ | Send chatbot message |
| `GET`  | `/api/v1/chatbot/conversations` | ✅ | List conversations |
| `GET`  | `/api/v1/chatbot/conversations/{id}` | ✅ | Get conversation history |
| `POST` | `/api/v1/tickets` | ✅ | Create support ticket |
| `GET`  | `/api/v1/tickets` | ✅ | List tickets (role-filtered) |
| `GET`  | `/api/v1/tickets/{id}` | ✅ | Get ticket with messages |
| `PATCH`| `/api/v1/tickets/{id}` | ✅ | Update ticket |
| `POST` | `/api/v1/tickets/{id}/messages` | ✅ | Add reply to ticket |
| `POST` | `/api/v1/tickets/{id}/assign` | 🔒 Agent | Assign ticket to agent |
| `POST` | `/api/v1/ai/summarize` | ✅ | Summarize ticket with AI |
| `POST` | `/api/v1/ai/auto-response` | 🔒 Agent | Generate AI response |
| `POST` | `/api/v1/ai/bulk-summarize` | 🔒 Agent | Bulk summarize (async, requires Celery/Redis) |
| `GET`  | `/api/v1/analytics/dashboard` | 🔒 Agent | Dashboard metrics |
| `GET`  | `/health` | — | Health check |

Interactive docs: **http://localhost:8000/docs**

---

## Running Tests

```bash
pytest tests/ -v
```

---

## Environment Variables

### Backend (`.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing secret (32+ chars) | *required* |
| `DATABASE_URL` | PostgreSQL async URL (must use `+asyncpg`) | *required* |
| `ALLOWED_ORIGINS` | JSON array of allowed CORS origins, e.g. `["http://localhost:5173"]` | `["http://localhost:3000"]` |
| `OPENAI_API_KEY` | OpenAI API key | *required* |
| `OPENAI_MODEL` | Model for complex tasks (auto-response, chat) | `gpt-4o` |
| `OPENAI_FLASH_MODEL` | Model for quick tasks (summarize, classify) | `gpt-4o-mini` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT access token TTL | `60` |
| `REDIS_URL` | Redis connection URL — only needed for `/ai/bulk-summarize` | `redis://localhost:6379/0` |

`ALLOWED_ORIGINS` and any other list-typed setting must be valid JSON (e.g. `["a","b"]`), not a bare comma-separated string.

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Base URL of the backend API | `http://localhost:8000/api/v1` |

---

## Deployment

- **Backend + PostgreSQL:** [Render](https://render.com) — free web service + free managed Postgres instance. Set the start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT` and add all backend env vars above (with `DATABASE_URL` pointed at Render's Postgres, using `+asyncpg`).
- **Frontend:** [Vercel](https://vercel.com) — import the `frontend/` folder as the project root, set `VITE_API_URL` to the deployed Render backend URL.
- After deploying, update `ALLOWED_ORIGINS` on the backend to include the live frontend URL.
