# 🤖 AI Customer Support Portal

A production-ready backend for an AI-powered customer support system built with **FastAPI**, **Google Gemini AI**, and **PostgreSQL**.

## Features

- 🧠 **AI Chatbot** — Conversational support agent with persistent multi-turn session memory
- 📋 **Ticket Summarization** — AI-generated 2-3 sentence summaries with sentiment, key points & routing suggestions
- ✉️ **Auto-Response Generation** — Draft professional replies in 4 tones (professional / friendly / formal / empathetic)
- 🎫 **Ticket Management** — Full CRUD with status, priority, category, and message threading
- 👤 **JWT Authentication** — Access + refresh tokens, bcrypt passwords, role-based access (customer / agent / admin)
- 📊 **Analytics Dashboard** — Ticket stats, category breakdown, daily volume, agent leaderboard, AI usage metrics
- ⚙️ **Background Tasks** — Celery + Redis for async bulk AI processing
- 🐳 **Docker-ready** — Full docker-compose with PostgreSQL, Redis, API, Celery worker & Flower monitor

## Tech Stack

| Layer        | Technology              |
|--------------|-------------------------|
| API          | FastAPI 0.111 (Python 3.11) |
| AI / LLM     | Google Gemini 1.5 Pro / Flash |
| Database     | PostgreSQL 16 + SQLAlchemy 2 (async) |
| Migrations   | Alembic                 |
| Auth         | JWT (python-jose) + bcrypt |
| Cache        | Redis 7                 |
| Task Queue   | Celery 5 + Flower       |
| Containerization | Docker + Docker Compose |

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
│   │   ├── ai_service.py               # Gemini API calls (summarize/respond/chat)
│   │   ├── chatbot_service.py          # Conversation management logic
│   │   ├── ticket_service.py           # Ticket business logic
│   │   └── summarization_service.py    # Orchestrates AI summarization
│   └── tasks/
│       └── celery_tasks.py             # Async background AI tasks
├── tests/
│   ├── test_auth.py
│   └── test_tickets.py
├── .env.example                        # Environment variable template
├── requirements.txt
├── pytest.ini
├── Dockerfile
└── docker-compose.yml
```

---

## Quick Start

### Option A — Docker (Recommended)

```bash
# 1. Copy env file and add your Gemini API key
copy .env.example .env
# Edit .env: set GEMINI_API_KEY=your-key-here

# 2. Start all services
docker-compose up --build

# API:    http://localhost:8000/docs
# Flower: http://localhost:5555
```

### Option B — Local Development

```bash
# 1. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment
copy .env.example .env
# Edit .env with your database URL and Gemini API key

# 4. Start PostgreSQL and Redis (via Docker or locally)
docker-compose up postgres redis -d

# 5. Run database migrations
alembic upgrade head

# 6. Start the API server
uvicorn app.main:app --reload --port 8000
```

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
| `POST` | `/api/v1/ai/bulk-summarize` | 🔒 Agent | Bulk summarize (async) |
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

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing secret (32+ chars) | *required* |
| `DATABASE_URL` | PostgreSQL async URL | `postgresql+asyncpg://...` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` |
| `GEMINI_API_KEY` | Google Gemini API key | *required* |
| `GEMINI_MODEL` | Pro model for complex tasks | `gemini-1.5-pro` |
| `GEMINI_FLASH_MODEL` | Flash model for quick tasks | `gemini-1.5-flash` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT access token TTL | `60` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000` |
