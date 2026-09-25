from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from dotenv import load_dotenv
from typing import Optional
from passlib.context import CryptContext
import requests
import asyncpg
import os
import secrets
import hashlib
import redis.asyncio as redis

load_dotenv()

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

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

class UserRegister(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class CarData(BaseModel):
    name: str
    highway_mpg: float
    city_mpg: float

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

app = FastAPI()

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")
EIA_API_KEY = os.getenv("EIA_API_KEY")

# Set to True once you're serving over HTTPS in production
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
SESSION_COOKIE_NAME = "session_token"
SESSION_DURATION = timedelta(days=7)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

redis_client = redis.from_url(
    REDIS_URL,
    decode_responses=True
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_pool = None

async def get_db_connection():
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=1,
            max_size=5,
            max_inactive_connection_lifetime=300
        )
    return _pool

# ---------------------------------------------------------------------------
# DB init
# ---------------------------------------------------------------------------

async def init_db():
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await connection.execute("""
          Create Table IF NOT EXISTS cars (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name varchar(64) NOT NULL,
          highway_mpg FLOAT NOT NULL,
          city_mpg FLOAT NOT NULL
          )
          """)

        await connection.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token VARCHAR(64) PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP NOT NULL,
                expires_at TIMESTAMP NOT NULL
            )
        """)

        await connection.execute("""
            CREATE TABLE IF NOT EXISTS calculations (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

        # Safe to run repeatedly if the table already existed pre-auth
        await connection.execute("""
            ALTER TABLE calculations
            ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
        """)

    print("Database initialized")

@app.on_event("startup")
async def startup_event():
    await init_db()

# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def hash_token(token: str) -> str:
  return hashlib.sha256(token.encode()).hexdigest()

async def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hash_token(token)

    await redis_client.set(
        f"session:{token_hash}",
        user_id,
        ex=7*24*60*60
    )

    return token

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token_hash = hash_token(token)

    user_id = await redis_client.get(
        f"session:{token_hash}"
    )

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session"
        )

    return {"id": int(user_id)}

# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@app.post("/api/register/")
async def register(user_data: UserRegister, response: Response):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        existing = await connection.fetchrow(
            "SELECT id FROM users WHERE email = $1", user_data.email
        )
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        if len(user_data.password) < 8:
          raise HTTPException(status_code=400, detail="Password too short")

        password_hash = pwd_context.hash(user_data.password)

        new_user = await connection.fetchrow(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
            user_data.email, password_hash
        )

        token, expires_at = await create_session(new_user["id"], connection)

        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=token,
            httponly=True,
            secure=COOKIE_SECURE,
            samesite="lax",
            max_age=int(SESSION_DURATION.total_seconds()),
        )

        return {"id": new_user["id"], "email": new_user["email"]}

@app.post("/api/login/")
async def login(user_data: UserLogin, response: Response):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        user = await connection.fetchrow(
            "SELECT id, email, password_hash FROM users WHERE email = $1", user_data.email
        )

        if not user or not pwd_context.verify(user_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = await create_session(user["id"])

        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=token,
            httponly=True,
            secure=COOKIE_SECURE,
            samesite="lax",
            max_age=int(SESSION_DURATION.total_seconds()),
        )

        return {"id": user["id"], "email": user["email"]}

@app.post("/api/logout/")
async def logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        token_hash = hash_token(token)
        await redis_client.delete(
            f"session:{token_hash}"
        )

    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"message": "Logged out"}

@app.get("/api/me/")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.get("/api/my-cars/")
async def get_my_cars(current_user: dict = Depends(get_current_user)):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            rows = await connection.fetch(
                "SELECT * FROM cars WHERE user_id = $1 ORDER BY id",
                current_user["id"]
            )
            return [dict(row) for row in rows]
        except Exception as e:
            raise HTTPException(status_code=500, detail="An internal server error occurred")

@app.post("/api/add-car/")
async def add_car(car_data: CarData, current_user: dict = Depends(get_current_user)):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            new_car = await connection.fetchrow(
                """
                INSERT INTO cars (user_id, name, highway_mpg, city_mpg)
                VALUES ($1, $2, $3, $4)
                RETURNING *
                """,
                current_user["id"], car_data.name, car_data.highway_mpg, car_data.city_mpg
            )
            return dict(new_car)
        except Exception as e:
            raise HTTPException(status_code=500, detail="An internal server error occurred")

