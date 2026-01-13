// NEW API BASE: /api/student-progress
// API endpoints for students to view their own progress

import express from 'express';
import {
    getMyProgress,
    getMyProgressHistory
} from '../controllers/studentProgressController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/student-progress/my-progress/:enrollmentId
 * @desc    Get student's own progress for a specific enrollment
 * @access  Private (Student role)
 */
router.get('/my-progress/:enrollmentId', getMyProgress);

/**
 * @route   GET /api/student-progress/my-progress-history/:enrollmentId
 * @desc    Get progress history for student's enrollment
 * @access  Private (Student role)
 */
router.get('/my-progress-history/:enrollmentId', getMyProgressHistory);

export default router;