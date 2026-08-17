import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthPanel from "../AuthPanel";

jest.mock("@/lib/api", () => ({
  login: jest.fn(),
  register: jest.fn(),
}));

import { register } from "@/lib/api";

describe("AuthPanel - Password Confirmation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows error and does not call API when passwords do not match", async () => {
    render(<AuthPanel auth={null} onSignIn={() => {}} onSignOut={() => {}} />);

    const registerTab = screen.getByText("Register");
    fireEvent.click(registerTab);

    // Fill in form with mismatched passwords
    fireEvent.change(screen.getByPlaceholderText("Display name"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "password456" },
    });

    const submitButton = screen.getByText("Create account");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });

    expect(register).not.toHaveBeenCalled();
  });

  test("calls API when passwords match", async () => {
    register.mockResolvedValue({ user: { displayName: "Test User" } });

    render(<AuthPanel auth={null} onSignIn={() => {}} onSignOut={() => {}} />);

    const registerTab = screen.getByText("Register");
    fireEvent.click(registerTab);

    // Fill in form with matching passwords
    fireEvent.change(screen.getByPlaceholderText("Display name"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "password123" },
    });

    const submitButton = screen.getByText("Create account");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        displayName: "Test User",
      });
    });
  });

   test("toggles password visibility", () => {
    render(
      <AuthPanel
        auth={null}
        onSignIn={() => {}}
        onSignOut={() => {}}
      />
    );

    const passwordInput = screen.getByPlaceholderText("Password");

    const toggleButton = screen.getByRole("button", {
      name: "Show password",
    });

    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute("type", "text");

    expect(
      screen.getByRole("button", {
        name: "Hide password",
      })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Hide password",
      })
    );

    expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("toggles confirm password visibility independently", () => {
    render(
      <AuthPanel
        auth={null}
        onSignIn={() => {}}
        onSignOut={() => {}}
      />
    );

    fireEvent.click(screen.getByText("Register"));

    const passwordInput = screen.getByPlaceholderText("Password");
    const confirmPasswordInput =
      screen.getByPlaceholderText("Confirm password");

    const passwordToggle = screen.getByRole("button", {
      name: "Show password",
    });

    const confirmPasswordToggle = screen.getByRole("button", {
      name: "Show confirm password",
    });

    expect(passwordInput).toHaveAttribute("type", "password");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");

    fireEvent.click(passwordToggle);

    expect(passwordInput).toHaveAttribute("type", "text");

    // Confirm password should remain hidden
    expect(confirmPasswordInput).toHaveAttribute("type", "password");

    fireEvent.click(confirmPasswordToggle);

    expect(confirmPasswordInput).toHaveAttribute("type", "text");
  });

});
