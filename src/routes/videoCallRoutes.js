// src/routes/videoCallRoutes.js
import express from 'express';
import {
    enableCourseMeeting,
    disableCourseMeeting,
    getMeetingToken,
    getMeetingDetails
} from '../controllers/videoCallController.js';
import { verifyToken, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * Mosque Admin Routes - Enable/Disable meetings
 */
router.post(
    '/enable/:courseId',
    checkRole(['mosque_admin']),
    enableCourseMeeting
);

router.post(
    '/disable/:courseId',
    checkRole(['mosque_admin']),
    disableCourseMeeting
);

/**
 * Get meeting token (for joining)
 * Accessible by: enrolled students, course teacher, mosque admin
 */
router.get('/token/:courseId', getMeetingToken);

/**
 * Get meeting details
 * Accessible by: enrolled students, course teacher, mosque admin
 */
router.get('/meeting/:courseId', getMeetingDetails);

export default router;
