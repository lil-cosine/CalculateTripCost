import { useState, useEffect, useRef } from "react";
import Pie from "./Charts/Pie.js";
import Bar from "./Charts/Bar.js";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const API_BASE_URL = "http://localhost:8000";

export default function Stats() {
  const [driveStats, setDriveStats] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const pieChartRef = useRef(null);
  const milesChartRef = useRef(null);
  const costChartRef = useRef(null);
  const avgCostChartRef = useRef(null);

  useEffect(() => {
    fetchDriveStats();
    fetchAvailableMonths();
    fetchMonthlyData();
  }, []);

  useEffect(() => {
    if (availableMonths.length > 0 && selectedMonth === null) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  useEffect(() => {
    if (selectedMonth !== null) {
      fetchMonthlyStats(selectedMonth);
    }
  }, [selectedMonth]);

  const fetchDriveStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/stats/`, { withCredentials: true });
      setDriveStats(res.data[0] || {});
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch drive stats");
      setDriveStats(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMonths = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/available-months/`, { withCredentials: true });
      setAvailableMonths(res.data);
    } catch (err) {
      console.error("Failed to fetch available months:", err);
    }
  };

  const fetchMonthlyStats = async (month) => {
    try {
      const params = month ? { month } : {};
      const res = await axios.get(`${API_BASE_URL}/api/monthly-summary/`, {
        params,
        withCredentials: true,

      });
      setMonthlyStats(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch monthly stats");
    }
  };

  const fetchMonthlyData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/monthly-data/`, { withCredentials: true });
      setMonthlyData(res.data);
    } catch (err) {
      console.error("Failed to fetch monthly data:", err);
    }
  };

  const formatCurrency = (amount) => `$${parseFloat(amount || 0).toFixed(2)}`;
  const formatNumber = (num) => parseInt(num || 0).toLocaleString();

  const formatMonth = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const formatMonthShort = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const currentMonth = availableMonths.length > 0 ? availableMonths[0] : null;

  const handleDownloadAll = async () => {
    const chartRefs = [
      pieChartRef,
      milesChartRef,
      costChartRef,
      avgCostChartRef,
    ].filter((ref) => ref.current);

    if (chartRefs.length === 0) return;

    setDownloadingAll(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const titleAreaHeight = 40;

      // --- Page 1: Overall Statistics summary table ---
      doc.setFontSize(20);
      doc.setTextColor(31, 41, 55); // gray-800
      doc.text("Driving Statistics Summary", pageWidth / 2, margin + 10, {
        align: "center",
      });

      if (driveStats && driveStats.num_drives > 0) {
        autoTable(doc, {
          startY: margin + 30,
          margin: { left: margin, right: margin },
          head: [["Metric", "Value"]],
          body: [
            ["Total Drives", formatNumber(driveStats.num_drives)],
            ["Total Cost", formatCurrency(driveStats.sum_costs)],
            ["Avg Cost / Drive", formatCurrency(driveStats.avg_cost)],
            ["Total Miles", `${formatNumber(driveStats.total_miles)} miles`],
            ["Required Drives", formatNumber(driveStats.required_drives_count)],
            [
              "Recreational Drives",
              formatNumber(
                driveStats.num_drives - driveStats.required_drives_count
              ),
            ],
            ["Required Drive Cost", formatCurrency(driveStats.required_drives_cost)],
            [
              "Recreational Drive Cost",
              formatCurrency(driveStats.recreational_drives_cost),
            ],
          ],
          theme: "grid",
          headStyles: { fillColor: [59, 130, 246] }, // blue-500
          styles: { fontSize: 11, cellPadding: 8 },
        });
      }

      // --- Following pages: one chart per page ---
      chartRefs.forEach((ref) => {
        const image = ref.current.getImage();
        if (!image) return;

        doc.addPage();

        const { dataUrl, width, height } = image;
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2 - titleAreaHeight;
        const scale = Math.min(maxWidth / width, maxHeight / height);
        const drawWidth = width * scale;
        const drawHeight = height * scale;
        const x = (pageWidth - drawWidth) / 2;
        const y = margin + titleAreaHeight;

        doc.setFontSize(16);
        doc.setTextColor(31, 41, 55); // gray-800
        doc.text(ref.current.title || "Chart", pageWidth / 2, margin + 16, {
          align: "center",
        });

        doc.addImage(dataUrl, "PNG", x, y, drawWidth, drawHeight);
      });

      doc.save("driving-report.pdf");
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {error && (
        <div className="error p-3 bg-red-100 text-red-700 rounded mb-6 border border-red-200">
          Error: {error}
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Driving Statistics</h1>
        <div className="flex items-center gap-3">
          {driveStats && driveStats.num_drives > 0 && (
            <button
              onClick={handleDownloadAll}
              disabled={downloadingAll}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 py-2 px-4 rounded disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {downloadingAll ? "Building PDF..." : "Download Report"}
            </button>
          )}
          <button
            onClick={() => {
              fetchDriveStats();
              fetchAvailableMonths();
              fetchMonthlyData();
            }}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50 transition-colors"
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </div>

      {driveStats && driveStats.num_drives !== undefined && driveStats.num_drives === 0 && (
        <h2 className="text-xl justify-center align-middle font-semibold mb-4 text-gray-800">
          No Drives Recorded
        </h2>
      )}

      {/* Overall Statistics Table */}
      {driveStats && driveStats.num_drives !== undefined && driveStats.num_drives > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Overall Statistics
          </h2>
          <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Total Drives
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Total Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Avg Cost/Drive
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Total Miles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Required Drives
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Recreational Drives
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Required Drive Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Recreational Drive Cost
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatNumber(driveStats.num_drives)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(driveStats.sum_costs)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(driveStats.avg_cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(driveStats.total_miles)} miles
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(driveStats.required_drives_count)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(
                      driveStats.num_drives - driveStats.required_drives_count,
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(driveStats.required_drives_cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(driveStats.recreational_drives_cost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Statistics Table */}
      {driveStats && driveStats.num_drives !== undefined && driveStats.num_drives > 0 && (
        <div className="pb-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Monthly Statistics
            </h2>
            <div className="flex items-center space-x-2">
              <label
                htmlFor="month-select"
                className="text-sm font-medium text-gray-700"
              >
                Filter by Month:
              </label>
              <select
                id="month-select"
                value={selectedMonth || ""}
                onChange={(e) => setSelectedMonth(e.target.value || null)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {formatMonth(month)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {monthlyStats.length > 0 ? (
            <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Trips
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Total Spent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Avg Cost/Trip
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Total Miles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Required Drives
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Recreational Drives
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Required Drive Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Recreational Drive Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {monthlyStats.map((month, index) => {
                    const isCurrentMonth = month.month === currentMonth;
                    return (
                      <tr
                        key={index}
                        className={
                          isCurrentMonth
                            ? "bg-blue-50 hover:bg-blue-100"
                            : "hover:bg-gray-50"
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            {formatMonth(month.month)}
                            {isCurrentMonth && (
                              <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(month.trip_count)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(month.total_spent)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(month.avg_cost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(month.total_miles)} miles
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(month.required_drives_count)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(
                            month.trip_count - month.required_drives_count,
                          )}{" "}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(month.required_drives_cost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(month.recreational_drives_cost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
              <div className="text-gray-400 mb-2">📊</div>
              <p className="text-gray-500">No monthly data available yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Add some drives to see statistics
              </p>
            </div>
          )}
        </div>
      )}
      {/* Pie Chart Section */}
      {driveStats && driveStats.num_drives !== undefined ? (
        driveStats.num_drives > 0 && (
          <div className="mb-8">
            <Pie
              ref={pieChartRef}
              title="Drive Type Distribution"
              data={{
                labels: ["Required", "Recreational"],
                datasets: [
                  {
                    data: [
                      driveStats.required_drives_count,
                      driveStats.num_drives - driveStats.required_drives_count,
                    ],
                    backgroundColor: ["#4ECDC4", "#FF6B6B"],
                    borderColor: "#ffffff",
                    borderWidth: 2,
                  },
                ],
              }}
            />
          </div>
        )
      ) : (
        <div className="bg-gray-100 rounded-lg p-8 text-center mb-8">
          <p className="text-gray-500">Loading chart data...</p>
        </div>
      )}

      {/* Monthly Bar Charts Section */}
      {driveStats && driveStats.num_drives !== undefined && driveStats.num_drives > 0 && (
        <div className="mb-8">
          {/* Miles Per Month Chart */}
          {monthlyData.length > 0 ? (
            <Bar
              ref={milesChartRef}
              title="Miles Per Month"
              data={{
                labels: monthlyData.map((item) => formatMonthShort(item.month)),
                datasets: [
                  {
                    label: "Miles Driven",
                    data: monthlyData.map((item) => item.total_miles),
                    backgroundColor: "#4ECDC4",
                    borderColor: "#45B7D1",
                    borderWidth: 1,
                  },
                ],
              }}
              type="bar"
            />
          ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <p className="text-gray-500">Loading mileage data...</p>
            </div>
          )}

          {/* Total Cost Per Month Chart */}
          {monthlyData.length > 0 ? (
            <Bar
              ref={costChartRef}
              title="Total Cost Per Month"
              data={{
                labels: monthlyData.map((item) => formatMonthShort(item.month)),
                datasets: [
                  {
                    label: "Total Cost",
                    data: monthlyData.map((item) => item.total_spent),
                    backgroundColor: "#FF6B6B",
                    borderColor: "#E53E3E",
                    borderWidth: 1,
                  },
                ],
              }}
              type="bar"
            />
          ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <p className="text-gray-500">Loading cost data...</p>
            </div>
          )}

          {/* Average Cost Per Month Chart */}
          {monthlyData.length > 0 ? (
            <Bar
              ref={avgCostChartRef}
              title="Average Cost Per Month"
              data={{
                labels: monthlyData.map((item) => formatMonthShort(item.month)),
                datasets: [
                  {
                    label: "Avg Cost",
                    data: monthlyData.map((item) => item.avg_cost),
                    backgroundColor: "#9B59B6",
                    borderColor: "#8E44AD",
                    borderWidth: 1,
                  },
                ],
              }}
              type="bar"
            />
          ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <p className="text-gray-500">Loading average cost data...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
