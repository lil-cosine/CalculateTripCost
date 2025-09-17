import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

export default function History() {
  const [allDrives, setAllDrives] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const itemsPerPage = 15;

  useEffect(() => {
    fetchAllDrives();
  }, []);

  const fetchAllDrives = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/history/`);
      setAllDrives(res.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch drive history");
    } finally {
      setLoading(false);
    }
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Sort drives based on configuration
  const sortedDrives = [...allDrives].sort((a, b) => {
    if (!sortConfig.key) return 0;

    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  // Calculate pagination values
  const totalPages = Math.ceil(sortedDrives.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentDrives = sortedDrives.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Render sort indicator
  const renderSortDirection = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? "↑" : "↓";
    }
    return null;
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);

    // Format time as HH:MM
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";

    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    const time = `${hours}:${minutes} ${ampm}`;

    // Format date as m/d/y
    const month = (date.getMonth() + 1).toString();
    const day = date.getDate().toString();
    const year = date.getFullYear().toString().slice(-2);
    const dateFormatted = `${month}/${day}/${year}`;

    return `${dateFormatted} at ${time}`;
  };

  return (
    <div className="p-4">
      {error && (
        <div className="error p-3 bg-red-100 text-red-700 rounded mb-4">
          Error: {error}
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={fetchAllDrives}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh All Drives"}
        </button>
        <span className="ml-4 text-gray-600">
          {allDrives.length} drives total
        </span>
      </div>

      {allDrives.length > 0 && (
        <div className="history">
          <h2 className="text-xl font-bold mb-4">
            Drive History (Page {currentPage} of {totalPages})
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th
                    className="border border-gray-300 p-2 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("start_time")}
                  >
                    Date {renderSortDirection("start_time")}
                  </th>
                  <th
                    className="border border-gray-300 p-2 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("miles")}
                  >
                    Miles {renderSortDirection("miles")}
                  </th>
                  <th
                    className="border border-gray-300 p-2 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("mpg_city")}
                  >
                    City MPG {renderSortDirection("mpg_city")}
                  </th>
                  <th
                    className="border border-gray-300 p-2 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("mpg_highway")}
                  >
                    Hwy MPG {renderSortDirection("mpg_highway")}
                  </th>
                  <th
                    className="border border-gray-300 p-2 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("highway_percent")}
                  >
                    Hwy % {renderSortDirection("highway_percent")}
                  </th>
                  <th
                    className="border border-gray-300 p-2 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("state_code")}
                  >
                    State {renderSortDirection("state_code")}
                  </th>
                  <th
                    className="border border-gray-300 p-2 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("blended_mpg")}
                  >
                    Blended MPG {renderSortDirection("blended_mpg")}
                  </th>
                  <th
                    className="border border-gray-300 p-2 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("gallons_used")}
                  >
                    Gallons {renderSortDirection("gallons_used")}
                  </th>
                  <th
                    className="border border-gray-300 p-2 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("gas_price")}
                  >
                    Gas Price {renderSortDirection("gas_price")}
                  </th>
                  <th
                    className="border border-gray-300 p-2 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("total_cost")}
                  >
                    Total Cost {renderSortDirection("total_cost")}
                  </th>
                  <th
                    className="border border-gray-300 p-2 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("drive_type")}
                  >
                    Type {renderSortDirection("drive_type")}
                  </th>
                  <th
                    className="border border-gray-300 p-2 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("reason")}
                  >
                    Reason {renderSortDirection("reason")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentDrives.map((trip, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="border border-gray-300 p-2">
                      {formatDateTime(trip.start_time)}
                    </td>
                    <td className="border border-gray-300 p-2">{trip.miles}</td>
                    <td className="border border-gray-300 p-2">
                      {trip.mpg_city}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {trip.mpg_highway}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {trip.highway_percent}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {trip.state_code}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {trip.blended_mpg}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {trip.gallons_used}
                    </td>
                    <td className="border border-gray-300 p-2">
                      ${trip.gas_price}
                    </td>
                    <td className="border border-gray-300 p-2 font-medium">
                      ${trip.total_cost}
                    </td>
                    <td className="border border-gray-300 p-2 capitalize">
                      {trip.drive_type === "required"
                        ? "Required"
                        : "Recreational"}
                    </td>
                    <td
                      className="border border-gray-300 p-2 max-w-xs truncate"
                      title={trip.reason}
                    >
                      {trip.reason || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6 space-x-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
              >
                &laquo;
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
              >
                &lsaquo;
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show pages around current page
                let pageNum;
                if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                if (pageNum > totalPages || pageNum < 1) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 border rounded ${
                      currentPage === pageNum
                        ? "bg-blue-500 text-white"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
              >
                &rsaquo;
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
              >
                &raquo;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
