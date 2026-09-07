import { io, type Socket } from "socket.io-client";

export const socket: Socket = io({
  withCredentials: true,
  autoConnect: false,
});

export function connectSocket(): void {
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket(): void {
  socket.disconnect();
}
