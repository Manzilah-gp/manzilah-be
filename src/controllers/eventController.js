// backend/src/controllers/eventController.js
import db from "../config/db.js";
import { notifyUser } from './firebaseNotificationController.js'; 

/**
 * Create a new event
 * Mosque admin only
 * Fundraising events need ministry approval
 */
export const createEvent = async (req, res) => {
  try {
    const user_id = req.user.id;
    
    console.log('📥 Raw request body:', req.body);
    
    // ✅ FLEXIBLE: Accept either naming convention from frontend
    const {
      title,
      description,
      event_date,
      event_time,
      location,
      event_type,
      show_donors,
      allow_anonymous
    } = req.body;
    
    // ✅ Handle both possible field names from frontend
    const fundraising_goal = req.body.fundraising_goal || req.body.fundraising_goal_cents;
    const min_donation = req.body.min_donation || req.body.min_donation_cents;

    console.log('📥 Parsed values (in dollars):', { fundraising_goal, min_donation });

    // Validate required fields
    if (!title || !description || !event_date || !event_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // ✅ VALIDATE FUNDRAISING - Check DOLLARS (not cents)
    if (event_type === 'fundraising') {
      if (!fundraising_goal || fundraising_goal < 1) {
        return res.status(400).json({
          success: false,
          message: 'Fundraising goal must be at least $1.00'
        });
      }
      
      if (min_donation && min_donation < 1) {
        return res.status(400).json({
          success: false,
          message: 'Minimum donation must be at least $1.00'
        });
      }

      console.log('✅ Validation passed (dollars):', { fundraising_goal, min_donation });
    }

    // Get mosque_id
    const [mosques] = await db.execute(
      'SELECT id FROM mosque WHERE mosque_admin_id = ?',
      [user_id]
    );

    if (mosques.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You must be a mosque admin to create events'
      });
    }

    const mosque_id = mosques[0].id;

    let query;
    let params;

    if (event_type === 'fundraising') {
      // ✅ NOW CONVERT TO CENTS (Backend conversion)
      const fundraising_goal_cents = Math.round(fundraising_goal * 100);
      const min_donation_cents = Math.round((min_donation || 10) * 100);

      console.log('💰 Converted to cents:', { 
        fundraising_goal_cents, 
        min_donation_cents 
      });

      query = `
        INSERT INTO event (
          mosque_id, created_by, title, description, event_date, event_time,
          location, event_type,
          fundraising_goal_cents, min_donation_cents, current_donations_cents,
          show_donors, allow_anonymous,
          status, approval_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'scheduled', 'pending')
      `;

      params = [
        mosque_id,
        user_id,
        title,
        description,
        event_date,
        event_time || null,
        location || null,
        event_type,
        fundraising_goal_cents,      // ✅ Saved as cents
        min_donation_cents,           // ✅ Saved as cents
        show_donors !== false ? 1 : 0,
        allow_anonymous !== false ? 1 : 0
      ];
    } else {
      query = `
        INSERT INTO event (
          mosque_id, created_by, title, description, event_date, event_time,
          location, event_type, status, approval_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', 'approved')
      `;

      params = [
        mosque_id,
        user_id,
        title,
        description,
        event_date,
        event_time || null,
        location || null,
        event_type
      ];
    }

    console.log('🔍 Executing query...');
    const [result] = await db.execute(query, params);

    console.log('✅ Event created with ID:', result.insertId);

    const [events] = await db.execute(
      'SELECT * FROM event WHERE id = ?',
      [result.insertId]
    );
// After event is created

// Get all active students at this mosque
const [students] = await db.execute(`
  SELECT DISTINCT e.student_id, u.full_name
  FROM enrollment e
  JOIN course c ON e.course_id = c.id
  JOIN user u ON e.student_id = u.id
  WHERE c.mosque_id = ?
    AND e.status = 'active'
`, [mosque_id]);

for (const student of students) {
  await notifyUser(student.student_id, {
    type: 'system',
    title: 'New Event',
    message: `${title } - ${event_date}`,
    link: `/events/${result.insertId}`,
    icon: '📅'
  });
}
    res.json({
      success: true,
      message: 'Event created successfully',
      event: events[0],
      approval_status: events[0].approval_status
    });

  } catch (error) {
    console.error('❌ Error creating event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event',
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

        // Check if user is mosque admin
const [mosqueAdminRole] = await db.query(
    "SELECT mosque_id FROM ROLE_ASSIGNMENT WHERE user_id = ? AND role_id = (SELECT id FROM ROLE WHERE name = 'mosque_admin') AND is_active = TRUE",
    [userId]
);
const isMosqueAdmin = mosqueAdminRole && mosqueAdminRole.length > 0;

// Ministry admin sees ALL events
// Mosque admin sees approved events + their own mosque's rejected events
// Regular users see only approved events
if (!isMinistryAdmin) {
    if (isMosqueAdmin) {
        // Mosque admin sees approved + their mosque's rejected events
        query += " AND (e.approval_status = 'approved' OR (e.approval_status = 'rejected' AND e.mosque_id = ?))";
        params.push(mosqueAdminRole[0].mosque_id);
    } else {
        // Regular users see only approved
        query += " AND e.approval_status = 'approved'";
    }
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
 * UPDATED: Allows resetting approval_status for resubmission
 */
export const updateEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;
        const updates = req.body;

        console.log('=== UPDATE EVENT ===');
        console.log('Event ID:', eventId);
        console.log('User ID:', userId);
        console.log('Updates:', updates);

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

        console.log('Event found:', event[0].title);
        console.log('Current status:', event[0].approval_status);

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
        if (updates.event_time !== undefined) {
            fields.push('event_time = ?');
            values.push(updates.event_time);
        }
        if (updates.location !== undefined) {
            fields.push('location = ?');
            values.push(updates.location);
        }
        if (updates.status) {
            fields.push('status = ?');
            values.push(updates.status);
        }
        if (updates.event_type) {
            fields.push('event_type = ?');
            values.push(updates.event_type);
        }

        // IMPORTANT: Allow updating approval_status (for resubmission)
        if (updates.approval_status) {
            fields.push('approval_status = ?');
            values.push(updates.approval_status);
            
            // Clear rejection reason when resubmitting
            if (updates.approval_status === 'pending') {
                fields.push('rejection_reason = NULL');
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(eventId);

        const query = `UPDATE EVENT SET ${fields.join(', ')} WHERE id = ?`;
        console.log('Update query:', query);
        console.log('Values:', values);

        const [result] = await db.query(query, values);

        console.log('Update result:', {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        });

        // Get updated event
        const [updatedEvent] = await db.query(
            'SELECT id, title, approval_status, event_type FROM EVENT WHERE id = ?',
            [eventId]
        );

        console.log('Updated event:', updatedEvent[0]);

        res.json({
            success: true,
            message: 'Event updated successfully',
            event: updatedEvent[0]
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
// Function to add the Events marked (going)to the user calender
export const getUserCalendarEvents = async (req, res) => {
    try {
        const userId = req.user.id;

        console.log('========================================');
        console.log('=== GET USER CALENDAR EVENTS ===');
        console.log('User ID:', userId);

        const [events] = await db.query(`
            SELECT 
                e.id,
                e.title,
                e.description,
                e.event_date,
                e.event_time,
                e.location,
                e.event_type,
                m.name as mosque_name
            FROM EVENT e
            JOIN MOSQUE m ON e.mosque_id = m.id
            JOIN EVENT_RSVP er ON er.event_id = e.id
            WHERE er.user_id = ?
              AND er.status = 'going'
              AND e.approval_status = 'approved'
            ORDER BY e.event_date ASC
        `, [userId]);

        console.log('Events found:', events.length);
        if (events.length > 0) {
            console.log('First event:', events[0]);
        }
        console.log('========================================');

        res.json({
            success: true,
            count: events.length,
            events: events
        });

    } catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching calendar events',
            error: error.message
        });
    }
};

// Add this function to your eventController.js

export const getMyMosqueEvents = async (req, res) => {
  try {
    const user_id = req.user.id;
    
    // Get the mosque_id where this user is the admin
    const [mosques] = await db.execute(
      'SELECT id FROM mosque WHERE mosque_admin_id = ?',
      [user_id]
    );

    if (mosques.length === 0) {
      return res.json({
        success: true,
        events: [],
        message: 'No mosque found for this admin'
      });
    }

    const mosque_id = mosques[0].id;

    // Get all events for this mosque with aggregated data
    const [events] = await db.execute(`
      SELECT 
        e.*,
        m.name as mosque_name,
        COUNT(DISTINCT el.user_id) as likes_count,
        COUNT(DISTINCT CASE WHEN er.status = 'going' THEN er.user_id END) as going_count,
        COUNT(DISTINCT CASE WHEN er.status = 'maybe' THEN er.user_id END) as maybe_count,
        COUNT(DISTINCT CASE WHEN er.status = 'not_going' THEN er.user_id END) as not_going_count,
        COUNT(DISTINCT er.user_id) as rsvp_count,
        COUNT(DISTINCT ec.id) as comments_count,
        COALESCE(e.current_donations_cents, 0) as current_donations_cents,
        COALESCE(e.fundraising_goal_cents, 0) as fundraising_goal_cents
      FROM event e
      LEFT JOIN mosque m ON e.mosque_id = m.id
      LEFT JOIN event_like el ON e.id = el.event_id
      LEFT JOIN event_rsvp er ON e.id = er.event_id
      LEFT JOIN event_comment ec ON e.id = ec.event_id
      WHERE e.mosque_id = ?
      GROUP BY e.id
      ORDER BY e.event_date DESC
    `, [mosque_id]);

    res.json({
      success: true,
      events: events
    });

  } catch (error) {
    console.error('Error fetching mosque events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
};

// Mark event as completed (Admin only)
export const markEventCompleted = async (req, res) => {
  try {
    const { id } = req.params;  // ✅ Changed from event_id to id
    const user_id = req.user.id;

    console.log('📝 Mark event as completed:', { id, user_id });

    // Get event and verify admin
    const [events] = await db.execute(
      `SELECT e.*, m.mosque_admin_id 
       FROM event e 
       JOIN mosque m ON e.mosque_id = m.id 
       WHERE e.id = ?`,
      [id]  // ✅ Use id here
    );

    if (events.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    const event = events[0];

    // Verify user is the mosque admin
    if (Number(event.mosque_admin_id) !== Number(user_id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only mosque admin can mark events as completed' 
      });
    }

    // Update event status to completed
    await db.execute(
      `UPDATE event 
       SET status = 'completed' 
       WHERE id = ?`,
      [id]  // ✅ Use id here
    );

    console.log('✅ Event marked as completed');

    res.json({
      success: true,
      message: 'Event marked as completed successfully'
    });

  } catch (error) {
    console.error('Error marking event as completed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark event as completed',
      error: error.message 
    });
  }
};

// ============================================
// FILE: BENew/src/controllers/eventController.js
// FEATURE 1: FIXED - Get events from enrolled mosques
// Add these at the end of your existing eventController.js file
// ============================================

/**
 * Get events from mosques where user is enrolled in courses
 * @route GET /api/events/my-enrolled-mosques
 * @access Private (Students/Parents)
 * 
 * PURPOSE: Students/Parents can see events only from mosques where they have enrollments
 * LOGIC: 
 * 1. Find all courses the student is enrolled in
 * 2. Get mosque_ids from those courses
 * 3. Get events from those mosques
 * 4. Return events with mosque and location details
 * 
 * FIXED: 
 * - Removed donation_campaign table references
 * - Gets region/governorate from mosque_location table instead of mosque
 */
/**
 * Get events from mosques where user is enrolled in courses
 * WITH FULL INTERACTION DATA (likes, RSVPs, comments)
 * 
 * Replace this function in your eventController.js
 */
export const getEventsFromEnrolledMosques = async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log('=== GET ENROLLED MOSQUE EVENTS ===');
        console.log('User ID:', userId);
        
        // ✅ FIXED: Now includes ALL interaction data like getEvents()
        const [events] = await db.execute(`
            SELECT DISTINCT
                e.*,
                m.name as mosque_name,
                m.contact_number as mosque_contact,
                ml.region,
                ml.governorate,
                ml.address as mosque_address,
                u.full_name as creator_name,
                -- ✅ ADD INTERACTION COUNTS
                (SELECT COUNT(*) FROM event_like WHERE event_id = e.id) as likes_count,
                (SELECT COUNT(*) FROM event_rsvp WHERE event_id = e.id AND status = 'going') as going_count,
                (SELECT COUNT(*) FROM event_rsvp WHERE event_id = e.id AND status = 'not_going') as not_going_count,
                (SELECT COUNT(*) FROM event_rsvp WHERE event_id = e.id AND status = 'maybe') as maybe_count,
                (SELECT COUNT(*) FROM event_comment WHERE event_id = e.id) as comments_count,
                -- ✅ ADD USER-SPECIFIC INTERACTION STATUS
                EXISTS(SELECT 1 FROM event_like WHERE event_id = e.id AND user_id = ?) as user_liked,
                (SELECT status FROM event_rsvp WHERE event_id = e.id AND user_id = ?) as user_rsvp
            FROM event e
            JOIN mosque m ON e.mosque_id = m.id
            LEFT JOIN mosque_location ml ON m.id = ml.mosque_id
            LEFT JOIN user u ON e.created_by = u.id
            WHERE e.mosque_id IN (
                -- Get mosques where user has active enrollments
                SELECT DISTINCT c.mosque_id
                FROM enrollment en
                JOIN course c ON en.course_id = c.id
                WHERE en.student_id = ?
                AND en.status = 'active'
            )
            AND e.approval_status = 'approved'
            AND e.status != 'cancelled'
            ORDER BY e.event_date DESC, e.event_time DESC
        `, [userId, userId, userId]); // ✅ Three userId params for the subqueries

        console.log('✅ Events found:', events.length);
        if (events.length > 0) {
            console.log('Sample event with interactions:', {
                id: events[0].id,
                title: events[0].title,
                likes_count: events[0].likes_count,
                going_count: events[0].going_count,
                user_liked: events[0].user_liked,
                user_rsvp: events[0].user_rsvp
            });
        }

        res.status(200).json({
            success: true,
            count: events.length,
            data: events // Keep as 'data' to match your existing code
        });

    } catch (error) {
        console.error('❌ Error fetching enrolled mosque events:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch events from enrolled mosques',
            error: error.message
        });
    }
};

/**
 * Get count of events from enrolled mosques
 * @route GET /api/events/my-enrolled-mosques/count
 * @access Private (Students/Parents)
 * 
 * PURPOSE: Show badge count on filter button
 * LOGIC: Same as above but just returns count
 */
export const getEnrolledMosquesEventCount = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [result] = await db.execute(`
            SELECT COUNT(DISTINCT e.id) as event_count
            FROM event e
            WHERE e.mosque_id IN (
                SELECT DISTINCT c.mosque_id
                FROM enrollment en
                JOIN course c ON en.course_id = c.id
                WHERE en.student_id = ?
                AND en.status = 'active'
            )
            AND e.approval_status = 'approved'
            AND e.status != 'cancelled'
        `, [userId]);

        res.status(200).json({
            success: true,
            count: result[0].event_count
        });

    } catch (error) {
        console.error('❌ Error fetching event count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch event count',
            error: error.message
        });
    }
};