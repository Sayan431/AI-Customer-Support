"""
Test suite for Authentication endpoints.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_register_user():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/auth/register", json={
            "email": "test@example.com",
            "full_name": "Test User",
            "password": "securepass123",
            "role": "customer",
        })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["role"] == "customer"
    assert "id" in data


@pytest.mark.anyio
async def test_register_duplicate_email():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {"email": "dup@example.com", "full_name": "Dup", "password": "pass12345"}
        await ac.post("/api/v1/auth/register", json=payload)
        response = await ac.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


@pytest.mark.anyio
async def test_login_success():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post("/api/v1/auth/register", json={
            "email": "login@example.com",
            "full_name": "Login User",
            "password": "mypassword99",
        })
        response = await ac.post("/api/v1/auth/login", data={
            "username": "login@example.com",
            "password": "mypassword99",
        })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.anyio
async def test_login_wrong_password():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/auth/login", data={
            "username": "nobody@example.com",
            "password": "wrongpass",
        })
    assert response.status_code == 401


@pytest.mark.anyio
async def test_get_me_authenticated():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post("/api/v1/auth/register", json={
            "email": "me@example.com",
            "full_name": "Me User",
            "password": "mepassword1",
        })
        login = await ac.post("/api/v1/auth/login", data={
            "username": "me@example.com",
            "password": "mepassword1",
        })
        token = login.json()["access_token"]
        response = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"


@pytest.mark.anyio
async def test_get_me_unauthenticated():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/auth/me")
    assert response.status_code == 401
