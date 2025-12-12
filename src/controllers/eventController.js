// backend/src/controllers/eventController.js
import db from "../config/db.js";

/**
 * Create a new event
 * Mosque admin only
 * Fundraising events need ministry approval
 */
export const createEvent = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            title,
            description,
            event_date,
            event_time,
            location,
            event_type,
            campaign_id
        } = req.body;

        // Validate required fields
        if (!title || !event_date || !event_type) {
            return res.status(400).json({
                success: false,
                message: "Title, date, and event type are required"
            });
        }

        // Get mosque_id for this admin
        const [adminMosque] = await db.query(
            "SELECT mosque_id FROM ROLE_ASSIGNMENT WHERE user_id = ? AND role_id = (SELECT id FROM ROLE WHERE name = 'mosque_admin') AND is_active = TRUE",
            [userId]
        );

        if (!adminMosque || adminMosque.length === 0) {
            return res.status(403).json({
                success: false,
                message: "You are not assigned to any mosque"
            });
        }

        const mosqueId = adminMosque[0].mosque_id;

        // Determine approval status
        // Fundraising events need ministry approval, others are auto-approved
        const approvalStatus = event_type === 'fundraising' ? 'pending' : 'approved';
        const status = event_type === 'fundraising' ? 'scheduled' : 'scheduled';

        // Insert event
        const [result] = await db.query(`
            INSERT INTO EVENT 
            (mosque_id, title, description, event_date, event_time, location, 
             event_type, status, approval_status, campaign_id, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            mosqueId,
            title,
            description,
            event_date,
            event_time || null,
            location || null,
            event_type,
            status,
            approvalStatus,
            campaign_id || null,
            userId
        ]);

        res.status(201).json({
            success: true,
            message: event_type === 'fundraising' 
                ? "Event created successfully. Waiting for ministry approval."
                : "Event created and published successfully",
            eventId: result.insertId,
            approval_status: approvalStatus
        });

    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating event',
            error: error.message
        });
    }
};

/**
 * Get all events
 * Users see only approved events from their mosque or all mosques
 */
/**
 * Get all events
 * Regular users see only approved events
 * Ministry admin sees ALL events (including pending), rejected
 */
export const getEvents = async (req, res) => {
    try {
        const userId = req.user.id;
        const { mosque_id, event_type, status, filter } = req.query;

        // Check if user is ministry admin
        const [ministryRole] = await db.query(
            "SELECT 1 FROM ROLE_ASSIGNMENT WHERE user_id = ? AND role_id = (SELECT id FROM ROLE WHERE name = 'ministry_admin') AND is_active = TRUE",
            [userId]
        );
        const isMinistryAdmin = ministryRole && ministryRole.length > 0;

        let query = `
            SELECT 
                e.*,
                m.name as mosque_name,
                u.full_name as creator_name,
                (SELECT COUNT(*) FROM EVENT_LIKE WHERE event_id = e.id) as likes_count,
                (SELECT COUNT(*) FROM EVENT_RSVP WHERE event_id = e.id AND status = 'going') as going_count,
                (SELECT COUNT(*) FROM EVENT_RSVP WHERE event_id = e.id AND status = 'not_going') as not_going_count,
                (SELECT COUNT(*) FROM EVENT_RSVP WHERE event_id = e.id AND status = 'maybe') as maybe_count,
                (SELECT COUNT(*) FROM EVENT_COMMENT WHERE event_id = e.id) as comments_count,
                EXISTS(SELECT 1 FROM EVENT_LIKE WHERE event_id = e.id AND user_id = ?) as user_liked,
                (SELECT status FROM EVENT_RSVP WHERE event_id = e.id AND user_id = ?) as user_rsvp
            FROM EVENT e
            JOIN MOSQUE m ON e.mosque_id = m.id
            JOIN USER u ON e.created_by = u.id
            WHERE 1=1
        `;

        const params = [userId, userId];

        // CRITICAL FIX: Ministry admin sees ALL events, others see only approved
        if (!isMinistryAdmin) {
            query += " AND e.approval_status = 'approved'";
        }

        // Apply my_mosque filter
        if (filter === 'my_mosque') {
            const [adminMosque] = await db.query(
                "SELECT mosque_id FROM ROLE_ASSIGNMENT WHERE user_id = ? AND role_id = (SELECT id FROM ROLE WHERE name = 'mosque_admin') AND is_active = TRUE",
                [userId]
            );
            
            if (adminMosque && adminMosque.length > 0) {
                query += " AND e.mosque_id = ?";
                params.push(adminMosque[0].mosque_id);
            }
        }

        if (mosque_id) {
            query += " AND e.mosque_id = ?";
            params.push(mosque_id);
        }

        if (event_type) {
            query += " AND e.event_type = ?";
            params.push(event_type);
        }

        if (status) {
            query += " AND e.status = ?";
            params.push(status);
        }

        query += " ORDER BY e.event_date DESC, e.created_at DESC";

        console.log('=== GET EVENTS ===');
        console.log('User ID:', userId);
        console.log('Is Ministry Admin:', isMinistryAdmin);
        console.log('Query params:', { mosque_id, event_type, status, filter });

        const [events] = await db.query(query, params);
 
        console.log('Events found:', events.length);
        if (event_type === 'fundraising') {
            console.log('Fundraising events:', events.map(e => ({
                id: e.id,
                title: e.title,
                approval_status: e.approval_status
            })));
        }

        res.json({
            success: true,
            count: events.length,
            events
        });

    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching events',
            error: error.message
        });
    }
};

/**
 * Get single event with full details
 */
export const getEventById = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        const [events] = await db.query(`
            SELECT 
                e.*,
                m.name as mosque_name,
                m.contact_number as mosque_contact,
                u.full_name as creator_name,
                EXISTS(SELECT 1 FROM EVENT_LIKE WHERE event_id = e.id AND user_id = ?) as user_liked,
                (SELECT status FROM EVENT_RSVP WHERE event_id = e.id AND user_id = ?) as user_rsvp
            FROM EVENT e
            JOIN MOSQUE m ON e.mosque_id = m.id
            JOIN USER u ON e.created_by = u.id
            WHERE e.id = ?
        `, [userId, userId, eventId]);

        if (events.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        const event = events[0];

        // Get likes
        const [likes] = await db.query(`
            SELECT u.id, u.full_name, el.created_at
            FROM EVENT_LIKE el
            JOIN USER u ON el.user_id = u.id
            WHERE el.event_id = ?
            ORDER BY el.created_at DESC
        `, [eventId]);

        // Get RSVPs
        const [rsvps] = await db.query(`
            SELECT 
                er.status,
                u.id as user_id,
                u.full_name,
                er.created_at
            FROM EVENT_RSVP er
            JOIN USER u ON er.user_id = u.id
            WHERE er.event_id = ?
            ORDER BY er.created_at DESC
        `, [eventId]);

        // Get comments
        const [comments] = await db.query(`
            SELECT 
                ec.id,
                ec.comment,
                ec.created_at,
                ec.user_id,
                u.full_name as user_name
            FROM EVENT_COMMENT ec
            JOIN USER u ON ec.user_id = u.id
            WHERE ec.event_id = ?
            ORDER BY ec.created_at DESC
        `, [eventId]);

        res.json({
            success: true,
            event: {
                ...event,
                likes_count: likes.length,
                likes,
                rsvps: {
                    going: rsvps.filter(r => r.status === 'going'),
                    not_going: rsvps.filter(r => r.status === 'not_going'),
                    maybe: rsvps.filter(r => r.status === 'maybe')
                },
                comments_count: comments.length,
                comments
            }
        });

    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching event',
            error: error.message
        });
    }
};

/**
 * Update event
 * Mosque admin only, can only update their mosque's events
 */
export const updateEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;
        const updates = req.body;

        // Check if user owns this event
        const [event] = await db.query(`
            SELECT e.*, ra.mosque_id as admin_mosque_id
            FROM EVENT e
            JOIN ROLE_ASSIGNMENT ra ON ra.user_id = ? 
                AND ra.role_id = (SELECT id FROM ROLE WHERE name = 'mosque_admin')
                AND ra.is_active = TRUE
            WHERE e.id = ?
        `, [userId, eventId]);

        if (event.length === 0 || event[0].mosque_id !== event[0].admin_mosque_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only update events from your mosque'
            });
        }

        // Build update query
        const fields = [];
        const values = [];

        if (updates.title) {
            fields.push('title = ?');
            values.push(updates.title);
        }
        if (updates.description) {
            fields.push('description = ?');
            values.push(updates.description);
        }
        if (updates.event_date) {
            fields.push('event_date = ?');
            values.push(updates.event_date);
        }
        if (updates.event_time) {
            fields.push('event_time = ?');
            values.push(updates.event_time);
        }
        if (updates.location) {
            fields.push('location = ?');
            values.push(updates.location);
        }
        if (updates.status) {
            fields.push('status = ?');
            values.push(updates.status);
        }

        values.push(eventId);

        await db.query(
            `UPDATE EVENT SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        res.json({
            success: true,
            message: 'Event updated successfully'
        });

    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating event',
            error: error.message
        });
    }
};

