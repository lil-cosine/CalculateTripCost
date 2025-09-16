import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

function Calculator(){

  const [formData, setFormData] = useState({
    miles: "",
    mpg_city: "",
    mpg_highway: "",
    highway_percent: 50,
    state_code: 'NC',
  })

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  const handleChange = (e)=>{
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try{
      const response = await axios.post(`${API_BASE_URL}/api/calculate/`, formData);
      setResult(response.data);
    } catch(err){
      setError(err.response?.data?.detail||'An unexpected error occurred');
    } finally{
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/history/?limit=10`);
      setHistory(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch history');
    }
  };

   return (
    <div className="calculator">
      <h1>Drive Cost Calculator</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Trip Distance (miles):</label>
          <input
            type="number"
            name="miles"
            value={formData.miles}
            onChange={handleChange}
            required
            step="0.1"
          />
        </div>
        <div>
          <label>City MPG:</label>
          <input
            type="number"
            name="mpg_city"
            value={formData.mpg_city}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Highway MPG:</label>
          <input
            type="number"
            name="mpg_highway"
            value={formData.mpg_highway}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Highway Driving (%):</label>
          <input
            type="range"
            name="highway_percent"
            min="0"
            max="100"
            value={formData.highway_percentage}
            onChange={handleChange}
          />
          <span>{formData.highway_percentage}%</span>
        </div>
        <div>
          <label>State:</label>
          <select name="state_code" value={formData.state_code} onChange={handleChange}>
            <option value="NC">North Carolina</option>
            {/* Add more states as you add them to your backend series_id_map */}
          </select>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Calculating...' : 'Calculate Cost'}
        </button>
      </form>

      {error && <div className="error">Error: {error}</div>}

      {result && (
        <div className="result">
          <h2>Trip Cost Breakdown</h2>
          <p><strong>Blended Fuel Efficiency:</strong> {result.blended_mpg} MPG</p>
          <p><strong>Gasoline Needed:</strong> {result.gallons_used} gallons</p>
          <p><strong>Current Avg Gas Price in {formData.state_code}:</strong> ${result.gas_price.toFixed(3)}/gallon</p>
          <h3>Total Estimated Cost: <span style={{color: 'green'}}>${result.total_cost.toFixed(2)}</span></h3>
        </div>
      )}
      
      <div>
        <button onClick={fetchHistory}>Show Last 10 Trips</button>
      </div>
      
      {history.length > 0 && (
        <div className="history">
          <h2>Last 10 Trips</h2>
          <table border="1" cellPadding="5">
            <thead>
              <tr>
                <th>Miles</th>
                <th>City MPG</th>
                <th>Highway MPG</th>
                <th>Highway %</th>
                <th>State</th>
                <th>Blended MPG</th>
                <th>Gallons Used</th>
                <th>Gas Price</th>
                <th>Total Cost</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((trip, idx) => (
                <tr key={idx}>
                  <td>{trip.miles}</td>
                  <td>{trip.mpg_city}</td>
                  <td>{trip.mpg_highway}</td>
                  <td>{trip.highway_percent}</td>
                  <td>{trip.state_code}</td>
                  <td>{trip.blended_mpg}</td>
                  <td>{trip.gallons_used}</td>
                  <td>{trip.gas_price}</td>
                  <td>{trip.total_cost}</td>
                  <td>{new Date(trip.calculated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

export default Calculator;

