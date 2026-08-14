import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createUpdate } from "@/lib/api";
import UpdateForm from "../UpdateForm";

jest.mock("@/lib/api", () => ({
  createUpdate: jest.fn(),
}));

const auth = {
  token: "test-token",
};

describe("UpdateForm saving submissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("stores the form submission in LocalStorage on network error (Firefox)", async () => {
    let rejectRequest = new TypeError(
      "NetworkError when attempting to fetch resource.",
    );

    createUpdate.mockImplementation(() => {
      return new Promise((resolve, reject) => {
        reject(rejectRequest);
      });
    });

    const onPosted = jest.fn();

    render(<UpdateForm auth={auth} onPosted={onPosted} />);

    const textarea = screen.getByPlaceholderText(/what's your status today/i);
    const select = screen.getByRole("combobox");
    const button = screen.getByRole("button", { name: /post update/i });

    fireEvent.change(textarea, {
      target: { value: "test" },
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Failed to connect.")).toBeInTheDocument();
    });

    expect(localStorage.getItem("queuedMessages")).toMatch(
      /\[{\"id\":\"test\d+\",\"text\":\"test\",\"status\":\"on-track\"}\]/,
    );
  });

  it("stores the form submission in LocalStorage on network error (Chrome)", async () => {
    let rejectRequest = new TypeError("Failed to fetch");

    createUpdate.mockImplementation(() => {
      return new Promise((resolve, reject) => {
        reject(rejectRequest);
      });
    });

    const onPosted = jest.fn();

    render(<UpdateForm auth={auth} onPosted={onPosted} />);

    const textarea = screen.getByPlaceholderText(/what's your status today/i);
    const select = screen.getByRole("combobox");
    const button = screen.getByRole("button", { name: /post update/i });

    fireEvent.change(textarea, {
      target: { value: "test" },
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Failed to connect.")).toBeInTheDocument();
    });

    expect(localStorage.getItem("queuedMessages")).toMatch(
      /\[{\"id\":\"test\d+\",\"text\":\"test\",\"status\":\"on-track\"}\]/,
    );
  });
});