/**
 * Delete event
 * Mosque admin only
 */
export const deleteEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        // Check ownership
        const [event] = await db.query(`
            SELECT e.*, ra.mosque_id as admin_mosque_id
            FROM EVENT e
            JOIN ROLE_ASSIGNMENT ra ON ra.user_id = ? 
                AND ra.role_id = (SELECT id FROM ROLE WHERE name = 'mosque_admin')
                AND ra.is_active = TRUE
            WHERE e.id = ?
        `, [userId, eventId]);

        if (event.length === 0 || event[0].mosque_id !== event[0].admin_mosque_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete events from your mosque'
            });
        }

        await db.query("DELETE FROM EVENT WHERE id = ?", [eventId]);

        res.json({
            success: true,
            message: 'Event deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting event',
            error: error.message
        });
    }
};

/**
 * Approve event (Ministry admin only)
 */
/**
 * Approve event (Ministry admin only)
 */
export const approveEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        
        console.log('=== APPROVE EVENT ===');
        console.log('Event ID:', eventId);
        
        // Check BEFORE
        const [before] = await db.query(
            'SELECT id, title, approval_status FROM EVENT WHERE id = ?',
            [eventId]
        );
        console.log('BEFORE:', before[0]);
        
        // Simple UPDATE - only approval_status
        const [result] = await db.query(
            'UPDATE EVENT SET approval_status = ? WHERE id = ?',
            ['approved', eventId]
        );
        
        console.log('UPDATE RESULT:', {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        });
        
        // Check AFTER
        const [after] = await db.query(
            'SELECT id, title, approval_status FROM EVENT WHERE id = ?',
            [eventId]
        );
        console.log('AFTER:', after[0]);
        
        if (after[0].approval_status === 'approved') {
            console.log(' SUCCESS: Event approved!');
            res.json({
                success: true,
                message: 'Event approved successfully'
            });
        } else {
            console.log(' FAILED: Status did not change');
            res.json({
                success: false,
                message: 'Failed to approve event'
            });
        }
        
    } catch (error) {
        console.error('ERROR approving event:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving event',
            error: error.message
        });
    }
};

