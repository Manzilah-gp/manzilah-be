// backend/src/routes/eventRoutes.js
import express from "express";
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";
import {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    approveEvent,
    rejectEvent,
    likeEvent,
    unlikeEvent,
    rsvpEvent,
    commentOnEvent,
    deleteComment,
    getEventStats,
    getEventInteractions
} from "../controllers/eventController.js";

const router = express.Router();


router.get("/", verifyToken, getEvents);


// FIXED: This route MUST be BEFORE /:id route
router.get("/:id/interactions", verifyToken, checkRole(["mosque_admin"]), getEventInteractions);

router.get("/:id/stats", verifyToken, getEventStats);


router.post("/:id/like", verifyToken, likeEvent);
router.delete("/:id/like", verifyToken, unlikeEvent);

router.post("/:id/rsvp", verifyToken, rsvpEvent);

router.post("/:id/comment", verifyToken, commentOnEvent);
router.delete("/comment/:commentId", verifyToken, deleteComment);


// Create event (mosque admin only)
router.post("/", verifyToken, checkRole(["mosque_admin"]), createEvent);

// Update event (mosque admin only)
router.put("/:id", verifyToken, checkRole(["mosque_admin"]), updateEvent);

// Delete event (mosque admin only)
router.delete("/:id", verifyToken, checkRole(["mosque_admin"]), deleteEvent);

// ==================== MINISTRY ADMIN ROUTES ====================

router.put("/:id/approve", verifyToken, checkRole(["ministry_admin"]), approveEvent);
router.put("/:id/reject", verifyToken, checkRole(["ministry_admin"]), rejectEvent);

// ==================== GET BY ID MUST BE LAST ====================

// Get single event details - THIS MUST BE LAST
router.get("/:id", verifyToken, getEventById);

export default router;