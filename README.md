# CalculateTripCost - Driving Expense Tracker

A full-stack web application for tracking and analyzing driving expenses. Calculate trip costs, manage vehicles, securely save your trips, and visualize your driving habits over time.

![React](https://img.shields.io/badge/React-18.2-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17.0-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0-38B2AC)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)
![GitHub Actions](https://img.shields.io/github/actions/workflow/status/lil-cosine/CalculateTripCost/tests.yml?branch=main)
[![codecov](https://codecov.io/gh/lil-cosine/CalculateTripCost/branch/main/graph/badge.svg)](https://codecov.io/gh/lil-cosine/CalculateTripCost)

## Features

- **Trip Cost Calculator**: Real-time cost calculations based on current gas prices
- **Interactive Dashboard**: Visual charts showing spending patterns and driving statistics
- **Historical Analysis**: View and filter driving history with pagination
- **Data Management**: Edit or delete existing trip entries
- **Monthly Reports**: Track expenses and mileage over time
- **Multi-state Support**: Automatic gas price lookup for different states
- **User Accounts**: Register, log in, and securely save your driving history
- **Vehicle Management**: Save multiple vehicles with custom city and highway MPG ratings
- **Secure Authentication**: Password hashing and HTTP-only session cookies
- **Responsive Design**: Optimized interface for desktop and mobile devices
- **Docker Support**: One-command deployment with Docker Compose
- **Automated Testing**: Continuous integration with GitHub Actions

## Tech Stack

- **Frontend**: React 18, Tailwind CSS, Chart.js
- **Backend**: FastAPI, Python 3.11+, AsyncPG
- **Database**: PostgreSQL
- **Deployment**: Docker, Docker Compose, Nginx
- **Authentication**: bcrypt password hashing with secure session cookies
- **API Integration**: U.S. Energy Information Administration (EIA) API for real-time gas prices

---

# Installation & Setup

## Prerequisites

### Local Development

- Python 3.11 or higher
- Node.js 18 or higher
- PostgreSQL 17 or higher
- pip and npm package managers

### Docker

- Docker
- Docker Compose

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
```

### 6. Get an EIA API Key

- Register at https://www.eia.gov/opendata/register.php
- Add your API key to the `.env` file

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

| Service | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

---

# Usage

## User Accounts

Create an account to unlock additional functionality:

- Save trip history
- Manage multiple vehicles
- View personalized statistics
- Edit and delete saved trips

---

## Adding a New Trip

1. Navigate to the **Add Drive** section.

2. Enter trip details:

- Distance in miles
- City and highway MPG for your vehicle
- Percentage of highway driving
- Destination state
- Drive type (required/recreational)
- Optional reason for the trip

3. The system automatically:

- Fetches current gas prices for the selected state
- Calculates fuel consumption and trip cost
- Saves the trip to your account

---

## Managing Vehicles

Save frequently used vehicles with:

- Vehicle name
- City MPG
- Highway MPG

Switch between saved vehicles when calculating trips without re-entering fuel economy values.

---

## Viewing Statistics

- **Dashboard**: Overview of total spending, average costs, and efficiency metrics
- **Monthly Reports**: Track expenses and mileage trends over time
- **Drive History**: Browse and search all recorded trips with filtering options

---

## Managing Data

- Edit entries: Click any trip to modify details
- Delete entries: Remove incorrect or old trips
- Manage vehicles: Create, edit, or delete saved vehicles
- Export data: All data is stored in PostgreSQL for external analysis

---

# API Endpoints

## Authentication

- `POST /user/create/` - Register a new user
- `POST /login/` - Log in
- `POST /logout/` - Log out
- `GET /user/` - Retrieve the currently authenticated user

---

## Trip Management

- `POST /api/calculate/` - Calculate new trip cost
- `GET /api/history/` - Full trip history
- `GET /api/stats/` - Overall driving statistics
- `GET /api/available-months/` - List months with recorded data
- `GET /api/monthly-summary/` - Monthly aggregated data
- `GET /api/monthly-data/` - Monthly chart data
- `PUT /api/update-entry/{id}` - Modify an existing trip
- `DELETE /api/delete-entry/{id}` - Delete a trip
- `GET /api/health/` - Check backend and database health

---

## Vehicle Management

- `GET /vehicles/`
- `POST /vehicles/`
- `PUT /vehicles/{id}`
- `DELETE /vehicles/{id}`

---

# Data Structure

The application tracks:

- Trip distance and route information
- Vehicle fuel efficiency characteristics
- Real-time fuel prices by state
- Drive categorization (required vs recreational)
- Timestamps and calculated cost metrics
- User accounts
- Saved vehicle profiles
- User-specific driving history

---

# Project Structure

```
CalculateTripCost/
│
├── .github/                 # GitHub Actions workflows
├── CalculateTripCost/       # React frontend
│   ├── public/
│   ├── src/
│   └── package.json
│
├── main.py                  # FastAPI backend
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.frontend
├── nginx.conf
├── requirements.txt
└── README.md
```

---

# Troubleshooting

## Common Issues

### Database connection errors

- Verify PostgreSQL is running:

```bash
sudo systemctl status postgresql
```

- Check database credentials in the `.env` file.

### API key errors

- Ensure your EIA API key is valid and properly configured.

### CORS issues

- Confirm the backend is running on port 8000.
- Verify `ALLOWED_ORIGINS` in the `.env` file.
- Ensure the frontend is pointing to the correct backend URL.

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

- Gas prices are cached to reduce unnecessary API calls.
- Pagination improves performance with large driving histories.
- Charts only render visible data for faster loading.
- PostgreSQL indexing improves query performance for large datasets.

---

# Testing

Run frontend tests:

```bash
cd CalculateTripCost
npm test
```

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

- Check the API documentation at http://localhost:8000/docs
- Review browser developer tools for frontend errors
- Check backend logs for API or database issues
- Verify all required environment variables are configured

---

**Note:** Gas price data is provided by the U.S. Energy Information Administration (EIA). Please review their terms of service before deploying this application in production.
