import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import NavBar from "../NavBar";

describe("NavBar", () => {
  test("renders all nav items", () => {
    render(<NavBar activeSection="stats" setActiveSection={() => {}} />);
    expect(screen.getByText("Drive Stats")).toBeInTheDocument();
    expect(screen.getByText("Add Drive")).toBeInTheDocument();
    expect(screen.getByText("Past Drives")).toBeInTheDocument();
    expect(screen.getByText("Manage Account")).toBeInTheDocument();
    expect(screen.getByText("Log Out")).toBeInTheDocument();
  });

  test("clicking a nav item calls setActiveSection with its id", () => {
    const setActiveSection = jest.fn();
    render(<NavBar activeSection="stats" setActiveSection={setActiveSection} />);
    fireEvent.click(screen.getByText("Manage Account"));
    expect(setActiveSection).toHaveBeenCalledWith("usr");
  });

  test("clicking the logo returns to the stats section", () => {
    const setActiveSection = jest.fn();
    render(<NavBar activeSection="add" setActiveSection={setActiveSection} />);
    fireEvent.click(screen.getByText("CalculateTripCost"));
    expect(setActiveSection).toHaveBeenCalledWith("stats");
  });
});
