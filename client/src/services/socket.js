import { io } from 'socket.io-client';

const getServerUrl = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  // Automatically connect to host IP on port 5000 for local network Wi-Fi access
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000`;
};

export const SERVER_URL = getServerUrl();

export const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});
