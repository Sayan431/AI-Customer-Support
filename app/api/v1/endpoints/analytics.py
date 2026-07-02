"""
Analytics dashboard endpoints — ticket stats, agent performance, AI usage.
"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from app.core.database import get_db
from app.api.deps import require_agent
from app.models.user import User
from app.models.ticket import Ticket, TicketStatus, TicketCategory
from app.models.conversation import ChatMessage
from app.schemas.analytics import (
    DashboardResponse, TicketStats, CategoryBreakdown,
    DailyTicketVolume, AgentPerformance, AIUsageStats,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    days: int = Query(30, ge=1, le=365, description="Look-back window in days"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_agent),
):
    """
    Return comprehensive analytics data for the support dashboard.
    Requires agent or admin role.
    """
    # ── Ticket Stats ──────────────────────────────────────────────────────────
    status_counts = await db.execute(
        select(Ticket.status, func.count(Ticket.id))
        .group_by(Ticket.status)
    )
    counts = {row[0]: row[1] for row in status_counts}

    total = sum(counts.values())

    # Average resolution time (hours)
    avg_resolution = await db.execute(
        select(
            func.avg(
                func.extract("epoch", Ticket.resolved_at - Ticket.created_at) / 3600
            )
        ).where(Ticket.resolved_at.isnot(None))
    )
    avg_res_hours = float(avg_resolution.scalar() or 0)

    # Average satisfaction score
    avg_satisfaction = await db.execute(
        select(func.avg(Ticket.satisfaction_score))
        .where(Ticket.satisfaction_score.isnot(None))
    )
    avg_sat = float(avg_satisfaction.scalar() or 0)

    ticket_stats = TicketStats(
        total_tickets=total,
        open_tickets=counts.get(TicketStatus.OPEN, 0),
        in_progress_tickets=counts.get(TicketStatus.IN_PROGRESS, 0),
        resolved_tickets=counts.get(TicketStatus.RESOLVED, 0),
        closed_tickets=counts.get(TicketStatus.CLOSED, 0),
        avg_resolution_time_hours=round(avg_res_hours, 2),
        avg_satisfaction_score=round(avg_sat, 2),
    )

    # ── Category Breakdown ────────────────────────────────────────────────────
    cat_result = await db.execute(
        select(Ticket.category, func.count(Ticket.id))
        .group_by(Ticket.category)
    )
    category_breakdown = [
        CategoryBreakdown(
            category=row[0].value,
            count=row[1],
            percentage=round((row[1] / total * 100) if total else 0, 1),
        )
        for row in cat_result
    ]

    # ── Daily Volume (last N days) ────────────────────────────────────────────
    start_date = date.today() - timedelta(days=days)
    daily_result = await db.execute(
        select(
            func.date(Ticket.created_at).label("day"),
            func.count(Ticket.id).label("created"),
            func.sum(
                case((Ticket.status == TicketStatus.RESOLVED, 1), else_=0)
            ).label("resolved"),
        )
        .where(func.date(Ticket.created_at) >= start_date)
        .group_by(func.date(Ticket.created_at))
        .order_by(func.date(Ticket.created_at))
    )
    daily_volume = [
        DailyTicketVolume(date=row[0], created=row[1], resolved=int(row[2] or 0))
        for row in daily_result
    ]

    # ── Agent Performance ─────────────────────────────────────────────────────
    agent_result = await db.execute(
        select(
            User.id,
            User.full_name,
            func.count(Ticket.id).label("tickets_handled"),
            func.avg(
                func.extract("epoch", Ticket.resolved_at - Ticket.created_at) / 3600
            ).label("avg_res_hours"),
            func.avg(Ticket.satisfaction_score).label("avg_satisfaction"),
        )
        .join(Ticket, Ticket.agent_id == User.id)
        .group_by(User.id, User.full_name)
        .order_by(func.count(Ticket.id).desc())
        .limit(10)
    )
    agent_performance = [
        AgentPerformance(
            agent_id=str(row[0]),
            agent_name=row[1],
            tickets_handled=row[2],
            avg_resolution_time_hours=round(float(row[3] or 0), 2),
            avg_satisfaction_score=round(float(row[4] or 0), 2),
        )
        for row in agent_result
    ]

    # ── AI Usage Stats ────────────────────────────────────────────────────────
    ai_summaries = await db.execute(
        select(func.count(Ticket.id)).where(Ticket.ai_summary.isnot(None))
    )
    ai_responses = await db.execute(
        select(func.count(Ticket.id)).where(Ticket.ai_suggested_response.isnot(None))
    )
    total_chat_msgs = await db.execute(select(func.count(ChatMessage.id)))
    total_convs_count = await db.execute(
        select(func.count(func.distinct(ChatMessage.conversation_id)))
    )

    total_msgs = total_chat_msgs.scalar() or 0
    total_convs = total_convs_count.scalar() or 1

    ai_usage = AIUsageStats(
        total_summaries_generated=ai_summaries.scalar() or 0,
        total_auto_responses_generated=ai_responses.scalar() or 0,
        total_chatbot_messages=total_msgs,
        avg_chatbot_messages_per_session=round(total_msgs / total_convs, 2),
    )

    return DashboardResponse(
        ticket_stats=ticket_stats,
        category_breakdown=category_breakdown,
        daily_volume=daily_volume,
        agent_performance=agent_performance,
        ai_usage=ai_usage,
    )
