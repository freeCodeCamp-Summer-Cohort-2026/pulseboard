import { useEffect } from "react";
import io from "socket.io-client";

//? Socket using same port as express API
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function useSocket(/* { addUpdate, addReaction } */) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      autoConnect: false
    });
    setSocket(newSocket);

    // //* Listen for events + update client feed
    // socket.on("POST:update", (update) => {
    //   //? Add update to client feed
    //   addUpdate(update);
    // });

    // //? reactionData: [postId, user, emoji]
    // socket.on("POST:reaction", (reactionData) => {
    //   //? Attach reaction to post with given id
    //   addReaction(reactionData);
    // });

    //* Cleanup
    return () => socket.disconnect();
  }, []);

  return socket;
}

// Could put socket in react context if needs to be shared across multiple components?
