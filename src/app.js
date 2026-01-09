import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import mosqueRoutes from "./routes/mosqueRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import donationRoutes from "./routes/donationRoutes.js";
import chatRoutes from './routes/chatRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';


import statisticsRoutes from "./routes/statisticsRoutes.js"
import courseRoutes from "./routes/courseRoutes.js";
import teacherManagementRoutes from "./routes/teacherManagementRoutes.js";
import publicBrowsingRoutes from "./routes/publicBrowsingRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import studentDashboardRoutes from "./routes/studentDashboardRoutes.js";
import videoCallRoutes from "./routes/videoCallRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import teacherCoursesRoutes from "./routes/teacherCoursesRoutes.js";
import materialRoutes from "./routes/materialRoutes.js";

import teacherProfileRoutes from "./routes/teacherProfileRoutes.js";
import parentRoutes from './routes/parentRoutes.js';
import firebaseNotificationRoutes from './routes/firebaseNotificationRoutes.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
app.use("/api/profile", profileRoutes); // ADD THIS LINE
app.use("/api/events", eventRoutes);
app.use("/api/donations", donationRoutes);
app.use('/api/chat', chatRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api/dashboard", statisticsRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/teachers", teacherManagementRoutes);
app.use("/api/public", publicBrowsingRoutes);
app.use("/api/enrollment", enrollmentRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/student", studentDashboardRoutes);
app.use("/api/teacher-profile", teacherProfileRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/firebase-notifications', firebaseNotificationRoutes);

// app.use("/api/video-calls", videoCallRoutes);

app.use("/api/video-calls", videoCallRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/teacher", teacherCoursesRoutes);
app.use("/api/materials", materialRoutes);
app.use('/uploads/materials', express.static(path.join(__dirname, 'uploads/materials')));



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