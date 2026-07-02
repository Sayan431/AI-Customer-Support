"""
Central v1 API router — registers all endpoint sub-routers.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, chatbot, tickets, summarization, analytics

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(chatbot.router)
api_router.include_router(tickets.router)
api_router.include_router(summarization.router)
api_router.include_router(analytics.router)
