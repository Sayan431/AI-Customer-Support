"""
Business logic for ticket CRUD, numbering, and AI enrichment.
"""
import uuid
import random
import string
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from loguru import logger

from app.models.ticket import Ticket, TicketStatus
from app.models.message import TicketMessage, MessageSender
from app.models.user import User
from app.services import ai_service


def _generate_ticket_number() -> str:
    """Generate a unique ticket number like TKT-A3X9K2."""
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choices(chars, k=6))
    return f"TKT-{suffix}"


async def create_ticket(
    db: AsyncSession,
    customer: User,
    subject: str,
    description: str,
    priority: str,
    category: str,
) -> Ticket:
    """Create a new ticket and trigger AI classification."""
    ticket_number = _generate_ticket_number()

    ticket = Ticket(
        ticket_number=ticket_number,
        subject=subject,
        description=description,
        priority=priority,
        category=category,
        customer_id=customer.id,
    )
    db.add(ticket)
    await db.flush()

    # AI auto-classify in background (best-effort)
    try:
        classification = await ai_service.classify_ticket_urgency(subject, description)
        ticket.ai_sentiment = classification.get("sentiment")
        ticket.ai_category_suggestion = classification.get("category")
        if classification.get("should_escalate"):
            ticket.priority = "urgent"
            logger.warning(f"🚨 Ticket {ticket_number} auto-escalated by AI")
    except Exception as e:
        logger.error(f"AI classification failed for {ticket_number}: {e}")

    logger.info(f"✅ Ticket created: {ticket_number}")
    return ticket


async def get_ticket_by_id(
    db: AsyncSession,
    ticket_id: uuid.UUID,
) -> Ticket | None:
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    return result.scalar_one_or_none()


async def get_ticket_by_number(
    db: AsyncSession,
    ticket_number: str,
) -> Ticket | None:
    result = await db.execute(
        select(Ticket).where(Ticket.ticket_number == ticket_number)
    )
    return result.scalar_one_or_none()


async def list_tickets(
    db: AsyncSession,
    customer_id: uuid.UUID | None = None,
    agent_id: uuid.UUID | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Ticket], int]:
    """List tickets with optional filters and pagination."""
    query = select(Ticket)
    count_query = select(func.count(Ticket.id))

    filters = []
    if customer_id:
        filters.append(Ticket.customer_id == customer_id)
    if agent_id:
        filters.append(Ticket.agent_id == agent_id)
    if status:
        filters.append(Ticket.status == status)

    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    # Total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginated results
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Ticket.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    tickets = result.scalars().all()

    return tickets, total


async def update_ticket(
    db: AsyncSession,
    ticket: Ticket,
    updates: dict,
) -> Ticket:
    """Update ticket fields."""
    for key, value in updates.items():
        if value is not None and hasattr(ticket, key):
            setattr(ticket, key, value)

    # Auto-set resolved_at when ticket is resolved
    if updates.get("status") == TicketStatus.RESOLVED:
        ticket.resolved_at = datetime.now(timezone.utc)

    ticket.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return ticket


async def add_message_to_ticket(
    db: AsyncSession,
    ticket_id: uuid.UUID,
    sender_id: uuid.UUID | None,
    sender_type: MessageSender,
    content: str,
    is_internal_note: bool = False,
) -> TicketMessage:
    """Add a message to a ticket thread."""
    msg = TicketMessage(
        ticket_id=ticket_id,
        sender_id=sender_id,
        sender_type=sender_type,
        content=content,
        is_internal_note=is_internal_note,
    )
    db.add(msg)
    await db.flush()
    return msg


async def get_ticket_messages(
    db: AsyncSession,
    ticket_id: uuid.UUID,
    include_internal: bool = False,
) -> list[TicketMessage]:
    """Get all messages for a ticket."""
    query = select(TicketMessage).where(TicketMessage.ticket_id == ticket_id)
    if not include_internal:
        query = query.where(TicketMessage.is_internal_note == False)
    query = query.order_by(TicketMessage.created_at.asc())
    result = await db.execute(query)
    return result.scalars().all()
