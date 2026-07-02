"""
Ticket management endpoints — CRUD, message threads, assignment.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, require_agent
from app.models.user import User, UserRole
from app.models.message import MessageSender
from app.schemas.ticket import (
    TicketCreate, TicketUpdate, TicketOut, TicketDetail,
    TicketListResponse, MessageCreate, MessageOut,
)
from app.services import ticket_service

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.post("", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    payload: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new support ticket. AI will auto-classify priority and category."""
    ticket = await ticket_service.create_ticket(
        db=db,
        customer=current_user,
        subject=payload.subject,
        description=payload.description,
        priority=payload.priority.value,
        category=payload.category.value,
    )
    return ticket


@router.get("", response_model=TicketListResponse)
async def list_tickets(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List tickets. Customers see only their own tickets.
    Agents/admins can see all tickets.
    """
    customer_id = None if current_user.role in (UserRole.AGENT, UserRole.ADMIN) else current_user.id

    tickets, total = await ticket_service.list_tickets(
        db=db,
        customer_id=customer_id,
        status=status,
        page=page,
        page_size=page_size,
    )

    return TicketListResponse(
        tickets=[TicketOut.model_validate(t) for t in tickets],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{ticket_id}", response_model=TicketDetail)
async def get_ticket(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a ticket with its full message thread."""
    ticket = await ticket_service.get_ticket_by_id(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Customers can only see their own tickets
    if current_user.role == UserRole.CUSTOMER and ticket.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    messages = await ticket_service.get_ticket_messages(
        db, ticket_id,
        include_internal=current_user.role in (UserRole.AGENT, UserRole.ADMIN),
    )

    detail = TicketDetail(
        **TicketOut.model_validate(ticket).model_dump(),
        messages=[MessageOut.model_validate(m) for m in messages],
    )
    return detail


@router.patch("/{ticket_id}", response_model=TicketOut)
async def update_ticket(
    ticket_id: uuid.UUID,
    payload: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update ticket fields. Agents can assign/change status; customers can rate."""
    ticket = await ticket_service.get_ticket_by_id(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if current_user.role == UserRole.CUSTOMER and ticket.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    updates = payload.model_dump(exclude_none=True)
    # Customers can only update satisfaction score
    if current_user.role == UserRole.CUSTOMER:
        updates = {k: v for k, v in updates.items() if k == "satisfaction_score"}

    ticket = await ticket_service.update_ticket(db, ticket, updates)
    return ticket


@router.post("/{ticket_id}/messages", response_model=MessageOut, status_code=201)
async def add_message(
    ticket_id: uuid.UUID,
    payload: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a reply message to the ticket thread."""
    ticket = await ticket_service.get_ticket_by_id(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if current_user.role == UserRole.CUSTOMER and ticket.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    sender_type = (
        MessageSender.AGENT
        if current_user.role in (UserRole.AGENT, UserRole.ADMIN)
        else MessageSender.CUSTOMER
    )

    # Internal notes only for agents
    is_internal = payload.is_internal_note and current_user.role in (UserRole.AGENT, UserRole.ADMIN)

    msg = await ticket_service.add_message_to_ticket(
        db=db,
        ticket_id=ticket_id,
        sender_id=current_user.id,
        sender_type=sender_type,
        content=payload.content,
        is_internal_note=is_internal,
    )
    return msg


@router.post("/{ticket_id}/assign", response_model=TicketOut)
async def assign_ticket(
    ticket_id: uuid.UUID,
    agent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_agent),
):
    """Assign a ticket to an agent (agent/admin only)."""
    ticket = await ticket_service.get_ticket_by_id(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket = await ticket_service.update_ticket(db, ticket, {"agent_id": agent_id})
    return ticket