@app.put("/api/modify-car/{car_id}")
async def modify_car(car_id: int, car_data: CarData, current_user: dict = Depends(get_current_user)):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            existing_car = await connection.fetchrow(
                "SELECT id FROM cars WHERE id = $1 AND user_id = $2",
                car_id, current_user["id"]
            )
            if not existing_car:
                raise HTTPException(status_code=404, detail="Car not found")

            updated_car = await connection.fetchrow(
                """
                UPDATE cars
                SET name = $1, highway_mpg = $2, city_mpg = $3
                WHERE id = $4 AND user_id = $5
                RETURNING *
                """,
                car_data.name, car_data.highway_mpg, car_data.city_mpg,
                car_id, current_user["id"]
            )
            return dict(updated_car)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail="An internal server error occurred")

@app.put("/api/remove-car/{car_id}")
async def remove_car(car_id: int, current_user: dict = Depends(get_current_user)):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            existing_car = await connection.fetchrow(
                "SELECT id FROM cars WHERE id = $1 AND user_id = $2",
                car_id, current_user["id"]
            )
            if not existing_car:
                raise HTTPException(status_code=404, detail="Car not found")

            await connection.execute(
                "DELETE FROM cars WHERE id = $1 AND user_id = $2",
                car_id, current_user["id"]
            )
            return {"message": f"Car {car_id} deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail="An internal server error occurred")

@app.post("/api/update-password/")
async def update_password(password_data: PasswordUpdate, current_user: dict = Depends(get_current_user)):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            user = await connection.fetchrow(
                "SELECT password_hash FROM users WHERE id = $1", current_user["id"]
            )
            if not user or not pwd_context.verify(password_data.current_password, user["password_hash"]):
                raise HTTPException(status_code=401, detail="Current password is incorrect")

            if len(password_data.new_password) < 8:
                raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

            new_hash = pwd_context.hash(password_data.new_password)
            await connection.execute(
                "UPDATE users SET password_hash = $1 WHERE id = $2",
                new_hash, current_user["id"]
            )

            await connection.execute(
              "DELETE FROM sessions WHERE user_id = $1",
              current_user["id"]
            )
            return {"message": "Password updated successfully"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail="An internal server error occurred")

# ---------------------------------------------------------------------------
# Gas price / calculation logic (unchanged)
# ---------------------------------------------------------------------------

async def get_gas_prices(state_code: str) -> float:
    cache_key = f"gas_price:{state_code}"

    cache_price = await redis_client.get(cache_key)

    if cache_price is not None:
        return float(cache_price)

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

        await redis_client.set(
            cache_key,
            current_price,
            ex= 60 * 60 * 24
        )

        return current_price

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch data from EIA API")

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

# ---------------------------------------------------------------------------
# Protected app endpoints (all now scoped to current_user)
# ---------------------------------------------------------------------------

@app.post("/api/calculate/")
async def calculate_drive_cost(trip_data: TripData, current_user: dict = Depends(get_current_user)):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            gas_price = await get_gas_prices(trip_data.state_code)
            result = calculate_trip_cost(trip_data, gas_price)

            await connection.execute(
                """
                INSERT INTO calculations
                (user_id, miles, mpg_city, mpg_highway, highway_percent, state_code,
                 blended_mpg, gallons_used, total_cost, gas_price, calculated_at,
                 drive_type, reason, start_time)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                """,
                current_user["id"], trip_data.miles, trip_data.mpg_city, trip_data.mpg_highway,
                trip_data.highway_percent, trip_data.state_code,
                result.blended_mpg, result.gallons_used, result.total_cost,
                result.gas_price, datetime.utcnow(),
                trip_data.drive_type, trip_data.reason, trip_data.start_time
            )

            return result
        except HTTPException as he:
            raise he
        except Exception as e:
            raise HTTPException(status_code=500, detail="An internal server error occurred")

@app.get("/api/history/")
async def get_calculation_history(current_user: dict = Depends(get_current_user)):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            rows = await connection.fetch(
                "SELECT * FROM calculations WHERE user_id = $1 ORDER BY calculated_at DESC",
                current_user["id"]
            )
            return [dict(row) for row in rows]
        except Exception as e:
            raise HTTPException(status_code=500, detail="An internal server error occurred")

@app.get("/api/stats/")
async def get_drive_stats(current_user: dict = Depends(get_current_user)):
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
                WHERE user_id = $1
            """, current_user["id"])
            return [dict(stats)] if stats else []
        except Exception as e:
            raise HTTPException(status_code=500, detail="An internal server error occurred")

@app.get("/api/available-months/")
async def get_available_months(current_user: dict = Depends(get_current_user)):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            months = await connection.fetch("""
                SELECT DISTINCT DATE_TRUNC('month', start_time) as month
                FROM calculations
                WHERE user_id = $1
                ORDER BY month DESC
            """, current_user["id"])
            return [row['month'].isoformat() for row in months]
        except Exception as e:
            raise HTTPException(500, "An internal server error occurred")

@app.get("/api/monthly-summary/")
async def get_monthly_summary(month: Optional[str] = None, current_user: dict = Depends(get_current_user)):
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
                        WHERE user_id = $3 AND DATE_TRUNC('month', start_time) IN ($1, $2)
                        GROUP BY month
                        ORDER BY month DESC
                    )
                    SELECT * FROM monthly_data
                """
                results = await connection.fetch(query, target_month, prev_month, current_user["id"])
            else:
                query = """
                    SELECT
                        DATE_TRUNC('month', start_time) as month,
                        COUNT(*) as trip_count,
                        SUM(total_cost) as total_spent,
                        AVG(total_cost) as avg_cost,
                        SUM(miles) as total_miles
                    FROM calculations
                    WHERE user_id = $1
                    GROUP BY month
                    ORDER BY month DESC
                """
                results = await connection.fetch(query, current_user["id"])

            return [dict(row) for row in results]

        except Exception as e:
            raise HTTPException(500, "An internal server error occurred")

@app.get("/api/stats-range/")
async def get_stats_range(
    start_date: str,
    end_date: str,
    current_user: dict = Depends(get_current_user),
):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            try:
                start = datetime.fromisoformat(start_date)
                # Make end_date inclusive of the whole day
                end = datetime.fromisoformat(end_date) + timedelta(days=1)
            except ValueError:
                raise HTTPException(status_code=400, detail="Dates must be in YYYY-MM-DD format")

            if end <= start:
                raise HTTPException(status_code=400, detail="end_date must be on or after start_date")

            query = """
                SELECT
                    COUNT(*) as trip_count,
                    COALESCE(SUM(total_cost), 0) as total_spent,
                    COALESCE(AVG(total_cost), 0) as avg_cost,
                    COALESCE(SUM(miles), 0) as total_miles,
                    COUNT(CASE WHEN drive_type = 'required' THEN 1 END) as required_drives_count,
                    COALESCE(SUM(CASE WHEN drive_type = 'required' THEN total_cost END), 0) as required_drives_cost,
                    COALESCE(SUM(CASE WHEN drive_type = 'recreational' THEN total_cost END), 0) as recreational_drives_cost
                FROM calculations
                WHERE user_id = $1 AND start_time >= $2 AND start_time < $3
            """
            row = await connection.fetchrow(query, current_user["id"], start, end)
            result = dict(row)
            result["start_date"] = start_date
            result["end_date"] = end_date
            return result
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail="An internal server error occurred")