/**
 * Reject event (Ministry admin only)
 * WITH DEBUG LOGS
 */
export const rejectEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const { reason } = req.body;
        
        console.log('=== REJECT EVENT ===');
        console.log('Event ID:', eventId);
        console.log('Reason:', reason);
        
        // Check BEFORE
        const [before] = await db.query(
            'SELECT id, approval_status, rejection_reason FROM EVENT WHERE id = ?',
            [eventId]
        );
        console.log('BEFORE:', before[0]);
        
        // UPDATE only columns that exist
        const [result] = await db.query(`
            UPDATE EVENT 
            SET approval_status = ?,
                rejection_reason = ?
            WHERE id = ?
        `, ['rejected', reason, eventId]);
        
        console.log('UPDATE RESULT:', {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        });
        
        // Check AFTER
        const [after] = await db.query(
            'SELECT id, approval_status, rejection_reason FROM EVENT WHERE id = ?',
            [eventId]
        );
        console.log('AFTER:', after[0]);
        
        if (after[0].approval_status === 'rejected') {
            console.log(' SUCCESS: Event rejected!');
            res.json({
                success: true,
                message: 'Event rejected'
            });
        } else {
            console.log(' FAILED: Status did not change');
            res.json({
                success: false,
                message: 'Failed to update status'
            });
        }
        
    } catch (error) {
        console.error('ERROR:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};
/**
 * Like event
 */
export const likeEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        await db.query(
            "INSERT IGNORE INTO EVENT_LIKE (event_id, user_id) VALUES (?, ?)",
            [eventId, userId]
        );

        const [count] = await db.query(
            "SELECT COUNT(*) as likes_count FROM EVENT_LIKE WHERE event_id = ?",
            [eventId]
        );

        res.json({
            success: true,
            message: 'Event liked',
            likes_count: count[0].likes_count
        });

    } catch (error) {
        console.error('Error liking event:', error);
        res.status(500).json({
            success: false,
            message: 'Error liking event',
            error: error.message
        });
    }
};

