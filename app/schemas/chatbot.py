"""
Pydantic schemas for AI Chatbot endpoints.
"""
from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, Field
from app.models.conversation import ChatRole


# ── Request Schemas ────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[uuid.UUID] = None  # None = start new conversation


class ConversationCreate(BaseModel):
    title: str = Field("New Conversation", max_length=255)


# ── Response Schemas ───────────────────────────────────────────────────────────
class ChatMessageOut(BaseModel):
    id: uuid.UUID
    role: ChatRole
    content: str
    tokens_used: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    message: ChatMessageOut          # The AI reply
    suggested_actions: list[str]     # e.g. ["Create a ticket", "View FAQs"]
    confidence: float                # 0.0 – 1.0 estimate


class ConversationOut(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = {"from_attributes": True}


class ConversationHistory(BaseModel):
    conversation: ConversationOut
    messages: list[ChatMessageOut]
