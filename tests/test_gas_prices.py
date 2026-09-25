import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main


@pytest.mark.asyncio
async def test_returns_cached_price_when_cached(fake_redis):
    fake_redis.get.return_value = "3.259"

    price = await main.get_gas_prices("NC")

    assert price == 3.259

    fake_redis.get.assert_awaited_once_with("gas_price:NC")
    fake_redis.set.assert_not_awaited()


@pytest.mark.asyncio
async def test_fetches_from_eia_when_not_cached(monkeypatch, fake_redis):
    fake_redis.get.return_value = None

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {
        "response": {
            "data": [
                {"value": "3.459"}
            ]
        }
    }

    monkeypatch.setattr(
        main.requests,
        "get",
        MagicMock(return_value=mock_response)
    )

    price = await main.get_gas_prices("NC")

    assert price == 3.459

    fake_redis.get.assert_awaited_once_with("gas_price:NC")

    fake_redis.set.assert_awaited_once_with(
        "gas_price:NC",
        3.459,
        ex=60 * 60 * 24
    )


@pytest.mark.asyncio
async def test_unsupported_state_raises_400(fake_redis):
    fake_redis.get.return_value = None

    with pytest.raises(main.HTTPException) as exc_info:
        await main.get_gas_prices("ZZ")

    assert exc_info.value.status_code == 400

    fake_redis.get.assert_awaited_once_with("gas_price:ZZ")
    fake_redis.set.assert_not_awaited()


@pytest.mark.asyncio
async def test_eia_api_network_failure_raises_502(
    monkeypatch,
    fake_redis
):
    fake_redis.get.return_value = None

    def raise_connection_error(*args, **kwargs):
        raise main.requests.exceptions.RequestException(
            "network down"
        )

    monkeypatch.setattr(
        main.requests,
        "get",
        raise_connection_error
    )

    with pytest.raises(main.HTTPException) as exc_info:
        await main.get_gas_prices("NC")

    assert exc_info.value.status_code == 502

    fake_redis.set.assert_not_awaited()


@pytest.mark.asyncio
async def test_no_price_data_returned_raises_404(
    monkeypatch,
    fake_redis
):
    fake_redis.get.return_value = None

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {
        "response": {
            "data": []
        }
    }

    monkeypatch.setattr(
        main.requests,
        "get",
        MagicMock(return_value=mock_response)
    )

    with pytest.raises(main.HTTPException) as exc_info:
        await main.get_gas_prices("NC")

    assert exc_info.value.status_code == 404

    fake_redis.set.assert_not_awaited()
