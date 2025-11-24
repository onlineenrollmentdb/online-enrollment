import {io} from 'socket.io-client';

const socket = io("http://localhost:5000", {
  transports: ["websocket"], // force websocket (avoids polling issues)
});

export default socket;