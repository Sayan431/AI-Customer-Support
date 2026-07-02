"""
Pydantic schemas for Analytics dashboard endpoints.
"""
from datetime import date
from pydantic import BaseModel


class TicketStats(BaseModel):
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    resolved_tickets: int
    closed_tickets: int
    avg_resolution_time_hours: float
    avg_satisfaction_score: float


class CategoryBreakdown(BaseModel):
    category: str
    count: int
    percentage: float


class DailyTicketVolume(BaseModel):
    date: date
    created: int
    resolved: int


class AgentPerformance(BaseModel):
    agent_id: str
    agent_name: str
    tickets_handled: int
    avg_resolution_time_hours: float
    avg_satisfaction_score: float


class AIUsageStats(BaseModel):
    total_summaries_generated: int
    total_auto_responses_generated: int
    total_chatbot_messages: int
    avg_chatbot_messages_per_session: float


class DashboardResponse(BaseModel):
    ticket_stats: TicketStats
    category_breakdown: list[CategoryBreakdown]
    daily_volume: list[DailyTicketVolume]
    agent_performance: list[AgentPerformance]
    ai_usage: AIUsageStats
