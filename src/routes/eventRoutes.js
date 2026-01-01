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
    getEventInteractions,
    getUserCalendarEvents,
    getMyMosqueEvents,
      markEventCompleted  

} from "../controllers/eventController.js";

const router = express.Router();

// ==================== GENERAL ROUTES (NO PARAMS) ====================

// Get all events
router.get("/", verifyToken, getEvents);
// Mark event as completed
router.put('/:id/complete', verifyToken, markEventCompleted);
// ==================== SPECIFIC ROUTES (BEFORE /:id) ====================

// CRITICAL: This route MUST be BEFORE /:id route to prevent 'user' being treated as an ID
router.get('/user/calendar', verifyToken, getUserCalendarEvents);

// Event interactions (mosque admin only)
router.get("/:id/interactions", verifyToken, checkRole(["mosque_admin"]), getEventInteractions);

// Event statistics
router.get("/:id/stats", verifyToken, getEventStats);

// ==================== POST/PUT/DELETE ROUTES ====================

// Like/Unlike events
router.post("/:id/like", verifyToken, likeEvent);
router.delete("/:id/like", verifyToken, unlikeEvent);

// RSVP to event
router.post("/:id/rsvp", verifyToken, rsvpEvent);

// Comment on events
router.post("/:id/comment", verifyToken, commentOnEvent);
router.delete("/comment/:commentId", verifyToken, deleteComment);

// Create event (mosque admin only)
router.post("/", verifyToken, checkRole(["mosque_admin"]), createEvent);

// Update event (mosque admin only)
router.put("/:id", verifyToken, checkRole(["mosque_admin"]), updateEvent);

// Delete event (mosque admin only)
router.delete("/:id", verifyToken, checkRole(["mosque_admin"]), deleteEvent);

// ==================== MINISTRY ADMIN ROUTES ====================

// Approve/Reject events (ministry admin only)
router.put("/:id/approve", verifyToken, checkRole(["ministry_admin"]), approveEvent);
router.put("/:id/reject", verifyToken, checkRole(["ministry_admin"]), rejectEvent);

// ==================== GET BY ID MUST BE ABSOLUTE LAST ====================

//mange fundraising evemts
router.get('/my-mosque-events', verifyToken, getMyMosqueEvents);


router.get("/:id", verifyToken, getEventById);

export default router;