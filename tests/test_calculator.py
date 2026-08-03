import sys
from datetime import datetime
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import calculate_trip_cost, TripData


def _trip(**overrides):
    defaults = dict(
        miles=100,
        mpg_city=20,
        mpg_highway=30,
        highway_percent=50,
        state_code="NC",
        drive_type="required",
        reason="",
        start_time=datetime(2026, 1, 1, 12, 0),
    )
    defaults.update(overrides)
    return TripData(**defaults)


def test_blended_mpg_50_50_split():
    # Harmonic mean of 20 and 30 city/highway MPG at a 50/50 split = 24.0
    trip = _trip(highway_percent=50, mpg_city=20, mpg_highway=30)
    result = calculate_trip_cost(trip, gas_price=3.00)
    assert result.blended_mpg == 24.0


def test_all_highway_uses_highway_mpg():
    trip = _trip(highway_percent=100, mpg_city=20, mpg_highway=30)
    result = calculate_trip_cost(trip, gas_price=3.00)
    assert result.blended_mpg == 30.0


def test_all_city_uses_city_mpg():
    trip = _trip(highway_percent=0, mpg_city=20, mpg_highway=30)
    result = calculate_trip_cost(trip, gas_price=3.00)
    assert result.blended_mpg == 20.0


def test_gallons_and_total_cost_are_consistent():
    trip = _trip(miles=120, highway_percent=50, mpg_city=20, mpg_highway=30)
    result = calculate_trip_cost(trip, gas_price=3.50)
    assert result.gallons_used == round(120 / 24.0, 2)
    assert result.total_cost == round(result.gallons_used * 3.50, 2)


def test_zero_miles_costs_nothing():
    trip = _trip(miles=0)
    result = calculate_trip_cost(trip, gas_price=4.00)
    assert result.gallons_used == 0
    assert result.total_cost == 0


def test_zero_mpg_city_raises_even_at_all_highway():
    """Documents current behavior: `city_ratio / mpg_city` is evaluated
    even when highway_percent=100 (city_ratio=0), so mpg_city=0 still
    raises ZeroDivisionError instead of being safely ignored. If this
    gets fixed in main.py, update this test to assert the new behavior."""
    trip = _trip(highway_percent=100, mpg_city=0, mpg_highway=30)
    with pytest.raises(ZeroDivisionError):
        calculate_trip_cost(trip, gas_price=3.00)
