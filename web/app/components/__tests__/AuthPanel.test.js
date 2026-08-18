import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthPanel from "../AuthPanel";

jest.mock("@/lib/api", () => ({
  login: jest.fn(),
  register: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
}));

import {
  login,
  register,
  forgotPassword,
  resetPassword,
} from "@/lib/api";

describe("AuthPanel - Password Confirmation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows error and does not call API when passwords do not match", async () => {
    render(
      <AuthPanel
        auth={null}
        onSignIn={() => {}}
        onSignOut={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("Register"));

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

    fireEvent.click(screen.getByText("Create account"));

    await waitFor(() => {
      expect(
        screen.getByText("Passwords do not match"),
      ).toBeInTheDocument();
    });

    expect(register).not.toHaveBeenCalled();
  });

  test("calls API when passwords match", async () => {
    register.mockResolvedValue({
      user: { displayName: "Test User" },
    });

    render(
      <AuthPanel
        auth={null}
        onSignIn={() => {}}
        onSignOut={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("Register"));

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

    fireEvent.click(screen.getByText("Create account"));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        displayName: "Test User",
      });
    });
  });
});


describe("AuthPanel - Forgot Password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows forgot password form from login", () => {
    render(
      <AuthPanel
        auth={null}
        onSignIn={() => {}}
        onSignOut={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("Forgot password?"));

    expect(
      screen.getByText("Reset your password"),
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("Email"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Generate reset token"),
    ).toBeInTheDocument();
  });

  test("calls forgot password API with email", async () => {
    forgotPassword.mockResolvedValue({
      message: "Password reset token has been generated",
      devResetToken: "test-reset-token",
    });

    render(
      <AuthPanel
        auth={null}
        onSignIn={() => {}}
        onSignOut={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("Forgot password?"));

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });

    fireEvent.click(screen.getByText("Generate reset token"));

    await waitFor(() => {
      expect(forgotPassword).toHaveBeenCalledWith({
        email: "test@example.com",
      });
    });
  });

  test("moves to reset form when dev reset token is returned", async () => {
    forgotPassword.mockResolvedValue({
      message: "Password reset token has been generated",
      devResetToken: "test-reset-token",
    });

    render(
      <AuthPanel
        auth={null}
        onSignIn={() => {}}
        onSignOut={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("Forgot password?"));

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });

    fireEvent.click(screen.getByText("Generate reset token"));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Reset token"),
      ).toHaveValue("test-reset-token");
    });

    expect(
      screen.getByText("Reset password"),
    ).toBeInTheDocument();
  });
});


describe("AuthPanel - Reset Password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function openResetForm() {
    forgotPassword.mockResolvedValue({
      message: "Password reset token has been generated",
      devResetToken: "test-reset-token",
    });

    render(
      <AuthPanel
        auth={null}
        onSignIn={() => {}}
        onSignOut={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("Forgot password?"));

    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "test@example.com" },
    });

    fireEvent.click(screen.getByText("Generate reset token"));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Reset token"),
      ).toHaveValue("test-reset-token");
    });
  }

  test("calls reset password API with token and new password", async () => {
    resetPassword.mockResolvedValue({
      message: "Password reset successfully.",
    });

    await openResetForm();

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "newpassword123" },
    });

    fireEvent.change(
      screen.getByPlaceholderText("Confirm new password"),
      {
        target: { value: "newpassword123" },
      },
    );

    fireEvent.click(screen.getByText("Reset password"));

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith({
        token: "test-reset-token",
        newPassword: "newpassword123",
      });
    });
  });

  test("does not reset password when new passwords do not match", async () => {
    await openResetForm();

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "newpassword123" },
    });

    fireEvent.change(
      screen.getByPlaceholderText("Confirm new password"),
      {
        target: { value: "differentpassword123" },
      },
    );

    fireEvent.click(screen.getByText("Reset password"));

    await waitFor(() => {
      expect(
        screen.getByText("Passwords do not match"),
      ).toBeInTheDocument();
    });

    expect(resetPassword).not.toHaveBeenCalled();
  });

  test("returns to login after successful password reset", async () => {
    resetPassword.mockResolvedValue({
      message: "Password reset successfully.",
    });

    await openResetForm();

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "newpassword123" },
    });

    fireEvent.change(
      screen.getByPlaceholderText("Confirm new password"),
      {
        target: { value: "newpassword123" },
      },
    );

    fireEvent.click(screen.getByText("Reset password"));

await waitFor(() => {
  expect(
    screen.getByText(
      "Password reset successfully. You can now log in.",
    ),
  ).toBeInTheDocument();
});

expect(
  screen.getByPlaceholderText("Email"),
).toBeInTheDocument();

expect(
  screen.getByPlaceholderText("Password"),
).toBeInTheDocument();

expect(
  screen.getByText("Forgot password?"),
).toBeInTheDocument();
  });
});
