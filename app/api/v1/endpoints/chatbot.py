"""
AI Chatbot endpoints — send messages, manage conversations.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.conversation import ChatMessage
from app.schemas.chatbot import (
    ChatRequest, ChatResponse, ChatMessageOut,
    ConversationOut, ConversationHistory,
)
from app.services import chatbot_service

router = APIRouter(prefix="/chatbot", tags=["AI Chatbot"])


@router.post("/message", response_model=ChatResponse)
async def send_message(
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a message to the AI support chatbot.
    - Provide `conversation_id` to continue an existing session.
    - Omit it (or pass null) to start a new conversation.
    """
    try:
        result = await chatbot_service.send_message(
            db=db,
            user=current_user,
            user_message=payload.message,
            conversation_id=payload.conversation_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(e)}",
        )

    return ChatResponse(
        conversation_id=result["conversation"].id,
        message=ChatMessageOut.model_validate(result["ai_message"]),
        suggested_actions=result["suggested_actions"],
        confidence=result["confidence"],
    )


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all chatbot conversations for the current user."""
    conversations = await chatbot_service.list_user_conversations(
        db, current_user.id, skip=skip, limit=limit
    )
    result = []
    for conv in conversations:
        out = ConversationOut.model_validate(conv)
        out.message_count = len(conv.chat_messages)
        result.append(out)
    return result


@router.get("/conversations/{conversation_id}", response_model=ConversationHistory)
async def get_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full conversation history."""
    conv = await chatbot_service.get_conversation_detail(db, conversation_id, current_user.id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv_out = ConversationOut.model_validate(conv)
    conv_out.message_count = len(conv.chat_messages)

    return ConversationHistory(
        conversation=conv_out,
        messages=[ChatMessageOut.model_validate(m) for m in conv.chat_messages],
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a chatbot conversation."""
    conv = await chatbot_service.get_conversation_detail(db, conversation_id, current_user.id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conv)
