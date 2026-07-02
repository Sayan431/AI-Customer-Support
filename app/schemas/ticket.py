"""
Pydantic schemas for Ticket endpoints.
"""
from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, Field
from app.models.ticket import TicketCategory, TicketPriority, TicketStatus
from app.models.message import MessageSender


# ── Ticket Request Schemas ─────────────────────────────────────────────────────
class TicketCreate(BaseModel):
    subject: str = Field(..., min_length=5, max_length=500)
    description: str = Field(..., min_length=20)
    priority: TicketPriority = TicketPriority.MEDIUM
    category: TicketCategory = TicketCategory.GENERAL


class TicketUpdate(BaseModel):
    subject: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    category: Optional[TicketCategory] = None
    agent_id: Optional[uuid.UUID] = None
    satisfaction_score: Optional[int] = Field(None, ge=1, le=5)


# ── Message Schemas ────────────────────────────────────────────────────────────
class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1)
    is_internal_note: bool = False


class MessageOut(BaseModel):
    id: uuid.UUID
    sender_type: MessageSender
    content: str
    is_internal_note: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Ticket Response Schemas ────────────────────────────────────────────────────
class TicketOut(BaseModel):
    id: uuid.UUID
    ticket_number: str
    subject: str
    description: str
    status: TicketStatus
    priority: TicketPriority
    category: TicketCategory
    ai_summary: Optional[str]
    ai_suggested_response: Optional[str]
    ai_sentiment: Optional[str]
    satisfaction_score: Optional[int]
    customer_id: uuid.UUID
    agent_id: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]

    model_config = {"from_attributes": True}


class TicketDetail(TicketOut):
    messages: list[MessageOut] = []


class TicketListResponse(BaseModel):
    tickets: list[TicketOut]
    total: int
    page: int
    page_size: int


# ── AI Action Schemas ──────────────────────────────────────────────────────────
class SummarizeRequest(BaseModel):
    ticket_id: uuid.UUID


class SummarizeResponse(BaseModel):
    ticket_id: uuid.UUID
    summary: str
    sentiment: str
    key_points: list[str]
    suggested_category: str
    suggested_priority: str


class AutoResponseRequest(BaseModel):
    ticket_id: uuid.UUID
    tone: str = Field("professional", pattern="^(professional|friendly|formal|empathetic)$")
    include_solution: bool = True


class AutoResponseOut(BaseModel):
    ticket_id: uuid.UUID
    response: str
    tone: str
