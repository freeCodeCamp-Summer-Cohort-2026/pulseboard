"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import AuthPanel from "./components/AuthPanel";
import UpdateForm from "./components/UpdateForm";
import Feed from "./components/Feed";

const THEME_STORAGE_KEY = "pulseboard.theme";

export default function HomePage() {
  const { auth, ready, signIn, signOut } = useAuth();
  const [refreshToken, setRefreshToken] = useState(0);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
        document.documentElement.dataset.theme = savedTheme;
      }
    } catch (err) {
      // ignore unavailable storage
    }
  }, []);

  function handleThemeToggle() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (err) {
      // ignore unavailable storage
    }
  }

  function handlePosted() {
    setRefreshToken((n) => n + 1);
  }

  return (
    <main className="container">
      <h1>PulseBoard</h1>
      <p className="tagline">The team standup feed - post, react, stay in sync.</p>

      <button type="button" onClick={handleThemeToggle} className="theme-toggle">
        {theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      </button>

      {ready && <AuthPanel auth={auth} onSignIn={signIn} onSignOut={signOut} />}

      <section>
        <h2>Post an update</h2>
        <UpdateForm auth={auth} onPosted={handlePosted} />
      </section>

      <section>
        <h2>Feed</h2>
        <Feed auth={auth} refreshToken={refreshToken} />
      </section>
    </main>
  );
}
