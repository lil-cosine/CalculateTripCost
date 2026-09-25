import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Calculator from "../Calculator";
import { AuthProvider } from "../AuthContext";

const renderCalculator = () => {
  return render(
    <AuthProvider>
      <Calculator />
    </AuthProvider>
  );
};

describe("Calculator", () => {
  beforeEach(() => {
    global.fetch = jest.fn((url) => {
      if (url.includes("/api/me/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 1, email: "test@example.com" }),
        });
      }
      if (url.includes("/api/my-cars/")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("disables submit and shows a hint when no vehicles exist", async () => {
    renderCalculator();

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: "No vehicles added yet" })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "Add a vehicle on the Manage Account page before calculating a trip."
      )
    ).toBeInTheDocument();

    const submitButton = screen.getByRole("button", { name: /calculate/i });
    expect(submitButton).toBeDisabled();
  });

  test("submits trip data and displays the result", async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/me/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 1, email: "test@example.com" }),
        });
      }
      if (url.includes("/api/my-cars/")) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { id: 1, name: "Civic", highway_mpg: 38, city_mpg: 30 },
          ],
        });
      }
      if (url.includes("/api/calculate/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            blended_mpg: 34,
            gallons_used: 2.94,
            gas_price: 3.499,
            fuel_cost: 25.5,
            total_cost: 25.5,
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderCalculator();

    const vehicleSelect = await screen.findByRole("combobox", { name: /vehicle/i });

    await waitFor(() => {
      expect(vehicleSelect).toHaveValue("1");
      expect(
        screen.getByRole("option", { name: /Civic.*30 city.*38 hwy/i })
      ).toBeInTheDocument();
    });

    const milesInput = screen.getByRole("spinbutton", { name: /trip distance/i });
    await userEvent.type(milesInput, "100");

    const calculateButton = screen.getByRole("button", { name: /calculate trip cost/i });
    await userEvent.click(calculateButton);

    await waitFor(() => {
      expect(screen.getByText("Trip Cost Breakdown")).toBeInTheDocument();
    });

    expect(screen.getByText("Civic")).toBeInTheDocument();
    expect(screen.getByText(/25\.50/)).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/calculate/",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  test("shows an error and does not submit when there is no vehicle selected", async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/me/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 1, email: "test@example.com" }),
        });
      }
      if (url.includes("/api/my-cars/")) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { id: 1, name: "Civic", highway_mpg: 38, city_mpg: 30 },
          ],
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    renderCalculator();

    const vehicleSelect = await screen.findByRole("combobox", { name: /vehicle/i });

    await waitFor(() => {
      expect(vehicleSelect).toHaveValue("1");
    });

    const milesInput = screen.getByRole("spinbutton", { name: /trip distance/i });
    await userEvent.type(milesInput, "100");

    // The select only renders real car options once cars are loaded, so
    // there's no empty option for userEvent to pick via selectOptions.
    // Force the DOM value directly to simulate car_id no longer matching
    // any known car, and exercise the guard clause in handleSubmit.
    fireEvent.change(vehicleSelect, { target: { value: "" } });

    const calculateButton = screen.getByRole("button", { name: /calculate trip cost/i });
    await userEvent.click(calculateButton);

    await waitFor(() => {
      expect(
        screen.getByText(/please add a vehicle before calculating/i)
      ).toBeInTheDocument();
    });

    expect(global.fetch).not.toHaveBeenCalledWith("/api/calculate/", expect.anything());
  });
});
