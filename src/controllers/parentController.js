//Parent-Child Relationship Management

import db from "../config/db.js";
import { notifyUser } from './firebaseNotificationController.js'; 

/**
 * Send parent-child relationship request
 * @route POST /api/parent/request-relationship
 * @access Private (Parents only)
 * 
 * PURPOSE: Parent requests to create relationship with their child
 * LOGIC:
 * 1. Validate parent role
 * 2. Validate child exists and is a student
 * 3. Check for existing relationship
 * 4. Create relationship with is_verified = 0 (pending)
 * 5. Child will see this in their profile to accept/reject
 */
export const requestRelationship = async (req, res) => {
    try {
                console.log('🟡 req.user:', req.user);
        console.log('🟡 role:', req.user?.role);

        const parentId = req.user.id;
        const { childEmail, relationshipType } = req.body;

        // Validate input
        if (!childEmail || !relationshipType) {
            return res.status(400).json({
                success: false,
                message: 'Child email and relationship type are required'
            });
        }

        // Validate relationship type
        const validTypes = ['father', 'mother', 'guardian'];
        if (!validTypes.includes(relationshipType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid relationship type. Must be: father, mother, or guardian'
            });
        }

        // Check if requester is a parent
if (!req.user.roles.includes('parent')) {
            return res.status(403).json({
                success: false,
                message: 'Only parents can request relationships'
            });
        }

        // Find child by email
     const [children] = await db.execute(`
    SELECT 
        u.id,
        u.full_name,
        u.email,
        r.name AS role
    FROM user u
    JOIN role_assignment ra ON ra.user_id = u.id
    JOIN role r ON r.id = ra.role_id
    WHERE u.email = ?
`, [childEmail]);


        if (children.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No user found with this email'
            });
        }

        const child = children[0];

        // Check if child is a student
        if (child.role !== 'student') {
            return res.status(400).json({
                success: false,
                message: 'User must be a student to create parent-child relationship'
            });
        }

        // Check if parent is trying to add themselves
        if (child.id === parentId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot create relationship with yourself'
            });
        }

        // Check for existing relationship
        const [existing] = await db.execute(`
            SELECT id, is_verified
            FROM parent_child_relationship
            WHERE parent_id = ? AND child_id = ?
        `, [parentId, child.id]);

        if (existing.length > 0) {
            if (existing[0].is_verified) {
                return res.status(400).json({
                    success: false,
                    message: 'Relationship already exists and is verified'
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Relationship request already pending. Wait for child to accept.'
                });
            }
        }

        // Create relationship request (is_verified = 0)
        const [result] = await db.execute(`
            INSERT INTO parent_child_relationship 
            (parent_id, child_id, relationship_type, is_verified, created_at)
            VALUES (?, ?, ?, 0, NOW())
        `, [parentId, child.id, relationshipType]);

        // Get parent info for response
        const [parentInfo] = await db.execute(`
            SELECT full_name, email
            FROM user
            WHERE id = ?
        `, [parentId]);

if (result.insertId) {
  await notifyUser(child.id, {
    type: 'system',
    title: 'Parent Relationship Request',
    message: `${parentInfo[0].full_name} wants to connect as your ${relationshipType}`,
    link: `/profile?tab=relationships`,
    icon: '👨‍👩‍👧'
  });
}
        res.status(201).json({
            success: true,
            message: 'Relationship request sent successfully! Child must accept.',
            data: {
                requestId: result.insertId,
                childName: child.full_name,
                childEmail: child.email,
                relationshipType,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('❌ Error creating relationship request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send relationship request',
            error: error.message
        });
    }
};

/**
 * Get all relationship requests for current parent
 * @route GET /api/parent/my-requests
 * @access Private (Parents)
 * 
 * PURPOSE: Show parent their sent requests and status
 */
export const getMyRequests = async (req, res) => {
    try {
        const parentId = req.user.id;

        const [requests] = await db.execute(`
            SELECT 
                pcr.id,
                pcr.relationship_type,
                pcr.is_verified,
                pcr.created_at,
                pcr.verified_at,
                u.full_name as child_name,
                u.email as child_email,
                u.gender as child_gender
            FROM parent_child_relationship pcr
            JOIN user u ON pcr.child_id = u.id
            WHERE pcr.parent_id = ?
            ORDER BY pcr.created_at DESC
        `, [parentId]);

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });

    } catch (error) {
        console.error('❌ Error fetching parent requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch requests',
            error: error.message
        });
    }
};

/**
 * Get pending relationship requests for student (child)
 * @route GET /api/parent/pending-requests
 * @access Private (Students)
 * 
 * PURPOSE: Student sees requests from parents waiting for acceptance
 */
export const getPendingRequests = async (req, res) => {
    try {
        const childId = req.user.id;

        const [requests] = await db.execute(`
            SELECT 
                pcr.id,
                pcr.relationship_type,
                pcr.created_at,
                u.full_name as parent_name,
                u.email as parent_email,
                u.phone as parent_phone
            FROM parent_child_relationship pcr
            JOIN user u ON pcr.parent_id = u.id
            WHERE pcr.child_id = ?
            AND pcr.is_verified = 0
            ORDER BY pcr.created_at DESC
        `, [childId]);

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });

    } catch (error) {
        console.error('❌ Error fetching pending requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending requests',
            error: error.message
        });
    }
};

