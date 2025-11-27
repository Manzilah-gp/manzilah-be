import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
// import userRoutes from "./routes/userRoutes.js";
import mosqueRoutes from "./routes/mosqueRoutes.js";

dotenv.config();

const app = express();

// ✅ Enable CORS for frontend
app.use(cors({
    origin: "http://localhost:5173", // your frontend URL
    credentials: true,
}));

app.use(express.json());


app.use("/api/users", authRoutes); // base path for auth
app.use("/api/mosques", mosqueRoutes);

// //API routes
// app.use(express.json());
// app.use("/api/users", userRoutes);
// app.use("/api/mosques", mosqueRoutes);

// Default route
app.get('/', (req, res) => {
    res.send('Welcome to Manzilah Backend API 🚀');
});

export default app;
