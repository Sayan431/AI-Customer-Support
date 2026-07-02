"""
Core OpenAI AI integration layer.
Handles model initialisation, prompt engineering, and retry logic.

Uses the official `openai` SDK directly against OpenAI's API.
"""
import json
from typing import Any
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from openai import AsyncOpenAI
from loguru import logger

from app.core.config import settings

# ── Configure OpenAI client ───────────────────────────────────────────────────
_client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY,
)

# ── System prompt for customer support chatbot ─────────────────────────────────
CHATBOT_SYSTEM_PROMPT = """You are an AI-powered customer support assistant for our company.

Your responsibilities:
- Answer customer questions accurately and helpfully
- Help troubleshoot technical issues step by step  
- Guide customers through account, billing, and product queries
- Escalate to a human agent when issues are complex or sensitive
- Always be empathetic, professional, and concise

Rules:
- Never fabricate information. If unsure, say so and offer to connect them with an agent.
- Do not discuss competitors or make promises outside your knowledge.
- Keep responses under 300 words unless a detailed explanation is needed.
- Always end with a follow-up question or offer further assistance.

Output suggested_actions as a JSON list at the end of your response in this format:
[ACTIONS: ["action1", "action2"]]
"""


# ── Retry decorator ────────────────────────────────────────────────────────────
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def _call_openai_main(prompt: str, system: str | None = None) -> str:
    """Call the main (larger) OpenAI model with retry logic. Returns text response."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = await _client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        temperature=0.7,
        top_p=0.9,
        max_tokens=2048,
    )
    return response.choices[0].message.content


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=5),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def _call_openai_flash(prompt: str, system: str | None = None) -> str:
    """Call the fast/cheap OpenAI model with retry logic."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = await _client.chat.completions.create(
        model=settings.OPENAI_FLASH_MODEL,
        messages=messages,
        temperature=0.4,
        max_tokens=1024,
    )
    return response.choices[0].message.content


# ── Public AI functions ────────────────────────────────────────────────────────

async def summarize_ticket(
    subject: str,
    description: str,
    messages: list[dict],
) -> dict[str, Any]:
    """
    Summarize a support ticket and extract metadata.
    Returns: {summary, sentiment, key_points, suggested_category, suggested_priority}
    """
    conversation_text = "\n".join(
        f"[{m['sender_type'].upper()}]: {m['content']}" for m in messages
    )
    prompt = f"""Analyze this customer support ticket and provide a structured analysis.

TICKET SUBJECT: {subject}
TICKET DESCRIPTION: {description}

CONVERSATION THREAD:
{conversation_text or "(No messages yet)"}

Respond ONLY with a valid JSON object in this exact format:
{{
  "summary": "2-3 sentence summary of the issue and current status",
  "sentiment": "positive|neutral|negative|frustrated|urgent",
  "key_points": ["point 1", "point 2", "point 3"],
  "suggested_category": "billing|technical|account|general|complaint|feature_request",
  "suggested_priority": "low|medium|high|urgent"
}}"""

    raw = await _call_openai_flash(prompt)
    # Extract JSON from response
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


async def generate_auto_response(
    subject: str,
    description: str,
    summary: str,
    tone: str = "professional",
    include_solution: bool = True,
) -> str:
    """
    Generate a professional auto-response for a support ticket.
    """
    solution_instruction = (
        "Include a suggested solution or next steps." if include_solution
        else "Focus on acknowledging the issue and setting expectations."
    )
    prompt = f"""You are a customer support agent. Write a {tone} email response to this support ticket.

TICKET SUBJECT: {subject}
TICKET DESCRIPTION: {description}
TICKET SUMMARY: {summary}

Instructions:
- Tone: {tone}
- {solution_instruction}
- Start with a greeting and acknowledgment
- Be concise (150-250 words)
- End with contact information placeholder: [AGENT_NAME] | [SUPPORT_EMAIL]
- Do NOT include a subject line, just the email body

Write the response now:"""

    return await _call_openai_main(prompt)


async def chat_with_support_ai(
    user_message: str,
    history: list[dict],
) -> dict[str, Any]:
    """
    Multi-turn chatbot conversation using the main OpenAI model.
    `history` items are expected as {"role": "user"|"assistant", "content": str}.
    Returns: {reply, suggested_actions, tokens_used}
    """
    messages = [{"role": "system", "content": CHATBOT_SYSTEM_PROMPT}]
    for m in history:
        role = m["role"]
        # Normalise any non-OpenAI role naming (e.g. legacy "model") to "assistant"
        if role not in ("user", "assistant", "system"):
            role = "assistant"
        messages.append({"role": role, "content": m["content"]})
    messages.append({"role": "user", "content": user_message})

    response = await _client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        temperature=0.7,
        top_p=0.9,
        max_tokens=2048,
    )

    text = response.choices[0].message.content

    # Extract suggested actions
    suggested_actions = []
    marker = "[ACTIONS:"
    if marker in text:
        try:
            start = text.index(marker) + len(marker)
            # Find the matching closing bracket for the actions list itself
            list_start = text.index("[", start)
            depth = 0
            list_end = None
            for i in range(list_start, len(text)):
                if text[i] == "[":
                    depth += 1
                elif text[i] == "]":
                    depth -= 1
                    if depth == 0:
                        list_end = i
                        break
            if list_end is not None:
                actions_part = text[list_start:list_end + 1]
                suggested_actions = json.loads(actions_part.strip())
                text = (text[:text.index(marker)] + text[list_end + 2:]).strip()
        except Exception:
            pass
        except Exception:
            pass

    tokens_used = None
    try:
        tokens_used = response.usage.total_tokens
    except Exception:
        pass

    return {
        "reply": text,
        "suggested_actions": suggested_actions or ["Create a ticket", "Talk to an agent"],
        "tokens_used": tokens_used,
    }


async def classify_ticket_urgency(subject: str, description: str) -> dict[str, str]:
    """Quick classification of a new ticket for routing."""
    prompt = f"""Classify this support ticket for routing.

Subject: {subject}
Description: {description}

Respond ONLY with JSON:
{{
  "priority": "low|medium|high|urgent",
  "category": "billing|technical|account|general|complaint|feature_request",
  "sentiment": "positive|neutral|negative|frustrated",
  "should_escalate": true|false
}}"""
    raw = await _call_openai_flash(prompt)
    raw = raw.strip().strip("```json").strip("```").strip()
    return json.loads(raw)