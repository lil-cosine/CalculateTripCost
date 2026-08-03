import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main


@pytest.mark.asyncio
async def test_register_rejects_short_password(client, fake_connection):
    fake_connection.fetchrow.return_value = None  # no existing user

    async with client as ac:
        resp = await ac.post(
            "/api/register/",
            json={"email": "new@example.com", "password": "short"},
        )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Password too short"


@pytest.mark.asyncio
async def test_register_rejects_duplicate_email(client, fake_connection):
    fake_connection.fetchrow.return_value = {"id": 1}  # existing user found

    async with client as ac:
        resp = await ac.post(
            "/api/register/",
            json={"email": "existing@example.com", "password": "longenough123"},
        )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Email already registered"


@pytest.mark.asyncio
async def test_register_success_sets_session_cookie(client, fake_connection):
    # 1st fetchrow: no existing user. 2nd fetchrow: the INSERT ... RETURNING.
    fake_connection.fetchrow.side_effect = [
        None,
        {"id": 1, "email": "new@example.com"},
    ]

    async with client as ac:
        resp = await ac.post(
            "/api/register/",
            json={"email": "new@example.com", "password": "longenough123"},
        )
    assert resp.status_code == 200
    assert resp.json() == {"id": 1, "email": "new@example.com"}
    assert "session_token" in resp.cookies


@pytest.mark.asyncio
async def test_login_rejects_wrong_password(client, fake_connection):
    from main import pwd_context

    fake_connection.fetchrow.return_value = {
        "id": 1,
        "email": "user@example.com",
        "password_hash": pwd_context.hash("correct-password"),
    }

    async with client as ac:
        resp = await ac.post(
            "/api/login/",
            json={"email": "user@example.com", "password": "wrong-password"},
        )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_rejects_unknown_email(client, fake_connection):
    fake_connection.fetchrow.return_value = None

    async with client as ac:
        resp = await ac.post(
            "/api/login/",
            json={"email": "nobody@example.com", "password": "whatever123"},
        )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_success_sets_session_cookie(client, fake_connection):
    from main import pwd_context

    fake_connection.fetchrow.return_value = {
        "id": 1,
        "email": "user@example.com",
        "password_hash": pwd_context.hash("correct-password"),
    }

    async with client as ac:
        resp = await ac.post(
            "/api/login/",
            json={"email": "user@example.com", "password": "correct-password"},
        )
    assert resp.status_code == 200
    assert "session_token" in resp.cookies


@pytest.mark.asyncio
async def test_me_requires_authentication(client):
    async with client as ac:
        resp = await ac.get("/api/me/")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_modify_car_returns_404_for_another_users_car(client, fake_connection):
    # Simulate: valid session, but the car lookup scoped to user_id finds nothing
    # because it belongs to a different user.
    import hashlib
    from datetime import datetime, timedelta

    token = "sometoken"
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    fake_connection.fetchrow.side_effect = [
        {  # session lookup in get_current_user
            "id": 1,
            "email": "user@example.com",
            "expires_at": datetime.utcnow() + timedelta(days=1),
        },
        None,  # car ownership check finds nothing
    ]

    async with client as ac:
        ac.cookies.set("session_token", token)
        resp = await ac.put(
            "/api/modify-car/999",
            json={"name": "Civic", "highway_mpg": 38, "city_mpg": 30},
        )
    assert resp.status_code == 404
