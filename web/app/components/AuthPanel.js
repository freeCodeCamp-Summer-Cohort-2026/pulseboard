"use client";

import { useState } from "react";
import { login, register, forgotPassword, resetPassword } from "@/lib/api";

export default function AuthPanel({ auth, onSignIn, onSignOut }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");

 if (auth) {
    return (
      <div className="auth-panel">
        <span>
          Signed in as <strong>{auth.user.displayName}</strong>
        </span>

        <button type="button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    );
  }

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  function switchMode(newMode) {
    setMode(newMode);
    clearMessages();
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);

    clearMessages();
    setLoading(true);

    try {
      if (mode === "register") {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          return;
        }

        const result = await register({
          email,
          password,
          displayName,
        });

        onSignIn(result);
        return;
      }

      if (mode === "login") {
        const result = await login({
          email,
          password,
        });

        onSignIn(result);
        return;
      }

      if (mode === "forgot") {
        const result = await forgotPassword({
          email,
        });

        /*
         * The backend exposes the raw token only outside production.
         * This allows the cohort's dev-mode flow to be exercised
         * without implementing email delivery.
         */
        if (result.devResetToken) {
          setResetToken(result.devResetToken);
          setMode("reset");
          setSuccess(
            "Reset token generated. Enter a new password below.",
          );
        } else {
          setSuccess(
            result.message ||
              "If an account exists, a reset request has been created.",
          );
        }

        return;
      }

      if (mode === "reset") {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          return;
        }

        await resetPassword({
          token: resetToken,
          newPassword: password,
        });

        setPassword("");
        setConfirmPassword("");
        setResetToken("");
        setMode("login");

        setSuccess(
          "Password reset successfully. You can now log in.",
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (mode === "forgot") {
    return (
      <form className="auth-panel" onSubmit={handleSubmit}>
        <h3>Reset your password</h3>

        <p>
          Enter your email address to generate a password
          reset token.
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : "Generate reset token"}
        </button>

        <button
          type="button"
          onClick={() => switchMode("login")}
          disabled={loading}
        >
          Back to login
        </button>

        {error && <p className="error">{error}</p>}
        {success && <p>{success}</p>}
      </form>
    );
  }

  if (mode === "reset") {
    return (
      <form className="auth-panel" onSubmit={handleSubmit}>
        <h3>Reset your password</h3>

        <input
          type="text"
          placeholder="Reset token"
          value={resetToken}
          onChange={(e) => setResetToken(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : "Reset password"}
        </button>

        <button
          type="button"
          onClick={() => switchMode("login")}
          disabled={loading}
        >
          Back to login
        </button>

        {error && <p className="error">{error}</p>}
        {success && <p>{success}</p>}
      </form>
    );
  }

  return (
    <form className="auth-panel" onSubmit={handleSubmit}>
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === "login" ? "active" : ""}
          onClick={() => switchMode("login")}
        >
          Log in
        </button>

        <button
          type="button"
          className={mode === "register" ? "active" : ""}
          onClick={() => switchMode("register")}
        >
          Register
        </button>
      </div>

      {mode === "register" && (
        <input
          type="text"
          placeholder="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          maxLength={100}
        />
      )}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
      />

      {mode === "register" && (
        <input
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
      )}

      <button type="submit" disabled={loading}>
        {loading
          ? "Please wait..."
          : mode === "login"
            ? "Log in"
            : "Create account"}
      </button>

      {mode === "login" && (
        <button
          type="button"
          onClick={() => switchMode("forgot")}
          disabled={loading}
        >
          Forgot password?
        </button>
      )}

      {error && <p className="error">{error}</p>}
      {success && <p>{success}</p>}
    </form>
  );
}
