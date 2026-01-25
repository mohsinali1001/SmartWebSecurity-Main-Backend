import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

let io = null;

export const initSocket = (server) => {
  const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(",").map(origin => origin.trim())
    : ["http://localhost:3000", "http://localhost:5173"]; // Default fallback for development

  io = new Server(server, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join", (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

