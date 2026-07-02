"""
AI Summarization & Auto-Response endpoints.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, require_agent
from app.models.user import User, UserRole
from app.schemas.ticket import (
    SummarizeRequest, SummarizeResponse,
    AutoResponseRequest, AutoResponseOut,
)
from app.services import summarization_service

router = APIRouter(prefix="/ai", tags=["AI — Summarization & Auto-Response"])


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_ticket(
    payload: SummarizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate an AI summary for a support ticket.

    Returns:
    - `summary`: A concise 2-3 sentence summary of the issue
    - `sentiment`: Customer emotional state
    - `key_points`: List of important points from the conversation
    - `suggested_category` / `suggested_priority`: AI routing recommendations
    """
    try:
        result = await summarization_service.summarize_ticket(db, payload.ticket_id)
        return SummarizeResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI summarization failed: {str(e)}",
        )


@router.post("/auto-response", response_model=AutoResponseOut)
async def generate_auto_response(
    payload: AutoResponseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_agent),   # Agents only
):
    """
    Generate an AI-drafted response for a support ticket.
    The response is also saved as `ai_suggested_response` on the ticket.

    Tone options: `professional`, `friendly`, `formal`, `empathetic`
    """
    try:
        result = await summarization_service.generate_auto_response(
            db=db,
            ticket_id=payload.ticket_id,
            tone=payload.tone,
            include_solution=payload.include_solution,
        )
        return AutoResponseOut(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Auto-response generation failed: {str(e)}",
        )


@router.post("/bulk-summarize")
async def bulk_summarize(
    ticket_ids: list[uuid.UUID],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_agent),
):
    """
    Queue bulk AI summarization for multiple tickets (agent/admin only).
    Returns a job status — actual processing runs in Celery background tasks.
    """
    from app.tasks.celery_tasks import bulk_summarize_tickets
    task = bulk_summarize_tickets.delay([str(tid) for tid in ticket_ids])
    return {
        "task_id": task.id,
        "message": f"Queued {len(ticket_ids)} tickets for summarization",
        "ticket_count": len(ticket_ids),
    }
