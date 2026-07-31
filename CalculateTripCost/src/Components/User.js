import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

export default function User() {
  // Cars state
  const [cars, setCars] = useState([]);
  const [carsLoading, setCarsLoading] = useState(false);
  const [carsError, setCarsError] = useState("");

  // Add-car form state
  const [newCar, setNewCar] = useState({ name: "", highway_mpg: "", city_mpg: "" });
  const [addingCar, setAddingCar] = useState(false);

  // Edit-car state
  const [editingCarId, setEditingCarId] = useState(null);
  const [editCarForm, setEditCarForm] = useState({ name: "", highway_mpg: "", city_mpg: "" });
  const [savingCarId, setSavingCarId] = useState(null);
  const [deletingCarId, setDeletingCarId] = useState(null);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = async () => {
    setCarsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/my-cars/`, { withCredentials: true });
      setCars(res.data);
      setCarsError("");
    } catch (err) {
      setCarsError(err.response?.data?.detail || "Failed to fetch vehicles");
    } finally {
      setCarsLoading(false);
    }
  };

  const handleAddCar = async (e) => {
    e.preventDefault();
    setCarsError("");
    setAddingCar(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/add-car/`,
        {
          name: newCar.name,
          highway_mpg: parseFloat(newCar.highway_mpg),
          city_mpg: parseFloat(newCar.city_mpg),
        },
        { withCredentials: true }
      );
      setNewCar({ name: "", highway_mpg: "", city_mpg: "" });
      await fetchCars();
    } catch (err) {
      setCarsError(err.response?.data?.detail || "Failed to add vehicle");
    } finally {
      setAddingCar(false);
    }
  };

  const startEditingCar = (car) => {
    setEditingCarId(car.id);
    setEditCarForm({
      name: car.name,
      highway_mpg: car.highway_mpg,
      city_mpg: car.city_mpg,
    });
  };

  const cancelEditingCar = () => {
    setEditingCarId(null);
    setEditCarForm({ name: "", highway_mpg: "", city_mpg: "" });
  };

  const handleSaveCar = async (carId) => {
    setCarsError("");
    setSavingCarId(carId);
    try {
      await axios.put(
        `${API_BASE_URL}/api/modify-car/${carId}`,
        {
          name: editCarForm.name,
          highway_mpg: parseFloat(editCarForm.highway_mpg),
          city_mpg: parseFloat(editCarForm.city_mpg),
        },
        { withCredentials: true }
      );
      setEditingCarId(null);
      await fetchCars();
    } catch (err) {
      setCarsError(err.response?.data?.detail || "Failed to update vehicle");
    } finally {
      setSavingCarId(null);
    }
  };

  const handleDeleteCar = async (carId) => {
    setCarsError("");
    setDeletingCarId(carId);
    try {
      await axios.put(`${API_BASE_URL}/api/remove-car/${carId}`, {}, { withCredentials: true });
      await fetchCars();
    } catch (err) {
      setCarsError(err.response?.data?.detail || "Failed to delete vehicle");
    } finally {
      setDeletingCarId(null);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    setChangingPassword(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/update-password/`,
        {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        },
        { withCredentials: true }
      );
      setPasswordSuccess("Password updated successfully");
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setPasswordError(err.response?.data?.detail || "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Vehicles Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Manage Vehicles</h1>
          <button
            onClick={fetchCars}
            disabled={carsLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            {carsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {carsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            <strong>Error:</strong> {carsError}
          </div>
        )}

        {/* Existing cars table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Highway MPG
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    City MPG
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cars.length === 0 && !carsLoading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic text-sm">
                      No vehicles added yet
                    </td>
                  </tr>
                )}
                {cars.map((car) => {
                  const isEditing = editingCarId === car.id;
                  return (
                    <tr key={car.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editCarForm.name}
                            onChange={(e) => setEditCarForm({ ...editCarForm, name: e.target.value })}
                            className={inputClass}
                          />
                        ) : (
                          <span className="font-medium">{car.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={editCarForm.highway_mpg}
                            onChange={(e) =>
                              setEditCarForm({ ...editCarForm, highway_mpg: e.target.value })
                            }
                            className={inputClass}
                          />
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            {car.highway_mpg}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={editCarForm.city_mpg}
                            onChange={(e) =>
                              setEditCarForm({ ...editCarForm, city_mpg: e.target.value })
                            }
                            className={inputClass}
                          />
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {car.city_mpg}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleSaveCar(car.id)}
                              disabled={savingCarId === car.id}
                              className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors duration-200 disabled:opacity-50"
                            >
                              {savingCarId === car.id ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={cancelEditingCar}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-lg transition-colors duration-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEditingCar(car)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-lg transition-colors duration-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCar(car.id)}
                              disabled={deletingCarId === car.id}
                              className="bg-red-50 hover:bg-red-100 text-red-700 text-xs px-3 py-1.5 rounded-lg transition-colors duration-200 disabled:opacity-50"
                            >
                              {deletingCarId === car.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add car form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Vehicle</h2>
          <form onSubmit={handleAddCar} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Name
              </label>
              <input
                type="text"
                placeholder="e.g. 2019 Honda Civic"
                value={newCar.name}
                onChange={(e) => setNewCar({ ...newCar, name: e.target.value })}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Highway MPG
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="36"
                value={newCar.highway_mpg}
                onChange={(e) => setNewCar({ ...newCar, highway_mpg: e.target.value })}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                City MPG
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="28"
                value={newCar.city_mpg}
                onChange={(e) => setNewCar({ ...newCar, city_mpg: e.target.value })}
                required
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-4">
              <button
                type="submit"
                disabled={addingCar}
                className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                {addingCar ? "Adding..." : "Add Vehicle"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Change Password Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Change Password</h1>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-md">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, current_password: e.target.value })
                }
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                New Password
              </label>
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, new_password: e.target.value })
                }
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                }
                required
                className={inputClass}
              />
            </div>

            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <strong>Error:</strong> {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {passwordSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={changingPassword}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              {changingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
