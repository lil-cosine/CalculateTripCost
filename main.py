from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from dotenv import load_dotenv
from typing import Optional
import requests
import asyncpg
import os

load_dotenv()

class TripData(BaseModel):
    miles: float
    mpg_city: int
    mpg_highway: int
    highway_percent: int
    state_code: str
    drive_type: str = "required"
    reason: str = ""
    start_time: datetime

class CalculationResult(BaseModel):
    blended_mpg: float
    gallons_used: float
    total_cost: float
    gas_price: float

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")

EIA_API_KEY = os.getenv("EIA_API_KEY")

async def get_db_connection():
    return await asyncpg.create_pool(
        DATABASE_URL,
        min_size=1,
        max_size=5,
        max_inactive_connection_lifetime=300
    )

async def init_db():
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS calculations (
                id SERIAL PRIMARY KEY,
                miles FLOAT NOT NULL,
                mpg_city INTEGER NOT NULL,
                mpg_highway INTEGER NOT NULL,
                highway_percent INTEGER NOT NULL,
                state_code VARCHAR(2) NOT NULL,
                blended_mpg FLOAT NOT NULL,
                gallons_used FLOAT NOT NULL,
                total_cost FLOAT NOT NULL,
                gas_price FLOAT NOT NULL,
                calculated_at TIMESTAMP NOT NULL,
                drive_type VARCHAR(20) DEFAULT 'required',
                reason TEXT DEFAULT '',
                start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await connection.execute("""
            CREATE TABLE IF NOT EXISTS gas_prices (
                state VARCHAR(2) PRIMARY KEY,
                price FLOAT NOT NULL,
                last_updated TIMESTAMP NOT NULL
            )
        """)
    print("Database initialized")

@app.on_event("startup")
async def startup_event():
    await init_db()

async def get_gas_prices(state_code: str, connection) -> float:
    now = datetime.utcnow()

    cached_data = await connection.fetchrow(
        "SELECT price, last_updated FROM gas_prices WHERE state = $1", state_code
    )

    if cached_data:
        last_updated = cached_data['last_updated']
        if now - last_updated < timedelta(hours=24):
            return float(cached_data['price'])

    print(f"Fetching newest price data for {state_code}")

    series_id_map = {
        "NC": "EMM_EPMR_PTE_R10_DPG",
    }

    series_id = series_id_map.get(state_code)

    if not series_id:
        raise HTTPException(status_code=400, detail=f"Gas price data not available for state code: {state_code}")

    url = (
        f"https://api.eia.gov/v2/petroleum/pri/gnd/data/"
        f"?frequency=weekly"
        f"&data[0]=value"
        f"&facets[product][]=EPMR"
        f"&facets[series][]={series_id}"
        f"&sort[0][column]=period"
        f"&sort[0][direction]=desc"
        f"&api_key={EIA_API_KEY}"
        f"&offset=0&length=1"
    )

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        price_data = data.get("response", {}).get("data", [])

        if not price_data:
            raise HTTPException(status_code=404, detail="No recent gas price data was found")

        try:
            current_price = float(price_data[0]["value"])
        except (TypeError, ValueError, IndexError):
            raise HTTPException(status_code=500, detail="Invalid gas price data format")

        await connection.execute("""
            INSERT INTO gas_prices(state, price, last_updated)
            VALUES ($1, $2, $3)
            ON CONFLICT (state) DO UPDATE SET
                price = EXCLUDED.price,
                last_updated = EXCLUDED.last_updated
        """, state_code, current_price, now)

        return current_price

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch data from EIA API: {str(e)}")

def calculate_trip_cost(trip_data: TripData, gas_price: float):
    city_ratio = (100 - trip_data.highway_percent)/100
    highway_ratio = trip_data.highway_percent / 100

    if city_ratio + highway_ratio == 0:
        blended_mpg = 0
    else:
        blended_mpg = 1 / ((city_ratio / trip_data.mpg_city) + (highway_ratio / trip_data.mpg_highway))

    gallons_used = trip_data.miles / blended_mpg
    total_cost = gallons_used * gas_price

    return CalculationResult(
        blended_mpg = round(blended_mpg, 1),
        gallons_used = round(gallons_used, 2),
        total_cost = round(total_cost, 2),
        gas_price = gas_price
    )

@app.post("/api/calculate/")
async def calculate_drive_cost(trip_data: TripData):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            gas_price = await get_gas_prices(trip_data.state_code, connection)
            result = calculate_trip_cost(trip_data, gas_price)

            await connection.execute(
                """
                INSERT INTO calculations
                (miles, mpg_city, mpg_highway, highway_percent, state_code,
                 blended_mpg, gallons_used, total_cost, gas_price, calculated_at,
                 drive_type, reason, start_time)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                """,
                trip_data.miles, trip_data.mpg_city, trip_data.mpg_highway,
                trip_data.highway_percent, trip_data.state_code,
                result.blended_mpg, result.gallons_used, result.total_cost,
                result.gas_price, datetime.utcnow(),
                trip_data.drive_type, trip_data.reason, trip_data.start_time
            )

            return result
        except HTTPException as he:
            raise he
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"An internal server error occurred: {str(e)}")

@app.get("/api/history/")
async def get_calculation_history():
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            rows = await connection.fetch(
                "SELECT * FROM calculations ORDER BY calculated_at DESC"
            )

            history = []
            for row in rows:
                history.append(dict(row))

            return history
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")

