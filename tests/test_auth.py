import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main  # noqa: E402


@pytest.mark.asyncio
async def test_register_rejects_short_password(
    client,
    fake_connection,
):
    fake_connection.fetchrow.return_value = None

    async with client as ac:
        resp = await ac.post(
            "/api/register/",
            json={
                "email": "new@example.com",
                "password": "short",
            },
        )

    assert resp.status_code == 400
    assert resp.json()["detail"] == "Password too short"


@pytest.mark.asyncio
async def test_register_rejects_duplicate_email(
    client,
    fake_connection,
):
    fake_connection.fetchrow.return_value = {
        "id": 1
    }

    async with client as ac:
        resp = await ac.post(
            "/api/register/",
            json={
                "email": "existing@example.com",
                "password": "longenough123",
            },
        )

    assert resp.status_code == 400
    assert resp.json()["detail"] == "Email already registered"


@pytest.mark.asyncio
async def test_register_success_sets_session_cookie(
    client,
    fake_connection,
):
    # First fetchrow:
    #   Check whether email already exists.
    #
    # Second fetchrow:
    #   INSERT ... RETURNING
    fake_connection.fetchrow.side_effect = [
        None,
        {
            "id": 1,
            "email": "new@example.com",
        },
    ]

    async with client as ac:
        resp = await ac.post(
            "/api/register/",
            json={
                "email": "new@example.com",
                "password": "longenough123",
            },
        )

    assert resp.status_code == 200

    assert resp.json() == {
        "id": 1,
        "email": "new@example.com",
    }

    assert "session_token" in resp.cookies


@pytest.mark.asyncio
async def test_login_rejects_wrong_password(
    client,
    fake_connection,
):
    from main import pwd_context

    fake_connection.fetchrow.return_value = {
        "id": 1,
        "email": "user@example.com",
        "password_hash": pwd_context.hash(
            "correct-password"
        ),
    }

    async with client as ac:
        resp = await ac.post(
            "/api/login/",
            json={
                "email": "user@example.com",
                "password": "wrong-password",
            },
        )

    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_rejects_unknown_email(
    client,
    fake_connection,
):
    fake_connection.fetchrow.return_value = None

    async with client as ac:
        resp = await ac.post(
            "/api/login/",
            json={
                "email": "nobody@example.com",
                "password": "whatever123",
            },
        )

    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_success_sets_session_cookie(
    client,
    fake_connection,
):
    from main import pwd_context

    fake_connection.fetchrow.return_value = {
        "id": 1,
        "email": "user@example.com",
        "password_hash": pwd_context.hash(
            "correct-password"
        ),
    }

    async with client as ac:
        resp = await ac.post(
            "/api/login/",
            json={
                "email": "user@example.com",
                "password": "correct-password",
            },
        )

    assert resp.status_code == 200
    assert "session_token" in resp.cookies


@pytest.mark.asyncio
async def test_login_rate_limit_returns_429(
    client,
    fake_connection,
    fake_redis,
):
    fake_redis.incr.return_value = 6
    fake_redis.ttl.return_value = 42

    async with client as ac:
        resp = await ac.post(
            "/api/login/",
            json={
                "email": "user@example.com",
                "password": "whatever123",
            },
        )

    assert resp.status_code == 429

    assert resp.json()["detail"] == (
        "Too many requests. Try again in 42 seconds."
    )

    # The rate limit should stop the request before
    # checking the database or password.
    fake_connection.fetchrow.assert_not_awaited()


@pytest.mark.asyncio
async def test_register_rate_limit_returns_429(
    client,
    fake_connection,
    fake_redis,
):
    fake_redis.incr.return_value = 6
    fake_redis.ttl.return_value = 37

    async with client as ac:
        resp = await ac.post(
            "/api/register/",
            json={
                "email": "new@example.com",
                "password": "longenough123",
            },
        )

    assert resp.status_code == 429

    assert resp.json()["detail"] == (
        "Too many requests. Try again in 37 seconds."
    )

    # The rate limit should happen before the DB lookup.
    fake_connection.fetchrow.assert_not_awaited()


@pytest.mark.asyncio
async def test_me_requires_authentication(client):
    async with client as ac:
        resp = await ac.get("/api/me/")

    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_modify_car_returns_404_for_another_users_car(
    client,
    fake_connection,
    fake_redis,
):
    # Redis session lookup:
    #   session:{token_hash} -> user ID 1
    #
    # Session version lookups:
    #   session_version:{token_hash} -> 0
    #   user_session_version:1 -> 0
    fake_redis.get.side_effect = [
        "1",
        "0",
        "0",
    ]

    # The car does not belong to this user (or does not exist).
    fake_connection.fetchrow.return_value = None

    async with client as ac:
        ac.cookies.set(
            "session_token",
            "sometoken",
        )

        resp = await ac.put(
            "/api/modify-car/999",
            json={
                "name": "Civic",
                "highway_mpg": 38,
                "city_mpg": 30,
            },
        )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "Car not found"

    # Authentication now requires three Redis lookups:
    # 1. session -> user ID
    # 2. session -> session version
    # 3. user -> current session version
    assert fake_redis.get.await_count == 3
