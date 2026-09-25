# CalculateTripCost - Driving Expense Tracker

A full-stack web application for tracking and analyzing driving expenses. Calculate trip costs, manage vehicles, securely save your trips, and visualize your driving habits over time.

![React](https://img.shields.io/badge/React-18.2-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17.0-blue)
![Redis](https://img.shields.io/badge/Redis-%23DD0031.svg?logo=redis&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0-38B2AC)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)
![GitHub Actions](https://img.shields.io/github/actions/workflow/status/lil-cosine/CalculateTripCost/tests.yml?branch=main)
[![codecov](https://codecov.io/gh/lil-cosine/CalculateTripCost/branch/main/graph/badge.svg)](https://codecov.io/gh/lil-cosine/CalculateTripCost)

## Features

* **Trip Cost Calculator**: Real-time cost calculations based on current gas prices
* **Interactive Dashboard**: Visual charts showing spending patterns and driving statistics
* **Historical Analysis**: View and filter driving history with pagination
* **Data Management**: Edit or delete existing trip entries
* **Monthly Reports**: Track expenses and mileage over time
* **Multi-state Support**: Automatic gas price lookup for different states
* **User Accounts**: Register, log in, and securely save your driving history
* **Vehicle Management**: Save multiple vehicles with custom city and highway MPG ratings
* **Secure Authentication**: Password hashing with HTTP-only session cookies and Redis-backed sessions
* **Rate Limiting**: Redis-backed request rate limiting for authentication and calculation endpoints
* **Gas Price Caching**: Redis caching of EIA gas-price data with a 24-hour expiration
* **Responsive Design**: Optimized interface for desktop and mobile devices
* **Docker Support**: One-command deployment with Docker Compose
* **Automated Testing**: Backend and frontend tests with continuous integration through GitHub Actions

## Tech Stack

* **Frontend**: React 18, Tailwind CSS, Chart.js
* **Backend**: FastAPI, Python 3.11+, AsyncPG
* **Database**: PostgreSQL
* **Caching & Sessions**: Redis
* **Deployment**: Docker, Docker Compose, Nginx
* **Authentication**: bcrypt password hashing with HTTP-only session cookies and Redis-backed sessions
* **Rate Limiting**: Redis-based request limiting
* **API Integration**: U.S. Energy Information Administration (EIA) API for real-time gas prices
* **Testing**: Pytest, React Testing Library, GitHub Actions

---

# Installation & Setup

## Prerequisites

### Local Development

* Python 3.11 or higher
* Node.js 18 or higher
* PostgreSQL 17 or higher
* Redis
* pip and npm package managers

### Docker

* Docker
* Docker Compose

---

## Backend Setup

### 1. Clone and navigate to the project

```bash
git clone https://github.com/lil-cosine/CalculateTripCost.git
cd CalculateTripCost
```

### 2. Set up Python virtual environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Python dependencies

```bash
pip install fastapi uvicorn asyncpg requests python-dotenv bcrypt
```

or

```bash
pip install -r requirements.txt
```

### 4. Database setup

```sql
sudo -u postgres psql

CREATE DATABASE drive_cost_db;
CREATE USER drive_cost_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE drive_cost_db TO drive_cost_user;
```

### 5. Environment Configuration

Create a `.env` file in the project root directory.

```env
DATABASE_URL=postgresql://drive_cost_user:your_password@localhost/drive_cost_db

POSTGRES_PASSWORD=your_password

EIA_API_KEY=your_eia_api_key_here

ALLOWED_ORIGINS=http://localhost:3000

COOKIE_SECURE=false

SESSION_EXPIRE_DAYS=7

REDIS_URL=redis://localhost:6379
```

When using Docker Compose, the backend connects to the Redis service using:

```env
REDIS_URL=redis://redis:6379
```

### 6. Get an EIA API Key

* Register at https://www.eia.gov/opendata/register.php
* Add your API key to the `.env` file

### 7. Start the backend

```bash
uvicorn main:app --reload --port 8000
```

---

## Frontend Setup

### 1. Navigate to the frontend directory

```bash
cd CalculateTripCost
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm start
```

---

## Docker Setup

Clone the repository:

```bash
git clone https://github.com/lil-cosine/CalculateTripCost.git
cd CalculateTripCost
```

Create your `.env` file as described above.

Build and run the application:

```bash
docker compose up --build
```

The application will be available at:

| Service           | URL                        |
| ----------------- | -------------------------- |
| Frontend          | http://localhost:3000      |
| Backend           | http://localhost:8000      |
| API Documentation | http://localhost:8000/docs |
| PostgreSQL        | localhost:5432             |
| Redis             | Internal Docker service    |

Redis is intentionally not exposed as a public host port. The backend communicates with Redis through the Docker Compose network.

To verify that Redis is running:

```bash
docker compose exec redis redis-cli ping
```

A successful installation should return:

```text
PONG
```

---

# Usage

## User Accounts

Create an account to unlock additional functionality:

* Save trip history
* Manage multiple vehicles
* View personalized statistics
* Edit and delete saved trips

Authentication uses HTTP-only cookies containing randomly generated session tokens. Session data is stored in Redis with a 7-day expiration.

---

## Adding a New Trip

1. Navigate to the **Add Drive** section.

2. Enter trip details:

* Distance in miles
* City and highway MPG for your vehicle
* Percentage of highway driving
* Destination state
* Drive type (required/recreational)
* Optional reason for the trip

3. The system automatically:

* Fetches current gas prices for the selected state
* Uses cached gas-price data when available
* Calculates fuel consumption and trip cost
* Saves the trip to your account

Gas-price responses from the EIA API are cached in Redis for 24 hours to reduce unnecessary external API requests.

---

## Managing Vehicles

Save frequently used vehicles with:

* Vehicle name
* City MPG
* Highway MPG

Switch between saved vehicles when calculating trips without re-entering fuel economy values.

---

## Viewing Statistics

* **Dashboard**: Overview of total spending, average costs, and efficiency metrics
* **Monthly Reports**: Track expenses and mileage trends over time
* **Drive History**: Browse and search all recorded trips with filtering options

---

## Managing Data

* **Edit entries**: Click any trip to modify details
* **Delete entries**: Remove incorrect or old trips
* **Manage vehicles**: Create, edit, or delete saved vehicles
* **Export data**: All persistent application data is stored in PostgreSQL for external analysis

---

# Redis

Redis is used as an application-level supporting service rather than the primary data store.

### Gas Price Caching

EIA gas-price requests are cached using keys based on the state code:

```text
gas_price:NC
```

Cached prices expire after 24 hours.

This reduces repeated requests to the EIA API while still periodically refreshing the price data.

### Sessions

Authenticated sessions are stored in Redis using hashed session tokens:

```text
session:<token_hash>
```

The raw session token is stored only in the HTTP-only browser cookie.

Sessions expire automatically after 7 days.

### Rate Limiting

Redis is also used to track request counts for rate limiting.

Current limits include:

| Endpoint         | Limit                   |
| ---------------- | ----------------------- |
| Registration     | 5 requests/minute/IP    |
| Login            | 5 requests/minute/email |
| Login            | 5 requests/minute/IP    |
| Trip calculation | 10 requests/minute/IP   |
| Trip calculation | 30 requests/minute/user |
| Password update  | 5 requests/minute/user  |

When a limit is exceeded, the API returns HTTP `429 Too Many Requests` and reports the remaining Redis window.

---

# API Endpoints

## Authentication

* `POST /api/register/` - Register a new user
* `POST /api/login/` - Log in
* `POST /api/logout/` - Log out
* `GET /api/me/` - Retrieve the currently authenticated user
* `POST /api/update-password/` - Update the authenticated user's password

Authentication endpoints use HTTP-only session cookies and Redis-backed sessions.

---

## Trip Management

* `POST /api/calculate/` - Calculate and save a new trip cost
* `GET /api/history/` - Retrieve trip history
* `GET /api/stats/` - Retrieve overall driving statistics
* `GET /api/available-months/` - List months with recorded data
* `GET /api/monthly-summary/` - Retrieve monthly aggregated data
* `GET /api/monthly-data/` - Retrieve monthly chart data
* `PUT /api/update-entry/{id}` - Modify an existing trip
* `DELETE /api/delete-entry/{id}` - Delete a trip
* `GET /api/health/` - Check backend and database health

---

## Vehicle Management

* `GET /api/my-cars/` - Retrieve the authenticated user's vehicles
* `POST /api/add-car/` - Add a vehicle
* `PUT /api/modify-car/{id}` - Modify a vehicle
* `DELETE /api/remove-car/{id}` - Delete a vehicle

---

# Data Structure

The application tracks:

* Trip distance and route information
* Vehicle fuel efficiency characteristics
* Real-time fuel prices by state
* Cached fuel-price data
* Drive categorization (required vs recreational)
* Timestamps and calculated cost metrics
* User accounts
* Saved vehicle profiles
* User-specific driving history

PostgreSQL is the persistent source of truth for users, vehicles, trips, and calculated data. Redis is used for temporary application state such as sessions, cached API responses, and rate-limit counters.

---

# Project Structure

```text
CalculateTripCost/
│
├── .github/
│   └── workflows/              # GitHub Actions workflows
│
├── CalculateTripCost/          # React frontend
│   ├── public/
│   ├── src/
│   └── package.json
│
├── tests/                      # Backend pytest tests
│   ├── conftest.py
│   ├── test_auth.py
│   └── test_gas_prices.py
│
├── main.py                     # FastAPI backend
├── docker-compose.yml          # Application services
├── Dockerfile                  # Backend container
├── Dockerfile.frontend         # Frontend container
├── nginx.conf                  # Frontend/reverse proxy configuration
├── requirements.txt            # Production Python dependencies
├── requirements-test.txt       # Testing dependencies
├── pytest.ini                  # Pytest configuration
└── README.md
```

---

# Application Architecture

```text
                     ┌──────────────────┐
                     │     Browser      │
                     │  React Frontend  │
                     └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │      Nginx       │
                     │   Frontend/API   │
                     └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │     FastAPI      │
                     │     Backend      │
                     └──────┬─────┬─────┘
                            │     │
                 ┌──────────┘     └──────────┐
                 ▼                           ▼
        ┌─────────────────┐         ┌─────────────────┐
        │   PostgreSQL    │         │      Redis      │
        │ Persistent Data │         │ Cache / Session │
        │                 │         │ Rate Limiting   │
        └─────────────────┘         └─────────────────┘
                                            │
                                            │ Cache miss
                                            ▼
                                  ┌─────────────────────┐
                                  │      EIA API        │
                                  │   Gas Price Data    │
                                  └─────────────────────┘
```

PostgreSQL remains the persistent database, while Redis handles short-lived application state and cached external API data.

---

# Troubleshooting

## Common Issues

### Database connection errors

Verify PostgreSQL is running:

```bash
sudo systemctl status postgresql
```

Check database credentials in the `.env` file.

### Redis connection errors

For Docker deployments, verify that the Redis container is running:

```bash
docker compose ps
```

Test Redis directly:

```bash
docker compose exec redis redis-cli ping
```

The expected response is:

```text
PONG
```

Check the backend's `REDIS_URL` configuration.

### API key errors

Ensure your EIA API key is valid and properly configured.

### CORS issues

* Confirm the backend is running on port 8000.
* Verify `ALLOWED_ORIGINS` in the `.env` file.
* Ensure the frontend is pointing to the correct backend URL.

### Docker issues

If containers fail to start:

```bash
docker compose logs
```

To rebuild containers:

```bash
docker compose down
docker compose up --build
```

---

# Performance Tips

* **Redis caching** reduces repeated EIA API requests by caching gas prices for 24 hours.
* **Connection pooling** reduces the overhead of repeatedly creating PostgreSQL connections.
* **Pagination** improves performance with large driving histories.
* **Charts** only render visible data for faster loading.
* **PostgreSQL indexing** improves query performance for large datasets.
* **Redis rate limiting** prevents excessive requests from individual clients or accounts.

---

# Testing

## Frontend Tests

Run frontend tests:

```bash
cd CalculateTripCost
npm test
```

## Backend Tests

Backend tests use pytest and mock external services so tests do not require a running PostgreSQL or Redis instance.

Run the backend test suite from the repository root:

```bash
pytest
```

The backend tests currently cover areas including:

* User registration
* Duplicate account handling
* Password validation
* Login authentication
* Session-cookie creation
* Authentication requirements
* Rate-limit responses
* Vehicle authorization
* EIA gas-price caching
* EIA API failures
* Unsupported state handling
* Missing gas-price data

The Redis client and PostgreSQL connection pool are replaced with test doubles during the test suite, allowing tests to run without external services.

GitHub Actions automatically execute tests on every push and pull request.

---

# Contributing

1. Fork the repository.

2. Create a feature branch:

```bash
git checkout -b feature-name
```

3. Commit your changes:

```bash
git commit -am "Add new feature"
```

4. Push to your branch:

```bash
git push origin feature-name
```

5. Open a Pull Request.

---

# Support

For support or questions:

* Check the API documentation at http://localhost:8000/docs
* Review browser developer tools for frontend errors
* Check backend logs for API or database issues
* Verify all required environment variables are configured
* Check Redis with `docker compose exec redis redis-cli ping`
* Check Docker service status with `docker compose ps`

---

**Note:** Gas price data is provided by the U.S. Energy Information Administration (EIA). Please review their terms of service before deploying this application in production.
