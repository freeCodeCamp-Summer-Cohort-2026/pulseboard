import { useEffect } from "react";
import io from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    setSocket(io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"));

    //* Listen for events + update client feed
    socket.on("POST:update", (update) => {
      //? Add update to client feed
    });

    socket.on("POST:reaction", ([id, emoji]) => {
      //? Attach emoji reaction to post with given id
    });

    //* Cleanup
    return () => socket.disconnect();
  }, []);

  return socket;
}
