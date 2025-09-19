import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

export default function Modify() {
  const [allDrives, setAllDrives] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleEdit = (trip) => {
    setEditingId(trip.id);
    setEditData({ ...trip });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSave = async (id) => {
    setSaving(true);
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/update-entry/${id}`,
        editData,
      );

      setAllDrives((prev) =>
        prev.map((item) => (item.id === id ? response.data : item)),
      );

      setEditingId(null);
      setEditData({});
      setError("");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) {
      return;
    }

    setDeleting(id);
    try {
      await axios.put(`${API_BASE_URL}/api/delete-entry/${id}`);

      setAllDrives((prev) => prev.filter((item) => item.id !== id));
      setError("");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete entry");
    } finally {
      setDeleting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const totalPages = Math.ceil(allDrives.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentDrives = allDrives.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const time = `${hours}:${minutes} ${ampm}`;
    const month = (date.getMonth() + 1).toString();
    const day = date.getDate().toString();
    const year = date.getFullYear().toString().slice(-2);
    const dateFormatted = `${month}/${day}/${year}`;
    return `${dateFormatted} at ${time}`;
  };

  const formatNumber = (num) => parseFloat(num).toFixed(1);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Modify Drive Entries
          </h1>
          <p className="text-gray-600 mt-1">
            {allDrives.length} total drives • Page {currentPage} of {totalPages}
          </p>
        </div>
        <button
          onClick={fetchAllDrives}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center space-x-2"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
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
              <span>Loading...</span>
            </>
          ) : (
            <>
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Refresh Data</span>
            </>
          )}
        </button>
      </div>

      {allDrives.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { key: "start_time", label: "Date", width: "w-48" },
                    { key: "miles", label: "Miles", width: "w-20" },
                    { key: "mpg_city", label: "City MPG", width: "w-24" },
                    { key: "mpg_highway", label: "Hwy MPG", width: "w-24" },
                    { key: "highway_percent", label: "Hwy %", width: "w-20" },
                    { key: "state_code", label: "State", width: "w-16" },
                    { key: "drive_type", label: "Type", width: "w-28" },
                    { key: "reason", label: "Reason", width: "w-48" },
                    { key: "actions", label: "Actions", width: "w-32" },
                  ].map(({ key, label, width }) => (
                    <th
                      key={key}
                      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${width}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentDrives.map((trip) => (
                  <tr
                    key={trip.id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    {/* Date */}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {formatDateTime(trip.start_time).split(" at ")[0]}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {formatDateTime(trip.start_time).split(" at ")[1]}
                        </span>
                      </div>
                    </td>

                    {/* Editable Fields */}
                    <td className="px-4 py-3">
                      {editingId === trip.id ? (
                        <input
                          type="number"
                          value={editData.miles || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "miles",
                              parseFloat(e.target.value),
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        <span className="text-sm text-gray-900 text-right block">
                          {formatNumber(trip.miles)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {editingId === trip.id ? (
                        <input
                          type="number"
                          value={editData.mpg_city || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "mpg_city",
                              parseInt(e.target.value),
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        <span className="text-sm text-gray-900 text-right block">
                          {trip.mpg_city}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {editingId === trip.id ? (
                        <input
                          type="number"
                          value={editData.mpg_highway || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "mpg_highway",
                              parseInt(e.target.value),
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        <span className="text-sm text-gray-900 text-right block">
                          {trip.mpg_highway}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {editingId === trip.id ? (
                        <input
                          type="number"
                          value={editData.highway_percent || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "highway_percent",
                              parseInt(e.target.value),
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          max="100"
                        />
                      ) : (
                        <span className="text-sm text-gray-900 text-right block">
                          {trip.highway_percent}%
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {editingId === trip.id ? (
                        <input
                          type="text"
                          value={editData.state_code || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "state_code",
                              e.target.value.toUpperCase(),
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm uppercase"
                          maxLength="2"
                        />
                      ) : (
                        <span className="text-sm text-gray-900 text-right block">
                          {trip.state_code}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {editingId === trip.id ? (
                        <select
                          value={editData.drive_type || "required"}
                          onChange={(e) =>
                            handleInputChange("drive_type", e.target.value)
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="required">Required</option>
                          <option value="recreational">Recreational</option>
                        </select>
                      ) : (
                        <span className="text-sm text-gray-900 text-right block capitalize">
                          {trip.drive_type}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {editingId === trip.id ? (
                        <input
                          type="text"
                          value={editData.reason || ""}
                          onChange={(e) =>
                            handleInputChange("reason", e.target.value)
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        <div
                          className="truncate text-sm text-gray-900"
                          title={trip.reason}
                        >
                          {trip.reason || "-"}
                        </div>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-4 py-3">
                      {editingId === trip.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSave(trip.id)}
                            disabled={saving}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(trip)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(trip.id)}
                            disabled={deleting === trip.id}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                          >
                            {deleting === trip.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(startIndex + itemsPerPage, allDrives.length)}
                  </span>{" "}
                  of <span className="font-medium">{allDrives.length}</span>{" "}
                  drives
                </div>

                <div className="flex items-center space-x-2">
                  <nav
                    className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">First</span>
                      &laquo;
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      &lsaquo;
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                          className={`relative inline-flex items-center px-3 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      &rsaquo;
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Last</span>
                      &raquo;
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