/**
 * Unlike event
 */
export const unlikeEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        await db.query(
            "DELETE FROM EVENT_LIKE WHERE event_id = ? AND user_id = ?",
            [eventId, userId]
        );

        const [count] = await db.query(
            "SELECT COUNT(*) as likes_count FROM EVENT_LIKE WHERE event_id = ?",
            [eventId]
        );

        res.json({
            success: true,
            message: 'Event unliked',
            likes_count: count[0].likes_count
        });

    } catch (error) {
        console.error('Error unliking event:', error);
        res.status(500).json({
            success: false,
            message: 'Error unliking event',
            error: error.message
        });
    }
};

/**
 * RSVP to event
 */
export const rsvpEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;
        const { status } = req.body; // 'going', 'not_going', 'maybe'

        if (!['going', 'not_going', 'maybe'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid RSVP status'
            });
        }

        await db.query(`
            INSERT INTO EVENT_RSVP (event_id, user_id, status)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE status = VALUES(status)
        `, [eventId, userId, status]);

        // Get updated counts
        const [counts] = await db.query(`
            SELECT 
                SUM(CASE WHEN status = 'going' THEN 1 ELSE 0 END) as going_count,
                SUM(CASE WHEN status = 'not_going' THEN 1 ELSE 0 END) as not_going_count,
                SUM(CASE WHEN status = 'maybe' THEN 1 ELSE 0 END) as maybe_count
            FROM EVENT_RSVP
            WHERE event_id = ?
        `, [eventId]);

        res.json({
            success: true,
            message: 'RSVP updated',
            rsvp_status: status,
            counts: counts[0]
        });

    } catch (error) {
        console.error('Error updating RSVP:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating RSVP',
            error: error.message
        });
    }
};

/**
 * Comment on event
 */
export const commentOnEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;
        const { comment } = req.body;

        if (!comment || comment.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Comment cannot be empty'
            });
        }

        const [result] = await db.query(
            "INSERT INTO EVENT_COMMENT (event_id, user_id, comment) VALUES (?, ?, ?)",
            [eventId, userId, comment]
        );

        const [newComment] = await db.query(`
            SELECT 
                ec.id,
                ec.comment,
                ec.created_at,
                ec.user_id,
                u.full_name as user_name
            FROM EVENT_COMMENT ec
            JOIN USER u ON ec.user_id = u.id
            WHERE ec.id = ?
        `, [result.insertId]);

        res.json({
            success: true,
            message: 'Comment added',
            comment: newComment[0]
        });

    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding comment',
            error: error.message
        });
    }
};

/**
 * Delete comment
 */
export const deleteComment = async (req, res) => {
    try {
        const commentId = req.params.commentId;
        const userId = req.user.id;

        // Check if user owns the comment
        const [comment] = await db.query(
            "SELECT * FROM EVENT_COMMENT WHERE id = ? AND user_id = ?",
            [commentId, userId]
        );

        if (comment.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own comments'
            });
        }

        await db.query("DELETE FROM EVENT_COMMENT WHERE id = ?", [commentId]);

        res.json({
            success: true,
            message: 'Comment deleted'
        });

    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting comment',
            error: error.message
        });
    }
};

