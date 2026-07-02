"""
Summarization service — orchestrates ticket summarization and auto-response generation.
"""
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.services import ai_service
from app.services.ticket_service import get_ticket_by_id, get_ticket_messages


async def summarize_ticket(
    db: AsyncSession,
    ticket_id: uuid.UUID,
) -> dict:
    """
    Summarize a ticket using AI and persist the results.
    Returns the structured summary dict.
    """
    ticket = await get_ticket_by_id(db, ticket_id)
    if not ticket:
        raise ValueError(f"Ticket {ticket_id} not found")

    # Fetch all messages
    messages = await get_ticket_messages(db, ticket_id, include_internal=False)
    messages_data = [
        {"sender_type": m.sender_type.value, "content": m.content}
        for m in messages
    ]

    # Call AI
    logger.info(f"📝 Summarizing ticket {ticket.ticket_number}")
    result = await ai_service.summarize_ticket(
        subject=ticket.subject,
        description=ticket.description,
        messages=messages_data,
    )

    # Persist AI summary back to ticket
    ticket.ai_summary = result["summary"]
    ticket.ai_sentiment = result.get("sentiment")
    ticket.ai_category_suggestion = result.get("suggested_category")
    await db.flush()

    return {
        "ticket_id": ticket.id,
        "summary": result["summary"],
        "sentiment": result.get("sentiment", "neutral"),
        "key_points": result.get("key_points", []),
        "suggested_category": result.get("suggested_category", "general"),
        "suggested_priority": result.get("suggested_priority", "medium"),
    }


async def generate_auto_response(
    db: AsyncSession,
    ticket_id: uuid.UUID,
    tone: str = "professional",
    include_solution: bool = True,
) -> dict:
    """
    Generate an AI-powered auto-response for a ticket.
    Optionally stores it as a suggested response on the ticket.
    """
    ticket = await get_ticket_by_id(db, ticket_id)
    if not ticket:
        raise ValueError(f"Ticket {ticket_id} not found")

    # Use existing summary or generate one
    summary = ticket.ai_summary
    if not summary:
        summary_result = await summarize_ticket(db, ticket_id)
        summary = summary_result["summary"]

    logger.info(f"✉️ Generating auto-response for {ticket.ticket_number} ({tone})")
    response_text = await ai_service.generate_auto_response(
        subject=ticket.subject,
        description=ticket.description,
        summary=summary,
        tone=tone,
        include_solution=include_solution,
    )

    # Persist as suggested response
    ticket.ai_suggested_response = response_text
    await db.flush()

    return {
        "ticket_id": ticket.id,
        "response": response_text,
        "tone": tone,
    }
