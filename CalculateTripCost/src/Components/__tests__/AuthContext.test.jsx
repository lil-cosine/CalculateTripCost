import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider, useAuth } from "../AuthContext";

function Probe() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : "none"}</span>
      <button onClick={() => login("a@example.com", "password123")}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test("checks auth on mount and reflects an unauthenticated user", async () => {
  global.fetch.mockResolvedValueOnce({ ok: false });

  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

  await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
  expect(screen.getByTestId("user")).toHaveTextContent("none");
});

test("login stores the returned user", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: false }) // initial checkAuth on mount
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, email: "a@example.com" }),
    });

  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

  await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

  await act(async () => {
    screen.getByText("login").click();
  });

  expect(screen.getByTestId("user")).toHaveTextContent("a@example.com");
});

test("logout clears the user", async () => {
  global.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, email: "a@example.com" }),
    }) // initial checkAuth finds a logged-in user
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // logout call

  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

  await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("a@example.com"));

  await act(async () => {
    screen.getByText("logout").click();
  });

  expect(screen.getByTestId("user")).toHaveTextContent("none");
});
