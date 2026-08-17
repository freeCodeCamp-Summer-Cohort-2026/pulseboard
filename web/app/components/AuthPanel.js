"use client";

import { useState } from "react";
import { login, register } from "@/lib/api";

export default function AuthPanel({ auth, onSignIn, onSignOut }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const result =
        mode === "login"
          ? await login({ email, password })
          : await register({ email, password, displayName });
      onSignIn(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-panel" onSubmit={handleSubmit}>
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === "login" ? "active" : ""}
          onClick={() => setMode("login")}
        >
          Log in
        </button>
        <button
          type="button"
          className={mode === "register" ? "active" : ""}
          onClick={() => setMode("register")}
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
        />
      )}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <div className="password-field">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>

      {mode === "register" && (
        <div className="password-field">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            aria-label={
              showConfirmPassword
                ? "Hide confirm password"
                : "Show confirm password"
            }
          >
            {showConfirmPassword ? "Hide" : "Show"}
          </button>
        </div>
      )}

      <button type="submit" disabled={loading}>
        {loading
          ? "Please wait..."
          : mode === "login"
            ? "Log in"
            : "Create account"}
      </button>

      {error && <p className="error">{error}</p>}
    </form>
  );
}
