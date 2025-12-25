import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
// import userRoutes from "./routes/userRoutes.js";
import mosqueRoutes from "./routes/mosqueRoutes.js";
import statisticsRoutes from "./routes/statisticsRoutes.js"
import courseRoutes from "./routes/courseRoutes.js";
import teacherManagementRoutes from "./routes/teacherManagementRoutes.js";
import publicBrowsingRoutes from "./routes/publicBrowsingRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import studentDashboardRoutes from "./routes/studentDashboardRoutes.js";


dotenv.config();

const app = express();


// Middleware
// ✅ Enable CORS for frontend
app.use(cors({
    origin: "http://localhost:5173", // your frontend URL
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Routes
app.use("/api/users", authRoutes); // base path for auth
app.use("/api/mosques", mosqueRoutes);
app.use("/api/dashboard", statisticsRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/teachers", teacherManagementRoutes);
app.use("/api/public", publicBrowsingRoutes);
app.use("/api/enrollment", enrollmentRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/student", studentDashboardRoutes);

// Default route
app.get('/', (req, res) => {
    res.send('Welcome to Manzilah Backend API 🚀');
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});


// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
});

export default app;
