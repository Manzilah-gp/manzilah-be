import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import mosqueRoutes from "./routes/mosqueRoutes.js";
import profileRoutes from "./routes/profileRoutes.js"; 
import eventRoutes from "./routes/eventRoutes.js"; 

dotenv.config();

const app = express();

//  Enable CORS for frontend
app.use(cors({
    origin: "http://localhost:5173", // your frontend URL
    credentials: true,
}));

app.use(express.json());

app.use("/api/users", authRoutes); // base path for auth
app.use("/api/mosques", mosqueRoutes);
app.use("/api/profile", profileRoutes); // ADD THIS LINE
app.use("/api/events", eventRoutes);


// Default route
app.get('/', (req, res) => {
    res.send('Welcome to Manzilah Backend API 🚀');
});

export default app;