@app.get("/api/stats/")
async def get_drive_stats():
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            stats = await connection.fetchrow("""
                SELECT
                    COUNT(id) as num_drives,
                    COALESCE(SUM(total_cost), 0) as sum_costs,
                    COALESCE(AVG(total_cost), 0) as avg_cost,
                    COALESCE(SUM(miles), 0) as total_miles,
                    COUNT(CASE WHEN drive_type = 'required' THEN 1 END) as required_drives_count,
                    COALESCE(AVG(blended_mpg), 0) as overall_efficiency,
                    COALESCE(AVG(gas_price), 0) as avg_gas_price,
                    SUM(CASE WHEN drive_type = 'required' THEN total_cost END) as required_drives_cost,
                    SUM(CASE WHEN drive_type = 'recreational' THEN total_cost END) as recreational_drives_cost
                FROM calculations
            """)
            return [dict(stats)] if stats else []
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")

@app.get("/api/available-months/")
async def get_available_months():
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            months = await connection.fetch("""
                SELECT DISTINCT DATE_TRUNC('month', start_time) as month
                FROM calculations
                ORDER BY month DESC
            """)
            return [row['month'].isoformat() for row in months]
        except Exception as e:
            raise HTTPException(500, f"Failed to fetch available months: {str(e)}")

@app.get("/api/monthly-summary/")
async def get_monthly_summary(month: Optional[str] = None):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            if month:
                target_month = datetime.fromisoformat(month.replace('Z', '+00:00'))
                prev_month = target_month - timedelta(days=30)

                query = """
                    WITH monthly_data AS (
                        SELECT
                            DATE_TRUNC('month', start_time) as month,
                            COUNT(*) as trip_count,
                            SUM(total_cost) as total_spent,
                            AVG(total_cost) as avg_cost,
                            SUM(miles) as total_miles,
                            COUNT(CASE WHEN drive_type = 'required' THEN 1 END) as required_drives_count,
                            SUM(CASE WHEN drive_type = 'required' THEN total_cost END) as required_drives_cost,
                            SUM(CASE WHEN drive_type = 'recreational' THEN total_cost END) as recreational_drives_cost
                        FROM calculations
                        WHERE DATE_TRUNC('month', start_time) IN ($1, $2)
                        GROUP BY month
                        ORDER BY month DESC
                    )
                    SELECT * FROM monthly_data
                """
                results = await connection.fetch(query, target_month, prev_month)
            else:
                query = """
                    SELECT
                        DATE_TRUNC('month', start_time) as month,
                        COUNT(*) as trip_count,
                        SUM(total_cost) as total_spent,
                        AVG(total_cost) as avg_cost,
                        SUM(miles) as total_miles
                    FROM calculations
                    GROUP BY month
                    ORDER BY month DESC
                """
                results = await connection.fetch(query)

            return [dict(row) for row in results]

        except Exception as e:
            raise HTTPException(500, f"Failed to fetch monthly summary: {str(e)}")

@app.get("/api/monthly-data/")
async def get_monthly_data():
    pool = await get_db_connection()
    try:
        async with pool.acquire() as connection:
            query = """
                WITH monthly_data AS (
                    SELECT
                        DATE_TRUNC('month', start_time) as month,
                        COUNT(*) as trip_count,
                        SUM(total_cost) as total_spent,
                        AVG(total_cost) as avg_cost,
                        SUM(miles) as total_miles
                    FROM calculations
                    GROUP BY month
                    ORDER BY month DESC
                )
                SELECT * FROM monthly_data
            """
            results = await connection.fetch(query)
            data = []

            for result in results:
                data.append(dict(result))

            return data

    except Exception as e:
        raise HTTPException(500, f"Failed to fetch monthly summary: {str(e)}")

@app.put("/api/update-entry/{entry_id}")
async def update_entry(entry_id: int, trip_data: TripData):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            query = """
            UPDATE calculations
            SET
                miles = $1,
                mpg_city = $2,
                mpg_highway = $3,
                highway_percent = $4,
                state_code = $5,
                drive_type = $6,
                reason = $7,
                start_time = $8,
                blended_mpg = $9,
                gallons_used = $10,
                total_cost = $11,
                gas_price = $12,
                calculated_at = CURRENT_TIMESTAMP  -- Update the timestamp too
            WHERE id = $13
            RETURNING *
            """

            gas_price = await get_gas_prices(trip_data.state_code, connection)
            result = calculate_trip_cost(trip_data, gas_price)

            updated_row = await connection.fetchrow(
                query,
                trip_data.miles,
                trip_data.mpg_city,
                trip_data.mpg_highway,
                trip_data.highway_percent,
                trip_data.state_code,
                trip_data.drive_type,
                trip_data.reason,
                trip_data.start_time,
                result.blended_mpg,
                result.gallons_used,
                result.total_cost,
                result.gas_price,
                entry_id
            )

            if not updated_row:
                raise HTTPException(status_code=404, detail="Entry not found")

            return dict(updated_row)

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Failed to update entry: {str(e)}")

@app.put("/api/delete-entry/{entry_id}")
async def delete_entry(entry_id: int):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            existing_entry = await connection.fetchrow(
                "SELECT id FROM calculations WHERE id = $1",
                entry_id
            )

            if not existing_entry:
                raise HTTPException(status_code=404, detail="Entry not found")

            await connection.execute(
                "DELETE FROM calculations WHERE id = $1",
                entry_id
            )

            return {"message": f"Entry {entry_id} deleted successfully"}

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Failed to delete entry: {str(e)}")

@app.get("/api/health/")
async def health_check():
    try:
        pool = await get_db_connection()
        async with pool.acquire() as connection:
            await connection.fetchval("SELECT 1")
            return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
