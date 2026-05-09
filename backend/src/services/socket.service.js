import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Adjust this in production
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Join a general clinic room (can be scaled to multi-clinic later)
    socket.join('clinic_main');

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export const emitEvent = (event, data) => {
  if (io) {
    console.log(`📡 Emitting event: ${event}`);
    io.to('clinic_main').emit(event, data);
  }
};

export const SOCKET_EVENTS = {
  PATIENT_UPDATED: 'PATIENT_UPDATED',
  APPOINTMENT_UPDATED: 'APPOINTMENT_UPDATED',
  INVOICE_UPDATED: 'INVOICE_UPDATED',
  PRESCRIPTION_UPDATED: 'PRESCRIPTION_UPDATED',
  QUEUE_UPDATED: 'QUEUE_UPDATED',
  ACTIVITY_LOGGED: 'ACTIVITY_LOGGED'
};