/**
 * Get event statistics
 */
export const getEventStats = async (req, res) => {
    try {
        const eventId = req.params.id;

        const [stats] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM EVENT_LIKE WHERE event_id = ?) as likes_count,
                (SELECT COUNT(*) FROM EVENT_RSVP WHERE event_id = ? AND status = 'going') as going_count,
                (SELECT COUNT(*) FROM EVENT_RSVP WHERE event_id = ? AND status = 'not_going') as not_going_count,
                (SELECT COUNT(*) FROM EVENT_RSVP WHERE event_id = ? AND status = 'maybe') as maybe_count,
                (SELECT COUNT(*) FROM EVENT_COMMENT WHERE event_id = ?) as comments_count
        `, [eventId, eventId, eventId, eventId, eventId]);

        res.json({
            success: true,
            stats: stats[0]
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stats',
            error: error.message
        });
    }
};
/**
/**
 * Get event interactions for mosque admins
 * CORRECT: Column is named "phone" not "phone_number"
 */
export const getEventInteractions = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        console.log('=== GET INTERACTIONS ===');
        console.log('Event ID:', eventId);
        console.log('User ID:', userId);

        // Check if event exists
        const [events] = await db.query('SELECT * FROM EVENT WHERE id = ?', [eventId]);
        
        if (!events || events.length === 0) {
            console.log('Event not found');
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        const event = events[0];
        console.log('Event found:', event.title);
        console.log('Created by:', event.created_by);

        // Check if user is the creator
        if (event.created_by !== userId) {
            console.log('Permission denied: Not the creator');
            return res.status(403).json({
                success: false,
                message: 'You can only view interactions for events you created'
            });
        }

        console.log('Permission granted: User is creator');

        // Get all likes with user details
        console.log('Fetching likes...');
        const [likes] = await db.query(`
            SELECT 
                u.id,
                u.full_name,
                u.email,
                u.phone as phone_number,
                el.created_at
            FROM EVENT_LIKE el
            JOIN USER u ON el.user_id = u.id
            WHERE el.event_id = ?
            ORDER BY el.created_at DESC
        `, [eventId]);
        console.log('Likes found:', likes.length);

        // Get all RSVPs with user details
        console.log('Fetching RSVPs...');
        const [rsvps] = await db.query(`
            SELECT 
                er.status,
                u.id as user_id,
                u.full_name,
                u.email,
                u.phone as phone_number,
                er.created_at
            FROM EVENT_RSVP er
            JOIN USER u ON er.user_id = u.id
            WHERE er.event_id = ?
            ORDER BY er.created_at DESC
        `, [eventId]);
        console.log('RSVPs found:', rsvps.length);

        // Get all comments with user details
        console.log('Fetching comments...');
        const [comments] = await db.query(`
            SELECT 
                ec.id,
                ec.comment,
                ec.created_at,
                u.id as user_id,
                u.full_name,
                u.email,
                u.phone as phone_number
            FROM EVENT_COMMENT ec
            JOIN USER u ON ec.user_id = u.id
            WHERE ec.event_id = ?
            ORDER BY ec.created_at DESC
        `, [eventId]);
        console.log('Comments found:', comments.length);

        const response = {
            success: true,
            interactions: {
                likes: {
                    count: likes.length,
                    users: likes
                },
                rsvps: {
                    going: rsvps.filter(r => r.status === 'going'),
                    maybe: rsvps.filter(r => r.status === 'maybe'),
                    not_going: rsvps.filter(r => r.status === 'not_going'),
                    total_count: rsvps.length
                },
                comments: {
                    count: comments.length,
                    list: comments
                }
            }
        };

        console.log('SUCCESS! Sending response with counts:', {
            likes: likes.length,
            rsvps: rsvps.length,
            comments: comments.length
        });
        
        res.json(response);

    } catch (error) {
        console.error('=== ERROR IN getEventInteractions ===');
        console.error('Error:', error);
        console.error('Stack:', error.stack);
        
        res.status(500).json({
            success: false,
            message: 'Error fetching event interactions',
            error: error.message
        });
    }
};