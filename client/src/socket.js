import {io} from 'socket.io-client';

const socket = io("https://online-enrollment.onrender.com", {
  transports: ["websocket"], // force websocket (avoids polling issues)
});

export default socket;