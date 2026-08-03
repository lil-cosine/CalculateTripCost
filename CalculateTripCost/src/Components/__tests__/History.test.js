import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import History from "../History";

jest.mock("axios");

const mockDrives = [
  {
    start_time: "2026-01-05T10:00:00Z",
    miles: 50,
    highway_percent: 50,
    state_code: "NC",
    blended_mpg: 25,
    gallons_used: 2,
    gas_price: 3,
    total_cost: 6,
    drive_type: "required",
    reason: "Work",
  },
  {
    start_time: "2026-01-01T10:00:00Z",
    miles: 10,
    highway_percent: 0,
    state_code: "SC",
    blended_mpg: 20,
    gallons_used: 0.5,
    gas_price: 3,
    total_cost: 1.5,
    drive_type: "recreational",
    reason: "Fun",
  },
];

test("fetches and displays drive history", async () => {
  axios.get.mockResolvedValueOnce({ data: mockDrives });
  render(<History />);
  await waitFor(() => expect(screen.getByText(/2 total drives/)).toBeInTheDocument());
  expect(screen.getByText("NC")).toBeInTheDocument();
  expect(screen.getByText("SC")).toBeInTheDocument();
});

test("sorting by miles ascending puts the smaller trip first", async () => {
  axios.get.mockResolvedValueOnce({ data: mockDrives });
  render(<History />);
  await waitFor(() => expect(screen.getByText(/2 total drives/)).toBeInTheDocument());

  fireEvent.click(screen.getByText("Miles"));

  const rows = screen.getAllByRole("row").slice(1); // skip header row
  expect(within(rows[0]).getByText("SC")).toBeInTheDocument();
});

test("shows an error message when the fetch fails", async () => {
  axios.get.mockRejectedValueOnce({
    response: { data: { detail: "Failed to fetch drive history" } },
  });
  render(<History />);
  await waitFor(() =>
    expect(screen.getByText(/Failed to fetch drive history/)).toBeInTheDocument()
  );
});
