import { useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

const cars = [{ id: 1, name: "Ford Focus", mpg_city: 26, mpg_highway: 38 }];

const driveTypes = [
  { id: "required", name: "Required (Work/Errands)" },
  { id: "recreational", name: "Recreational" },
];

function Calculator() {
  const [formData, setFormData] = useState({
    miles: "",
    car_id: "1",
    highway_percent: 50,
    state_code: "NC",
    drive_type: "required",
    reason: "",
    start_time: new Date().toISOString().slice(0, 16),
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCar =
    cars.find((car) => car.id.toString() === formData.car_id) || cars[0];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const submitData = {
      ...formData,
      mpg_city: selectedCar.mpg_city,
      mpg_highway: selectedCar.mpg_highway,
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/calculate/`,
        submitData,
      );
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">
        Drive Cost Calculator
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trip Distance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trip Distance (miles)
            </label>
            <input
              type="number"
              name="miles"
              value={formData.miles}
              onChange={handleChange}
              required
              step="0.1"
              min="0.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter distance"
            />
          </div>

          {/* Car Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle
            </label>
            <select
              name="car_id"
              value={formData.car_id}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.name} ({car.mpg_city} city / {car.mpg_highway} hwy)
                </option>
              ))}
            </select>
          </div>

          {/* Highway Percentage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Highway Driving: {formData.highway_percent}%
            </label>
            <input
              type="range"
              name="highway_percent"
              min="0"
              max="100"
              value={formData.highway_percent}
              onChange={handleChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>All City</span>
              <span>All Highway</span>
            </div>
          </div>

          {/* State Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <select
              name="state_code"
              value={formData.state_code}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="NC">North Carolina</option>
              <option value="SC">South Carolina</option>
              <option value="VA">Virginia</option>
              <option value="GA">Georgia</option>
              <option value="TN">Tennessee</option>
            </select>
          </div>

          {/* Drive Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Drive Type
            </label>
            <select
              name="drive_type"
              value={formData.drive_type}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {driveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Drive Start Time
            </label>
            <input
              type="datetime-local"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Reason for Drive */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Drive
          </label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Optional: Describe the purpose of this drive"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Calculating...
            </span>
          ) : (
            "Calculate Trip Cost"
          )}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="mt-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h2 className="text-2xl font-semibold text-blue-800 mb-4">
            Trip Cost Breakdown
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-4 rounded-md shadow-sm">
              <p className="text-sm text-gray-600">Vehicle</p>
              <p className="font-medium">{selectedCar.name}</p>
            </div>
            <div className="bg-white p-4 rounded-md shadow-sm">
              <p className="text-sm text-gray-600">Fuel Efficiency</p>
              <p className="font-medium">{result.blended_mpg} MPG (blended)</p>
            </div>
            <div className="bg-white p-4 rounded-md shadow-sm">
              <p className="text-sm text-gray-600">Gasoline Needed</p>
              <p className="font-medium">{result.gallons_used} gallons</p>
            </div>
            <div className="bg-white p-4 rounded-md shadow-sm">
              <p className="text-sm text-gray-600">
                Gas Price in {formData.state_code}
              </p>
              <p className="font-medium">
                ${result.gas_price.toFixed(3)}/gallon
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-green-100 border border-green-200 rounded-md">
            <h3 className="text-lg font-semibold text-green-800 text-center">
              Total Estimated Cost:{" "}
              <span className="text-2xl">${result.total_cost.toFixed(2)}</span>
            </h3>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calculator;
