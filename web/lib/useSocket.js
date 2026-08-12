import { useEffect } from "react";
import io from "socket.io-client";

const URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function useSocket({ addUpdate, addReaction }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    setSocket(io(URL, {
      autoConnect: false
    }));

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

//!-----------------------------------------------------------------------------

// Testing this out as an alternative
export const socket = io(URL, {
  autoConnect: false
});
