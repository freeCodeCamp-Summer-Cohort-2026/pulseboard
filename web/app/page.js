"use client";

import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import AuthPanel from "./components/AuthPanel";
import UpdateForm from "./components/UpdateForm";
import Feed from "./components/Feed";
import { useSocket } from "@/lib/useSocket";

export default function HomePage() {
  const { auth, ready, signIn, signOut } = useAuth();
  const [refreshToken, setRefreshToken] = useState(0);
  const socket = useSocket();

  function handlePosted() {
    setRefreshToken((n) => n + 1);
  }

  return (
    <main className="container">
      <h1>PulseBoard</h1>
      <p className="tagline">The team standup feed - post, react, stay in sync.</p>

      {ready && <AuthPanel auth={auth} onSignIn={signIn} onSignOut={signOut} />}

      <section>
        <h2>Post an update</h2>
        <UpdateForm auth={auth} onPosted={handlePosted} />
      </section>

      <section>
        <h2>Feed</h2>
        <Feed auth={auth} refreshToken={refreshToken} socket={socket} />
      </section>
    </main>
  );
}
