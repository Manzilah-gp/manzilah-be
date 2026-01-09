// backend/controllers/profileController.js
import db from "../config/db.js";

/**
 * Get complete user profile with role-specific data
 */
export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Get basic user info
        const [userRows] = await db.query(`
            SELECT 
                id, full_name, email, phone, gender, dob, 
                created_at, updated_at
            FROM USER 
            WHERE id = ?
        `, [userId]);

        if (userRows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = userRows[0];

        // 2. Get user location
        const [locationRows] = await db.query(`
            SELECT governorate, region, address_line1, address_line2, 
                   postal_code, latitude, longitude
            FROM USER_LOCATION 
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        `, [userId]);

        user.location = locationRows[0] || null;

        // 3. Get all user roles
        const [roleRows] = await db.query(`
            SELECT r.name, ra.mosque_id, ra.is_active
            FROM ROLE_ASSIGNMENT ra
            JOIN ROLE r ON ra.role_id = r.id
            WHERE ra.user_id = ?
        `, [userId]);

        user.roles = roleRows.map(r => r.name);
        user.activeRoles = roleRows.filter(r => r.is_active).map(r => r.name);

        // 4. Get role-specific data
        const roleSpecificData = {};

        // Check each role and get data
        for (const roleRow of roleRows) {
            if (!roleRow.is_active) continue;

            switch (roleRow.name) {
                case 'student':
                    roleSpecificData.student = await getStudentData(userId);
                    break;
                case 'teacher':
                    roleSpecificData.teacher = await getTeacherData(userId);
                    break;
                case 'parent':
                    roleSpecificData.parent = await getParentData(userId);
                    break;
                case 'donor':
                    roleSpecificData.donor = await getDonorData(userId);
                    break;
                case 'mosque_admin':
                    roleSpecificData.mosque_admin = await getMosqueAdminData(userId);
                    break;
                case 'ministry_admin':
                    roleSpecificData.ministry_admin = await getMinistryAdminData(userId);
                    break;
            }
        }

        res.json({
            success: true,
            user,
            roleSpecificData
        });

    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: error.message
        });
    }
};

/**
 * Update user basic information
 */
export const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name, email, phone, dob, gender } = req.body;

        // Validate required fields
        if (!full_name || !email || !dob || !gender) {
            return res.status(400).json({
                success: false,
                message: "Full name, email, date of birth, and gender are required"
            });
        }

        // Check if email is already taken by another user
        const [existingUser] = await db.query(
            "SELECT id FROM USER WHERE email = ? AND id != ?",
            [email, userId]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already exists"
            });
        }

        // Update user
        await db.query(`
            UPDATE USER 
            SET full_name = ?, email = ?, phone = ?, dob = ?, gender = ?
            WHERE id = ?
        `, [full_name, email, phone, dob, gender, userId]);

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message
        });
    }
};

/**
 * Update user location
 */
