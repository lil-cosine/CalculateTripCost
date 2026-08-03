import sys
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main


@pytest.mark.asyncio
async def test_returns_cached_price_when_fresh(fake_connection):
    fake_connection.fetchrow.return_value = {
        "price": 3.259,
        "last_updated": datetime.utcnow() - timedelta(hours=1),
    }
    price = await main.get_gas_prices("NC", fake_connection)
    assert price == 3.259
    fake_connection.execute.assert_not_called()


@pytest.mark.asyncio
async def test_refetches_when_cache_is_stale(monkeypatch, fake_connection):
    fake_connection.fetchrow.return_value = {
        "price": 3.00,
        "last_updated": datetime.utcnow() - timedelta(hours=25),
    }

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {"response": {"data": [{"value": "3.459"}]}}
    monkeypatch.setattr(main.requests, "get", MagicMock(return_value=mock_response))

    price = await main.get_gas_prices("NC", fake_connection)

    assert price == 3.459
    fake_connection.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_unsupported_state_raises_400(fake_connection):
    fake_connection.fetchrow.return_value = None
    with pytest.raises(main.HTTPException) as exc_info:
        await main.get_gas_prices("ZZ", fake_connection)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_eia_api_network_failure_raises_502(monkeypatch, fake_connection):
    fake_connection.fetchrow.return_value = None

    def raise_connection_error(*args, **kwargs):
        raise main.requests.exceptions.RequestException("network down")

    monkeypatch.setattr(main.requests, "get", raise_connection_error)

    with pytest.raises(main.HTTPException) as exc_info:
        await main.get_gas_prices("NC", fake_connection)
    assert exc_info.value.status_code == 502


@pytest.mark.asyncio
async def test_no_price_data_returned_raises_404(monkeypatch, fake_connection):
    fake_connection.fetchrow.return_value = None

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {"response": {"data": []}}
    monkeypatch.setattr(main.requests, "get", MagicMock(return_value=mock_response))

    with pytest.raises(main.HTTPException) as exc_info:
        await main.get_gas_prices("NC", fake_connection)
    assert exc_info.value.status_code == 404