/**
 * Accept parent relationship request
 * @route PUT /api/parent/accept-request/:requestId
 * @access Private (Students)
 * 
 * PURPOSE: Student accepts parent relationship
 * LOGIC:
 * 1. Verify request belongs to this student
 * 2. Verify request is not already verified
 * 3. Update is_verified = 1
 * 4. Set verified_by and verified_at
 */
export const acceptRequest = async (req, res) => {
    try {
        const childId = req.user.id;
        const { requestId } = req.params;

        // Get request details
        const [requests] = await db.execute(`
            SELECT pcr.*, u.full_name as parent_name
            FROM parent_child_relationship pcr
            JOIN user u ON pcr.parent_id = u.id
            WHERE pcr.id = ?
        `, [requestId]);

        if (requests.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Relationship request not found'
            });
        }

        const request = requests[0];

        // Verify this request is for current student
        if (request.child_id !== childId) {
            return res.status(403).json({
                success: false,
                message: 'This request is not for you'
            });
        }

        // Check if already verified
        if (request.is_verified) {
            return res.status(400).json({
                success: false,
                message: 'Relationship already accepted'
            });
        }

        // Accept the request
        await db.execute(`
            UPDATE parent_child_relationship
            SET is_verified = 1,
                verified_by = ?,
                verified_at = NOW()
            WHERE id = ?
        `, [childId, requestId]);
const [student] = await db.execute(`
  SELECT full_name FROM user WHERE id = ?
`, [childId]);

await notifyUser(request.parent_id, {
  type: 'system',
  title: 'Relationship Accepted',
  message: `${student[0].full_name} accepted your relationship request`,
  link: `/my-children`,
  icon: '✅'
});
        res.status(200).json({
            success: true,
            message: `Relationship with ${request.parent_name} accepted successfully!`,
            data: {
                requestId,
                parentName: request.parent_name,
                relationshipType: request.relationship_type
            }
        });

    } catch (error) {
        console.error('❌ Error accepting request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to accept request',
            error: error.message
        });
    }
};

/**
 * Reject/Delete parent relationship request
 * @route DELETE /api/parent/reject-request/:requestId
 * @access Private (Students)
 * 
 * PURPOSE: Student rejects parent relationship
 */
export const rejectRequest = async (req, res) => {
    try {
        const childId = req.user.id;
        const { requestId } = req.params;

        // Get request details
        const [requests] = await db.execute(`
            SELECT child_id
            FROM parent_child_relationship
            WHERE id = ?
        `, [requestId]);

        if (requests.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Relationship request not found'
            });
        }

        // Verify this request is for current student
        if (requests[0].child_id !== childId) {
            return res.status(403).json({
                success: false,
                message: 'This request is not for you'
            });
        }
// Before: await db.execute(`DELETE FROM parent_child_relationship...`);

const [request] = await db.execute(`
  SELECT parent_id, p.full_name as parent_name, u.full_name as child_name
  FROM parent_child_relationship pcr
  JOIN user p ON pcr.parent_id = p.id
  JOIN user u ON pcr.child_id = u.id
  WHERE pcr.id = ?
`, [requestId]);

await notifyUser(request[0].parent_id, {
  type: 'system',
  title: 'Relationship Request Declined',
  message: `Your relationship request was not accepted`,
  link: `/parent/my-requests`,
  icon: '❌'
});
        // Delete the request
        await db.execute(`
            DELETE FROM parent_child_relationship
            WHERE id = ?
        `, [requestId]);

        res.status(200).json({
            success: true,
            message: 'Relationship request rejected'
        });

    } catch (error) {
        console.error('❌ Error rejecting request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject request',
            error: error.message
        });
    }
};

/**
 * Get verified children for parent
 * @route GET /api/parent/my-children
 * @access Private (Parents)
 * 
 * PURPOSE: Show parent all their verified children
 */
export const getMyChildren = async (req, res) => {
    try {
        const parentId = req.user.id;

        const [children] = await db.execute(`
            SELECT 
                pcr.id as relationship_id,
                pcr.relationship_type,
                pcr.verified_at,
                u.id as child_id,
                u.full_name as child_name,
                u.email as child_email,
                u.gender as child_gender,
                u.dob,
                COUNT(e.id) as total_enrollments
            FROM parent_child_relationship pcr
            JOIN user u ON pcr.child_id = u.id
            LEFT JOIN enrollment e ON u.id = e.student_id AND e.status = 'active'
            WHERE pcr.parent_id = ?
            AND pcr.is_verified = 1
            GROUP BY pcr.id, u.id
            ORDER BY pcr.verified_at DESC
        `, [parentId]);

        res.status(200).json({
            success: true,
            count: children.length,
            data: children
        });

    } catch (error) {
        console.error('❌ Error fetching children:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch children',
            error: error.message
        });
    }
};