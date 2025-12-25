import db from "../config/db.js";

// Helper: Course type colors
const getCourseTypeColor = (courseType) => {
    const colors = {
        'memorization': '#9b59b6',
        'tajweed': '#3498db',
        'feqh': '#2ecc71'
    };
    return colors[courseType?.toLowerCase()] || '#95a5a6';
};

// Helper: Event type colors
const getEventTypeColor = (eventType) => {
    const colors = {
        'religious': '#e67e22',
        'educational': '#3498db',
        'social': '#1abc9c',
        'fundraising': '#e74c3c'
    };
    return colors[eventType?.toLowerCase()] || '#95a5a6';
};

export const calendarModel = {


    /**
     * MOSQUE ADMIN - Get courses + events for their mosque
     */
    async getMosqueAdminSchedule(userId) {
        // Get mosque ID
        const [mosqueRows] = await db.query(
            'SELECT id FROM MOSQUE WHERE mosque_admin_id = ?',
            [userId]
        );

        if (mosqueRows.length === 0) {
            return { courses: [], events: [] };
        }

        const mosqueId = mosqueRows[0].id;

        // Get courses with schedules and date ranges
        const [courses] = await db.query(`
        SELECT 
            c.id as course_id,
            c.name as course_name,
            ct.name as course_type,
            cs.day_of_week,
            cs.start_time,
            cs.end_time,
            u.full_name as teacher_name,
            COUNT(DISTINCT e.id) as enrolled_count,
            c.max_students,
            c.course_start_date,
            c.course_end_date,
            c.duration_weeks,
            c.total_sessions
        FROM COURSE c
        JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
        JOIN COURSE_SCHEDULE cs ON c.id = cs.course_id
        LEFT JOIN USER u ON c.teacher_id = u.id
        LEFT JOIN ENROLLMENT e ON c.id = e.course_id AND e.status = 'active'
        WHERE c.mosque_id = ? AND c.is_active = TRUE
        GROUP BY c.id, cs.id
    `, [mosqueId]);

        // Get events
        const [events] = await db.query(`
        SELECT 
            e.id as event_id,
            e.title,
            e.description,
            e.event_date,
            e.event_time,
            e.location,
            e.event_type
        FROM EVENT e
        WHERE e.mosque_id = ? 
            AND e.status = 'scheduled'
            AND e.event_date >= CURDATE()
        ORDER BY e.event_date
    `, [mosqueId]);

        return {
            courses: courses.map(c => ({
                ...c,
                color: getCourseTypeColor(c.course_type)
            })),
            events: events.map(e => ({
                ...e,
                color: getEventTypeColor(e.event_type)
            }))
        };
    },

    /**
     * TEACHER - Get courses they're teaching
     */
    async getTeacherSchedule(userId) {
        const [courses] = await db.query(`
        SELECT 
            c.id as course_id,
            c.name as course_name,
            ct.name as course_type,
            cs.day_of_week,
            cs.start_time,
            cs.end_time,
            m.name as mosque_name,
            COUNT(DISTINCT e.id) as enrolled_count,
            c.max_students,
            c.course_start_date,
            c.course_end_date,
            c.duration_weeks,
            c.total_sessions
        FROM COURSE c
        JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
        JOIN COURSE_SCHEDULE cs ON c.id = cs.course_id
        JOIN MOSQUE m ON c.mosque_id = m.id
        LEFT JOIN ENROLLMENT e ON c.id = e.course_id AND e.status = 'active'
        WHERE c.teacher_id = ? AND c.is_active = TRUE
        GROUP BY c.id, cs.id
    `, [userId]);

        return {
            courses: courses.map(c => ({
                ...c,
                color: getCourseTypeColor(c.course_type)
            }))
        };
    },

    /**
     * STUDENT - Get enrolled courses
     */
    async getStudentSchedule(userId) {
        const [courses] = await db.query(`
        SELECT 
            c.id as course_id,
            c.name as course_name,
            ct.name as course_type,
            cs.day_of_week,
            cs.start_time,
            cs.end_time,
            u.full_name as teacher_name,
            m.name as mosque_name,
            c.course_start_date,
            c.course_end_date,
            c.duration_weeks,
            c.total_sessions
        FROM ENROLLMENT enr
        JOIN COURSE c ON enr.course_id = c.id
        JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
        JOIN COURSE_SCHEDULE cs ON c.id = cs.course_id
        JOIN MOSQUE m ON c.mosque_id = m.id
        LEFT JOIN USER u ON c.teacher_id = u.id
        WHERE enr.student_id = ? 
            AND enr.status = 'active'
            AND c.is_active = TRUE
    `, [userId]);

        return {
            courses: courses.map(c => ({
                ...c,
                color: getCourseTypeColor(c.course_type)
            }))
        };
    },

    /**
     * PARENT - Get children's courses with color per child
     */
    async getParentSchedule(userId) {
        // Child colors (5 max)
        const childColors = [
            '#e74c3c', // Red
            '#3498db', // Blue
            '#2ecc71', // Green
            '#f39c12', // Orange
            '#9b59b6'  // Purple
        ];

        // Get children
        const [children] = await db.query(`
        SELECT 
            pcr.child_id,
            u.full_name as child_name
        FROM PARENT_CHILD_RELATIONSHIP pcr
        JOIN USER u ON pcr.child_id = u.id
        WHERE pcr.parent_id = ? AND pcr.is_verified = TRUE
        ORDER BY u.full_name
        LIMIT 5
    `, [userId]);

        if (children.length === 0) {
            return { courses: [], children: [] };
        }

        // Assign colors
        const childColorMap = {};
        children.forEach((child, index) => {
            childColorMap[child.child_id] = {
                name: child.child_name,
                color: childColors[index]
            };
        });

        // Get all courses for all children
        const childIds = children.map(c => c.child_id);
        const [courses] = await db.query(`
        SELECT 
            c.id as course_id,
            c.name as course_name,
            ct.name as course_type,
            cs.day_of_week,
            cs.start_time,
            cs.end_time,
            u.full_name as teacher_name,
            m.name as mosque_name,
            enr.student_id,
            student.full_name as student_name,
            c.course_start_date,
            c.course_end_date,
            c.duration_weeks,
            c.total_sessions
        FROM ENROLLMENT enr
        JOIN COURSE c ON enr.course_id = c.id
        JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
        JOIN COURSE_SCHEDULE cs ON c.id = cs.course_id
        JOIN MOSQUE m ON c.mosque_id = m.id
        JOIN USER student ON enr.student_id = student.id
        LEFT JOIN USER u ON c.teacher_id = u.id
        WHERE enr.student_id IN (?)
            AND enr.status = 'active'
            AND c.is_active = TRUE
    `, [childIds]);

        return {
            courses: courses.map(c => ({
                ...c,
                child_info: childColorMap[c.student_id],
                color: childColorMap[c.student_id].color
            })),
            children: Object.entries(childColorMap).map(([id, info]) => ({
                id: parseInt(id),
                ...info
            }))
        };
    }



}