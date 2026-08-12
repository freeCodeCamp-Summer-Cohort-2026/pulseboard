import { useEffect } from "react";
import io from "socket.io-client";
import { addReaction } from "./api";

export function useSocket({ addUpdate }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    setSocket(io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"));

    //* Listen for events + update client feed
    socket.on("POST:update", (update) => {
      //? Add update to client feed
      addUpdate(update);
    });

    //? reactionData: [postId, user, emoji]
    socket.on("POST:reaction", (reactionData) => {
      //? Attach reaction to post with given id
      addReaction(reactionData);
    });

    //* Cleanup
    return () => socket.disconnect();
  }, []);

  return socket;
}
