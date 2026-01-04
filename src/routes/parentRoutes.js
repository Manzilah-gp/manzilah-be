
//  Parent-Child Relationship Routes


import express from 'express';
import {
    requestRelationship,
    getMyRequests,
    getPendingRequests,
    acceptRequest,
    rejectRequest,
    getMyChildren
} from '../controllers/parentController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * Parent Routes
 */

// Send relationship request (parent only)
router.post('/request-relationship', verifyToken,requestRelationship);

// Get parent's sent requests
router.get('/my-requests',verifyToken, getMyRequests);

// Get parent's verified children
router.get('/my-children',verifyToken, getMyChildren);

/**
 * Student (Child) Routes
 */

// Get pending requests for student
router.get('/pending-requests', verifyToken,getPendingRequests);

// Accept relationship request (student only)
router.put('/accept-request/:requestId',verifyToken, acceptRequest);

// Reject relationship request (student only)
router.delete('/reject-request/:requestId',verifyToken, rejectRequest);

export default router;