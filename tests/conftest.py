import sys
from pathlib import Path
from unittest.mock import AsyncMock

import pytest

# Let tests import `main` regardless of where pytest is invoked from.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main  # noqa: E402


class FakeConnection:
    """Stand-in for an asyncpg connection. Each method is an AsyncMock, so
    tests configure behavior with `.return_value` or `.side_effect`."""

    def __init__(self):
        self.fetchrow = AsyncMock(return_value=None)
        self.fetch = AsyncMock(return_value=[])
        self.execute = AsyncMock(return_value=None)
        self.fetchval = AsyncMock(return_value=None)


class FakeAcquireContext:
    def __init__(self, connection):
        self._connection = connection

    async def __aenter__(self):
        return self._connection

    async def __aexit__(self, *exc_info):
        return False


class FakePool:
    def __init__(self, connection):
        self._connection = connection

    def acquire(self):
        return FakeAcquireContext(self._connection)


@pytest.fixture
def fake_connection():
    """A fresh mocked connection for each test."""
    return FakeConnection()


@pytest.fixture
def fake_pool(fake_connection):
    return FakePool(fake_connection)


@pytest.fixture(autouse=True)
def patch_db(monkeypatch, fake_pool):
    """Every test automatically gets the DB layer mocked out, so nothing
    accidentally tries to hit a real Postgres instance."""

    async def _get_db_connection():
        return fake_pool

    monkeypatch.setattr(main, "get_db_connection", _get_db_connection)
    monkeypatch.setattr(main, "_pool", fake_pool)
    return fake_pool


@pytest.fixture
def client():
    """httpx AsyncClient wired directly into the FastAPI app. No lifespan
    events are triggered, so `init_db()` never runs / never touches a real DB."""
    from httpx import ASGITransport, AsyncClient

    transport = ASGITransport(app=main.app)
    return AsyncClient(transport=transport, base_url="http://test")
