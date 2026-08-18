import { useState, useEffect } from "react";
import io from "socket.io-client";

//? Socket using same port as express API
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function useSocket() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      autoConnect: false,
    });

    if (!newSocket) console.error("Socket instantiation failed");
    newSocket.connect();

    setSocket(newSocket);

    //* Cleanup
    return () => {
      newSocket.disconnect();
    };
  }, []);

  return socket;
}
