# DriveCost - Driving Expense Tracker

A full-stack web application for tracking and analyzing driving expenses. Calculate trip costs, view statistics, and understand your driving spending patterns.

![React](https://img.shields.io/badge/React-18.2-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17.0-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0-38B2AC)

## Features

- **Trip Cost Calculator**: Real-time cost calculations based on current gas prices
- **Interactive Dashboard**: Visual charts showing spending patterns and driving statistics
- **Historical Analysis**: View and filter driving history with pagination
- **Data Management**: Edit or delete existing trip entries
- **Monthly Reports**: Track expenses and mileage over time
- **Multi-state Support**: Automatic gas price lookup for different states

## Tech Stack

- **Frontend**: React 18, Tailwind CSS, Chart.js
- **Backend**: FastAPI, Python 3.8+
- **Database**: PostgreSQL
- **API Integration**: U.S. Energy Information Administration (EIA) API for real-time gas prices

## Installation & Setup

### Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- PostgreSQL 12 or higher
- pip and npm package managers

### Backend Setup

1. **Clone and navigate to the project**:
```bash
git clone <repository-url>
cd drive-cost-tracker
```

2. **Set up Python virtual environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install Python dependencies**:
```bash
pip install fastapi uvicorn asyncpg requests python-dotenv
```

4. **Database setup**:
```bash
sudo -u postgres psql
CREATE DATABASE drive_cost_db;
CREATE USER drive_cost_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE drive_cost_db TO drive_cost_user;
```

5. **Enviroment Configuration**:
Modify the ```.env``` file in the project root directory:
```env
DATABASE_URL=postgresql://drive_cost_user:your_password@localhost/drive_cost_db
EIA_API_KEY=your_eia_api_key_here
```

6. **Get EIA API Key**:
* Register at [EIA Open Data](https://www.eia.gov/opendata/register.php)
* Add your API key to the ```.env``` file

7. **Start the backend server**:
```bash
uvicorn main:app --reload --port 8000
```

### Frontend Setup
1. **Navigate to frontend directory**:
```bash
cd drive-cost-calculator
```

2. **Install Node.js dependencies**:
```bash
npm install
```

3. **Start Development server**:
```bash
npm start
```

The application will be available at:

* Frontend: [http://localhost:3000](http://localhost:3000)
* Backend API: [http://localhost:8000](http://localhost:8000)
* API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

## Usage
### Adding a New Trop
1. Navigate to the "Add Drive" section
2. Enter trip details:
    * Distance in miles
    * City and highway MPG for your vehicle
    * Percentage of highway driving
    * Destination state
    * Drive type (required/recreational)
    * Optional reason for the trip
3. The system automatically:
    * Fetches current gas prices for the selected state
    * Calculates fuel consumption and trip cost
    * Saves the entry to the database

### Viewing Statistics
* Dashboard: Overview of total spending, average costs, and efficiency metrics
* Monthly Reports: Track expenses and mileage trends over time
* Drive History: Browse and search all recorded trips with filtering options

### Managing Data
* Edit entries: Click any trip to modify details
* Delete entries: Remove incorrect or old trips
* Export data: All data is stored in PostgreSQL for external analysis

### API Endpoints
* ```POST /api/calculate/``` - Calculate new trip cost
* ```GET /api/history/``` - Full trip history
* ```GET /api/stats/``` - Overall driving statistics
* ```GET /api/available-months/``` - Lists of months with data
* ```GET /api/monthly-summary/``` - Monthly aggregated data
* ```GET /api/monthly-data/``` - Monthly aggregated data for charts
* ```PUT /api/update-entry/{id}``` - Modify existing trip
* ```PUT /api/delete-entry/{id}``` - Remove trip entry
* ```GET /api/health/``` - Check database connection status

### Data Structure
The application tracks:
* Trip distance and route information
* Vehicle fuel efficiency characteristics
* Real-time fuel prices by state
* Drive categorization (required vs recreational)
* Timestamps and calculated cost metrics

## Troubleshooting
### Common Issues
* **Database connection errors**:
  * Verify PostgreSQL is running: sudo systemctl status postgresql
  * Check database credentials in .env file
* **API key errors**:
  * Ensure EIA API key is valid and properly set in environment variables
* **CORS issues**:
  * Confirm backend is running on port 8000
  * Check frontend is pointing to correct API URL

## Performance Tips
* The database automatically caches gas prices for 24 hours
* Pagination is implemented for large datasets
* Charts only load visible data for better performance

## Future Improvements
* More charts
* Improved Stats page layout
* Ability to download a monthly report PDF

## Contributing
1. Fork the repository
2. Create a feature branch: git checkout -b feature-name
3. Commit changes: git commit -am 'Add new feature'
4. Push to branch: git push origin feature-name
5. Submit a pull request

## Support
For support or questions:
* Check the API documentation at [http://localhost:8000/docs](http://localhost:8000/docs)
* Review the browser console for error messages
* Verify all environment variables are properly set

**Note**: Gas price data provided by the U.S. Energy Information Administration. Please check their terms of service for appropriate usage.
