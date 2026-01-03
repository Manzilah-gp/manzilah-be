//import express from "express";
import dotenv from "dotenv";
import app from "./app.js";
import { createServer } from 'http';
import { initializeSocket } from './socket/chatSocket.js';


dotenv.config();
const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//     console.log(`Manzilah backend running on http://localhost:${PORT}`);
// });
const httpServer = createServer(app);
const io = initializeSocket(httpServer);
app.set('io', io);

httpServer.listen(PORT, () => {
    console.log(`Manzilah backend running on http://localhost:${PORT}`);
    console.log(` Socket.io ready`);
});