export const updateUserLocation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { governorate, region, address_line1, address_line2, postal_code } = req.body;

        // Check if location exists
        const [existingLocation] = await db.query(
            "SELECT id FROM USER_LOCATION WHERE user_id = ?",
            [userId]
        );

        if (existingLocation.length > 0) {
            // Update existing location
            await db.query(`
                UPDATE USER_LOCATION 
                SET governorate = ?, region = ?, address_line1 = ?, 
                    address_line2 = ?, postal_code = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `, [governorate, region, address_line1, address_line2, postal_code, userId]);
        } else {
            // Insert new location
            await db.query(`
                INSERT INTO USER_LOCATION 
                (user_id, governorate, region, address_line1, address_line2, postal_code)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [userId, governorate, region, address_line1, address_line2, postal_code]);
        }

        res.json({
            success: true,
            message: 'Location updated successfully'
        });

    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating location',
            error: error.message
        });
    }
};

// ============================================
// HELPER FUNCTIONS FOR ROLE-SPECIFIC DATA
// ============================================

async function getStudentData(userId) {
    try {
        const [enrollments] = await db.query(`
            SELECT 
                e.id as enrollment_id,
                c.name as course_name,
                ct.name as course_type,
                u.full_name as teacher_name,
                c.course_level,
                e.enrollment_date,
                e.status,
                COALESCE(
                    (SELECT AVG(sp.completion_percentage) 
                     FROM STUDENT_PROGRESS sp 
                     WHERE sp.enrollment_id = e.id), 0
                ) as progress
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            LEFT JOIN USER u ON c.teacher_id = u.id
            WHERE e.student_id = ?
        `, [userId]);

        return {
            enrollments,
            attendance_rate: 0,  // ← Set to 0 since ATTENDANCE table doesn't exist
            total_sessions: 0,
            sessions_attended: 0,
        };
    } catch (error) {
        console.error('Error getting student data:', error);
        return null;
    }
}

async function getTeacherData(userId) {
    try {
        // Get certifications
        const [certifications] = await db.query(`
            SELECT 
                has_tajweed_certificate,
                has_sharea_certificate,
                tajweed_certificate_url,
                sharea_certificate_url
            FROM TEACHER_CERTIFICATION
            WHERE user_id = ?
        `, [userId]);

        // Get expertise WITH years_experience
        const [expertise] = await db.query(`
            SELECT 
                ct.name as course_type,
                te.hourly_rate_cents,
                te.is_memorization_selected,
                te.years_experience,
                ml.level_name as max_level
            FROM TEACHER_EXPERTISE te
            JOIN COURSE_TYPE ct ON te.course_type_id = ct.id
            LEFT JOIN MEMORIZATION_LEVEL ml ON te.max_mem_level_id = ml.id
            WHERE te.teacher_id = ?
        `, [userId]);

        // Get availability
        const [availability] = await db.query(`
            SELECT day_of_week, start_time, end_time
            FROM TEACHER_AVAILABILITY
            WHERE teacher_id = ?
            ORDER BY 
                FIELD(day_of_week, 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')
        `, [userId]);

        // Get current students
        const [studentCount] = await db.query(`
            SELECT COUNT(DISTINCT e.student_id) as current_students
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            WHERE c.teacher_id = ? AND e.status = 'active'
        `, [userId]);

        // Get completed courses
        const [completedCourses] = await db.query(`
            SELECT COUNT(*) as completed_courses
            FROM ENROLLMENT e
            JOIN COURSE c ON e.course_id = c.id
            WHERE c.teacher_id = ? AND e.status = 'completed'
        `, [userId]);



        // Calculate max years_experience
        const maxExperience = expertise.length > 0
            ? Math.max(...expertise.map(e => e.years_experience || 0))
            : 0;

        return {
            certifications: {
                ...(certifications[0] || {}),
                experience_years: maxExperience
            },
            expertise,
            availability,
            current_students: studentCount[0]?.current_students || 0,
            completed_courses: completedCourses[0]?.completed_courses || 0,

        };
    } catch (error) {
        console.error('Error getting teacher data:', error);
        if (error.sqlMessage) console.error('SQL Error Message:', error.sqlMessage);
        return null;
    }
}

async function getParentData(userId) {
    try {
        const [children] = await db.query(`
            SELECT 
                u.id,
                u.full_name as name,
                TIMESTAMPDIFF(YEAR, u.dob, CURDATE()) as age,
                COUNT(DISTINCT e.course_id) as courses,
                COALESCE(
                    AVG(
                        (SELECT AVG(sp.completion_percentage) 
                         FROM STUDENT_PROGRESS sp 
                         WHERE sp.enrollment_id = e.id)
                    ), 0
                ) as progress
            FROM PARENT_CHILD_RELATIONSHIP pcr
            JOIN USER u ON pcr.child_id = u.id
            LEFT JOIN ENROLLMENT e ON u.id = e.student_id AND e.status = 'active'
            WHERE pcr.parent_id = ? AND pcr.is_verified = TRUE
            GROUP BY u.id, u.full_name, u.dob
        `, [userId]);

        return {
            children: children.map(child => ({
                ...child,
                progress: Math.round(child.progress)
            }))
        };
    } catch (error) {
        console.error('Error getting parent data:', error);
        return null;
    }
}

async function getDonorData(userId) {
    try {
        // Get donation stats
        const [donationStats] = await db.query(`
            SELECT 
                SUM(d.amount_cents) as total_donated_cents,
                COUNT(DISTINCT d.campaign_id) as campaigns_supported,
                MAX(d.created_at) as last_donation_date
            FROM DONATION d
            WHERE d.donor_id = ?
        `, [userId]);

        // Get recent donations
        const [recentDonations] = await db.query(`
            SELECT 
                dc.title as campaign_title,
                d.amount_cents,
                d.created_at,
                d.is_anonymous
            FROM DONATION d
            JOIN DONATION_CAMPAIGN dc ON d.campaign_id = dc.id
            WHERE d.donor_id = ?
            ORDER BY d.created_at DESC
            LIMIT 5
        `, [userId]);

        return {
            total_donated_cents: donationStats[0]?.total_donated_cents || 0,
            campaigns_supported: donationStats[0]?.campaigns_supported || 0,
            last_donation_date: donationStats[0]?.last_donation_date || null,
            recent_donations: recentDonations
        };
    } catch (error) {
        console.error('Error getting donor data:', error);
        return null;
    }
}

async function getMosqueAdminData(userId) {
    try {
        const [mosques] = await db.query(`
            SELECT 
                m.id,
                m.name,
                m.contact_number,
                ml.governorate,
                ml.region,
                COUNT(DISTINCT c.id) as total_courses,
                COUNT(DISTINCT e.student_id) as total_students
            FROM MOSQUE m
            LEFT JOIN MOSQUE_LOCATION ml ON m.id = ml.mosque_id
            LEFT JOIN COURSE c ON m.id = c.mosque_id AND c.is_active = TRUE
            LEFT JOIN ENROLLMENT e ON c.id = e.course_id AND e.status = 'active'
            WHERE m.mosque_admin_id = ?
            GROUP BY m.id, m.name, m.contact_number, ml.governorate, ml.region
        `, [userId]);

        return { mosques };
    } catch (error) {
        console.error('Error getting mosque admin data:', error);
        return null;
    }
}

async function getMinistryAdminData(userId) {
    try {
        // Get system-wide stats
        const [stats] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM MOSQUE) as total_mosques,
                (SELECT COUNT(*) FROM COURSE WHERE is_active = TRUE) as total_courses,
                (SELECT COUNT(*) FROM ENROLLMENT WHERE status = 'active') as active_enrollments
        `);

        return {
            system_stats: stats[0] || {}
        };
    } catch (error) {
        console.error('Error getting ministry admin data:', error);
        return null;
    }
}