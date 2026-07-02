"""
Celery background tasks for async AI processing.
"""
from celery import Celery
from loguru import logger

from app.core.config import settings

# ── Celery App ─────────────────────────────────────────────────────────────────
celery_app = Celery(
    "ai_support",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.celery_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600,  # results expire after 1 hour
)

# Re-export for app.tasks.celery_tasks import compatibility
celery = celery_app


# ── Tasks ──────────────────────────────────────────────────────────────────────

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60, name="tasks.summarize_ticket")
def summarize_ticket_task(self, ticket_id: str):
    """
    Background task: generate AI summary for a single ticket.
    Uses a synchronous DB session since Celery workers are sync.
    """
    import asyncio
    from sqlalchemy.orm import Session
    from app.core.database import AsyncSessionLocal
    from app.services.summarization_service import summarize_ticket
    import uuid

    async def _run():
        async with AsyncSessionLocal() as db:
            try:
                result = await summarize_ticket(db, uuid.UUID(ticket_id))
                await db.commit()
                logger.info(f"✅ Background summary done for ticket {ticket_id}")
                return result
            except Exception as exc:
                await db.rollback()
                logger.error(f"❌ Background summary failed for {ticket_id}: {exc}")
                raise self.retry(exc=exc)

    return asyncio.run(_run())


@celery_app.task(bind=True, name="tasks.bulk_summarize_tickets")
def bulk_summarize_tickets(self, ticket_ids: list[str]):
    """
    Background task: summarize multiple tickets in sequence.
    """
    results = []
    for ticket_id in ticket_ids:
        try:
            result = summarize_ticket_task.apply(args=[ticket_id])
            results.append({"ticket_id": ticket_id, "status": "success"})
        except Exception as e:
            results.append({"ticket_id": ticket_id, "status": "failed", "error": str(e)})
            logger.error(f"Bulk summarize failed for {ticket_id}: {e}")

    logger.info(f"Bulk summarize complete: {len(results)} tickets processed")
    return results


@celery_app.task(bind=True, name="tasks.auto_respond_ticket")
def auto_respond_ticket_task(self, ticket_id: str, tone: str = "professional"):
    """
    Background task: generate and store AI auto-response for a ticket.
    """
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.services.summarization_service import generate_auto_response
    import uuid

    async def _run():
        async with AsyncSessionLocal() as db:
            try:
                result = await generate_auto_response(db, uuid.UUID(ticket_id), tone=tone)
                await db.commit()
                logger.info(f"✅ Auto-response generated for ticket {ticket_id}")
                return result
            except Exception as exc:
                await db.rollback()
                raise self.retry(exc=exc)

    return asyncio.run(_run())