@app.get("/api/monthly-data/")
async def get_monthly_data(current_user: dict = Depends(get_current_user)):
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
                    WHERE user_id = $1
                    GROUP BY month
                    ORDER BY month DESC
                )
                SELECT * FROM monthly_data
            """
            results = await connection.fetch(query, current_user["id"])
            return [dict(result) for result in results]

    except Exception as e:
        raise HTTPException(500, "An internal server error occurred")

@app.put("/api/update-entry/{entry_id}")
async def update_entry(entry_id: int, trip_data: TripData, current_user: dict = Depends(get_current_user)):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            existing_entry = await connection.fetchrow(
                "SELECT id FROM calculations WHERE id = $1 AND user_id = $2",
                entry_id, current_user["id"]
            )
            if not existing_entry:
                raise HTTPException(status_code=404, detail="Entry not found")

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
                calculated_at = CURRENT_TIMESTAMP
            WHERE id = $13 AND user_id = $14
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
                entry_id,
                current_user["id"]
            )

            if not updated_row:
                raise HTTPException(status_code=404, detail="Entry not found")

            return dict(updated_row)

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, "An internal server error occurred")

@app.put("/api/delete-entry/{entry_id}")
async def delete_entry(entry_id: int, current_user: dict = Depends(get_current_user)):
    pool = await get_db_connection()
    async with pool.acquire() as connection:
        try:
            existing_entry = await connection.fetchrow(
                "SELECT id FROM calculations WHERE id = $1 AND user_id = $2",
                entry_id, current_user["id"]
            )

            if not existing_entry:
                raise HTTPException(status_code=404, detail="Entry not found")

            await connection.execute(
                "DELETE FROM calculations WHERE id = $1 AND user_id = $2",
                entry_id, current_user["id"]
            )

            return {"message": f"Entry {entry_id} deleted successfully"}

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, "An internal server error occurred")

@app.get("/api/health/")
async def health_check():
    try:
        pool = await get_db_connection()
        async with pool.acquire() as connection:
            await connection.fetchval("SELECT 1")
            return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="An internal server error occurred")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
