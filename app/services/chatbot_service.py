"""
Business logic for AI chatbot conversations.
Manages conversation creation, message persistence, and AI response flow.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from loguru import logger

from app.models.conversation import Conversation, ChatMessage, ChatRole
from app.models.user import User
from app.services import ai_service


async def get_or_create_conversation(
    db: AsyncSession,
    user: User,
    conversation_id: uuid.UUID | None,
) -> Conversation:
    """Return existing conversation or create a new one."""
    if conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user.id,
            )
        )
        conv = result.scalar_one_or_none()
        if conv:
            return conv

    # Create a new conversation
    conv = Conversation(user_id=user.id, title="New Conversation")
    db.add(conv)
    await db.flush()
    return conv


async def get_conversation_history(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    limit: int = 20,
) -> list[dict]:
    """Fetch last N messages for the model's context window."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    messages = result.scalars().all()
    # Reverse so oldest-first for the AI
    return [
        {"role": m.role.value, "content": m.content}
        for m in reversed(messages)
    ]


async def send_message(
    db: AsyncSession,
    user: User,
    user_message: str,
    conversation_id: uuid.UUID | None = None,
) -> dict:
    """
    Main chatbot handler:
    1. Get/create conversation
    2. Load history
    3. Call AI
    4. Persist both turns
    5. Return structured response
    """
    conv = await get_or_create_conversation(db, user, conversation_id)

    # Load history
    history = await get_conversation_history(db, conv.id)

    # Call AI
    logger.info(f"Chatbot request: conv={conv.id}, user={user.id}")
    ai_result = await ai_service.chat_with_support_ai(user_message, history)

    # Persist user message
    user_msg = ChatMessage(
        conversation_id=conv.id,
        role=ChatRole.USER,
        content=user_message,
    )
    db.add(user_msg)

    # Persist AI reply
    ai_msg = ChatMessage(
        conversation_id=conv.id,
        role=ChatRole.ASSISTANT,
        content=ai_result["reply"],
        tokens_used=ai_result.get("tokens_used"),
    )
    db.add(ai_msg)

    # Update conversation title from first message
    if not history:
        conv.title = user_message[:80] + ("..." if len(user_message) > 80 else "")

    conv.updated_at = datetime.now(timezone.utc)
    await db.flush()

    # Estimate confidence based on reply length
    confidence = min(1.0, max(0.5, len(ai_result["reply"]) / 500))

    return {
        "conversation": conv,
        "ai_message": ai_msg,
        "suggested_actions": ai_result["suggested_actions"],
        "confidence": round(confidence, 2),
    }


async def list_user_conversations(
    db: AsyncSession,
    user_id: uuid.UUID,
    skip: int = 0,
    limit: int = 20,
) -> list[Conversation]:
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.chat_messages))
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


async def get_conversation_detail(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Conversation | None:
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.chat_messages))
        .where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()