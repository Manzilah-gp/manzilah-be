// backend/routes/profileRoutes.js
import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
    getUserProfile,
    updateUserProfile,
    updateUserLocation
} from "../controllers/profileController.js";

const router = express.Router();

// @route   GET /api/profile
// @desc    Get complete user profile with all role-specific data
// @access  Private
router.get("/", verifyToken, getUserProfile);

// @route   PUT /api/profile
// @desc    Update user basic information
// @access  Private
router.put("/", verifyToken, updateUserProfile);

// @route   PUT /api/profile/location
// @desc    Update user location
// @access  Private
router.put("/location", verifyToken, updateUserLocation);

export default router;