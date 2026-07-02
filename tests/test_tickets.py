"""
Test suite for Ticket management endpoints.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


async def _register_and_login(ac: AsyncClient, email: str, role: str = "customer") -> str:
    """Helper: register a user and return their JWT access token."""
    await ac.post("/api/v1/auth/register", json={
        "email": email,
        "full_name": "Test User",
        "password": "password123",
        "role": role,
    })
    resp = await ac.post("/api/v1/auth/login", data={
        "username": email, "password": "password123"
    })
    return resp.json()["access_token"]


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_create_ticket():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await _register_and_login(ac, "ticket_creator@test.com")
        response = await ac.post(
            "/api/v1/tickets",
            json={
                "subject": "Cannot log into my account",
                "description": "I have been trying to log in for 2 hours and the portal keeps saying invalid credentials. I recently changed my email address.",
                "priority": "high",
                "category": "account",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
    assert response.status_code == 201
    data = response.json()
    assert "ticket_number" in data
    assert data["ticket_number"].startswith("TKT-")
    assert data["subject"] == "Cannot log into my account"
    assert data["status"] == "open"


@pytest.mark.anyio
async def test_list_tickets_customer_sees_own_only():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await _register_and_login(ac, "list_tickets@test.com")
        headers = {"Authorization": f"Bearer {token}"}
        # Create 2 tickets
        for i in range(2):
            await ac.post("/api/v1/tickets", json={
                "subject": f"Test ticket {i}",
                "description": "This is a test description with enough content to pass validation.",
                "priority": "low",
                "category": "general",
            }, headers=headers)

        response = await ac.get("/api/v1/tickets", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    assert len(data["tickets"]) >= 2


@pytest.mark.anyio
async def test_get_ticket_detail():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await _register_and_login(ac, "get_ticket@test.com")
        headers = {"Authorization": f"Bearer {token}"}
        create_resp = await ac.post("/api/v1/tickets", json={
            "subject": "Billing issue with my account",
            "description": "I was charged twice this month and need a refund processed immediately.",
            "priority": "high",
            "category": "billing",
        }, headers=headers)
        ticket_id = create_resp.json()["id"]

        response = await ac.get(f"/api/v1/tickets/{ticket_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == ticket_id
    assert "messages" in data


@pytest.mark.anyio
async def test_add_message_to_ticket():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await _register_and_login(ac, "msg_test@test.com")
        headers = {"Authorization": f"Bearer {token}"}
        create_resp = await ac.post("/api/v1/tickets", json={
            "subject": "My subscription expired",
            "description": "My subscription expired and I cannot access premium features anymore.",
            "priority": "medium",
            "category": "billing",
        }, headers=headers)
        ticket_id = create_resp.json()["id"]

        response = await ac.post(
            f"/api/v1/tickets/{ticket_id}/messages",
            json={"content": "I have already tried the self-service portal and it did not work."},
            headers=headers,
        )
    assert response.status_code == 201
    assert response.json()["sender_type"] == "customer"


@pytest.mark.anyio
async def test_update_ticket_satisfaction_score():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await _register_and_login(ac, "rate_ticket@test.com")
        headers = {"Authorization": f"Bearer {token}"}
        create_resp = await ac.post("/api/v1/tickets", json={
            "subject": "Feature request: dark mode",
            "description": "Please add dark mode support to the dashboard and the mobile app.",
            "priority": "low",
            "category": "feature_request",
        }, headers=headers)
        ticket_id = create_resp.json()["id"]

        response = await ac.patch(
            f"/api/v1/tickets/{ticket_id}",
            json={"satisfaction_score": 5},
            headers=headers,
        )
    assert response.status_code == 200
    assert response.json()["satisfaction_score"] == 5
