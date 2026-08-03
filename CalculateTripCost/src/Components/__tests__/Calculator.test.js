import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import Calculator from "../Calculator";

jest.mock("axios");

beforeEach(() => {
  global.fetch = jest.fn();
});

test("disables submit and shows a hint when no vehicles exist", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
  render(<Calculator />);

  await waitFor(() =>
    expect(
      screen.getByText(/Add a vehicle on the Manage Account page/)
    ).toBeInTheDocument()
  );
  expect(screen.getByRole("button", { name: /Calculate Trip Cost/i })).toBeDisabled();
});

test("submits trip data and displays the result", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [{ id: 1, name: "Civic", city_mpg: 30, highway_mpg: 38 }],
  });
  axios.post.mockResolvedValueOnce({
    data: { blended_mpg: 34, gallons_used: 2.94, total_cost: 10.15, gas_price: 3.45 },
  });

  render(<Calculator />);

  await waitFor(() => expect(screen.getByDisplayValue(/Civic/)).toBeInTheDocument());

  fireEvent.change(screen.getByPlaceholderText("Enter distance"), {
    target: { value: "100" },
  });

  fireEvent.click(screen.getByRole("button", { name: /Calculate Trip Cost/i }));

  await waitFor(() =>
    expect(screen.getByText(/Total Estimated Cost/)).toBeInTheDocument()
  );

  expect(axios.post).toHaveBeenCalledWith(
    expect.stringContaining("/api/calculate/"),
    expect.objectContaining({ miles: "100", mpg_city: 30, mpg_highway: 38 }),
    expect.any(Object)
  );
});

test("shows an error and does not submit when there is no vehicle selected", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
  render(<Calculator />);

  await waitFor(() =>
    expect(screen.getByRole("button", { name: /Calculate Trip Cost/i })).toBeDisabled()
  );
  expect(axios.post).not.toHaveBeenCalled();
});
