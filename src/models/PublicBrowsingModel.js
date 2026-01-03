// ============================================
// FILE: src/models/PublicBrowsingModel.js
// Handles public mosque and course queries
// ============================================
import db from "../config/db.js";

export const PublicBrowsingModel = {
    /**
     * Get all active mosques with their course count and student count
     * For public mosque listing page
     */
    async getAllPublicMosques(filters = {}) {
        const { governorate, search } = filters;

        let query = `
            SELECT 
                m.id,
                m.name,
                m.contact_number,
                ml.governorate,
                ml.region,
                ml.address,
                ml.latitude,
                ml.longitude,
                -- Count active courses
                (SELECT COUNT(*) 
                 FROM COURSE c 
                 WHERE c.mosque_id = m.id 
                   AND c.is_active = TRUE
                   AND (c.enrollment_deadline IS NULL OR c.enrollment_deadline >= CURDATE())
                ) as active_courses_count,
                -- Count enrolled students
                (SELECT COUNT(DISTINCT e.student_id)
                 FROM COURSE c
                 JOIN ENROLLMENT e ON c.id = e.course_id
                 WHERE c.mosque_id = m.id 
                   AND e.status = 'active'
                ) as total_students_count
            FROM MOSQUE m
            LEFT JOIN MOSQUE_LOCATION ml ON m.id = ml.mosque_id
            WHERE 1=1
        `;

        const params = [];

        // Filter by governorate
        if (governorate && governorate !== 'all') {
            query += ` AND ml.governorate = ?`;
            params.push(governorate);
        }

        // Search by name or location
        if (search) {
            query += ` AND (m.name LIKE ? OR ml.region LIKE ? OR ml.address LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ` ORDER BY m.name ASC`;

        const [mosques] = await db.execute(query, params);
        return mosques;
    },

    /**
     * Get mosque details with all courses
     * For mosque details page
     */
    async getMosqueDetails(mosqueId) {
        // Get mosque info
        const [mosques] = await db.execute(`
            SELECT 
                m.id,
                m.name,
                m.contact_number,
                ml.governorate,
                ml.region,
                ml.address,
                ml.postal_code,
                ml.latitude,
                ml.longitude,
                u.full_name as admin_name,
                u.email as admin_email,
                u.phone as admin_phone
            FROM MOSQUE m
            LEFT JOIN MOSQUE_LOCATION ml ON m.id = ml.mosque_id
            LEFT JOIN USER u ON m.mosque_admin_id = u.id
            WHERE m.id = ?
        `, [mosqueId]);

        if (mosques.length === 0) return null;

        const mosque = mosques[0];

        // Get active enrollable courses
        const [courses] = await db.execute(`
            SELECT 
                c.id,
                c.name,
                c.description,
                c.price_cents,
                c.max_students,
                c.enrollment_deadline,
                c.course_start_date,
                c.course_end_date,
                c.target_age_group,
                c.target_gender,
                c.schedule_type,
                c.is_online_enabled,
                ct.name as course_type,
                ml.level_name as memorization_level,
                u.full_name as teacher_name,
                -- Enrolled count
                (SELECT COUNT(*) FROM ENROLLMENT e 
                 WHERE e.course_id = c.id AND e.status = 'active') as enrolled_count,
                -- Available spots
                CASE 
                    WHEN c.max_students IS NULL THEN 999
                    ELSE c.max_students - (SELECT COUNT(*) FROM ENROLLMENT e 
                                           WHERE e.course_id = c.id AND e.status = 'active')
                END as available_spots,
                -- Days until deadline
                CASE 
                    WHEN c.enrollment_deadline IS NULL THEN NULL
                    ELSE DATEDIFF(c.enrollment_deadline, CURDATE())
                END as days_until_deadline
            FROM COURSE c
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            LEFT JOIN MEMORIZATION_LEVEL ml ON c.course_level = ml.id
            LEFT JOIN USER u ON c.teacher_id = u.id
            WHERE c.mosque_id = ?
              AND c.is_active = TRUE
              AND (c.enrollment_deadline IS NULL OR c.enrollment_deadline >= CURDATE())
            ORDER BY c.course_start_date ASC, c.name ASC
        `, [mosqueId]);

        // Get course schedules
        for (const course of courses) {
            const [schedules] = await db.execute(`
                SELECT day_of_week, start_time, end_time, location
                FROM COURSE_SCHEDULE
                WHERE course_id = ?
                ORDER BY FIELD(day_of_week, 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')
            `, [course.id]);
            course.schedule = schedules;
        }

        mosque.courses = courses;
        return mosque;
    },

    /**
     * Get all public courses (direct course browsing)
     * For public courses listing page
     */
    async getAllPublicCourses(filters = {}) {
        const {
            governorate,
            course_type,
            target_age_group,
            target_gender,
            price_filter, // 'free', 'paid', 'all'
            schedule_type,
            search
        } = filters;

        let query = `
            SELECT 
                c.id,
                c.name,
                c.description,
                c.price_cents,
                c.max_students,
                c.enrollment_deadline,
                c.course_start_date,
                c.target_age_group,
                c.target_gender,
                c.schedule_type,
                c.is_online_enabled,
                ct.name as course_type,
                ml.level_name as memorization_level,
                m.name as mosque_name,
                m.id as mosque_id,
                mloc.governorate,
                mloc.region,
                u.full_name as teacher_name,
                -- Enrolled count
                (SELECT COUNT(*) FROM ENROLLMENT e 
                 WHERE e.course_id = c.id AND e.status = 'active') as enrolled_count,
                -- Available spots
                CASE 
                    WHEN c.max_students IS NULL THEN 999
                    ELSE c.max_students - (SELECT COUNT(*) FROM ENROLLMENT e 
                                           WHERE e.course_id = c.id AND e.status = 'active')
                END as available_spots,
                -- Days until deadline
                CASE 
                    WHEN c.enrollment_deadline IS NULL THEN NULL
                    ELSE DATEDIFF(c.enrollment_deadline, CURDATE())
                END as days_until_deadline
            FROM COURSE c
            JOIN MOSQUE m ON c.mosque_id = m.id
            LEFT JOIN MOSQUE_LOCATION mloc ON m.id = mloc.mosque_id
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            LEFT JOIN MEMORIZATION_LEVEL ml ON c.course_level = ml.id
            LEFT JOIN USER u ON c.teacher_id = u.id
            WHERE c.is_active = TRUE
              AND (c.enrollment_deadline IS NULL OR c.enrollment_deadline >= CURDATE())
        `;

        const params = [];

        // Filter by governorate
        if (governorate && governorate !== 'all') {
            query += ` AND mloc.governorate = ?`;
            params.push(governorate);
        }

        // Filter by course type
        if (course_type && course_type !== 'all') {
            query += ` AND ct.name = ?`;
            params.push(course_type);
        }

        // Filter by age group
        if (target_age_group && target_age_group !== 'all') {
            query += ` AND (c.target_age_group = ? OR c.target_age_group = 'all')`;
            params.push(target_age_group);
        }

        // Filter by gender
        if (target_gender && target_gender !== 'all') {
            query += ` AND (c.target_gender = ? OR c.target_gender IS NULL)`;
            params.push(target_gender);
        }

        // Filter by price
        if (price_filter === 'free') {
            query += ` AND c.price_cents = 0`;
        } else if (price_filter === 'paid') {
            query += ` AND c.price_cents > 0`;
        }

        // Filter by schedule type
        if (schedule_type && schedule_type !== 'all') {
            query += ` AND c.schedule_type = ?`;
            params.push(schedule_type);
        }

        // Search by course name or description
        if (search) {
            query += ` AND (c.name LIKE ? OR c.description LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ` ORDER BY c.course_start_date ASC, c.name ASC`;

        const [courses] = await db.execute(query, params);

        // Get schedules for each course
        for (const course of courses) {
            const [schedules] = await db.execute(`
                SELECT day_of_week, start_time, end_time
                FROM COURSE_SCHEDULE
                WHERE course_id = ?
                ORDER BY FIELD(day_of_week, 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')
            `, [course.id]);
            course.schedule = schedules;
        }

        return courses;
    },

    /**
     * Get course details for public view
     * For course details page
     */
    async getCourseDetails(courseId) {
        const [courses] = await db.execute(`
            SELECT 
                c.*,
                ct.name as course_type,
                ct.description as course_type_description,
                ml.level_name as memorization_level,
                ml.juz_range_start,
                ml.juz_range_end,
                ml.page_range_start,
                ml.page_range_end,
                m.name as mosque_name,
                m.id as mosque_id,
                m.contact_number as mosque_contact,
                mloc.governorate,
                mloc.region,
                mloc.address as mosque_address,
                mloc.latitude,
                mloc.longitude,
                u.full_name as teacher_name,
                u.email as teacher_email,
                -- Enrolled count
                (SELECT COUNT(*) FROM ENROLLMENT e 
                 WHERE e.course_id = c.id AND e.status = 'active') as enrolled_count,
                -- Available spots
                CASE 
                    WHEN c.max_students IS NULL THEN 999
                    ELSE c.max_students - (SELECT COUNT(*) FROM ENROLLMENT e 
                                           WHERE e.course_id = c.id AND e.status = 'active')
                END as available_spots,
                -- Days until deadline
                CASE 
                    WHEN c.enrollment_deadline IS NULL THEN NULL
                    ELSE DATEDIFF(c.enrollment_deadline, CURDATE())
                END as days_until_deadline,
                -- Is enrollment open
                CASE 
                    WHEN c.enrollment_deadline IS NULL THEN TRUE
                    WHEN c.enrollment_deadline >= CURDATE() THEN TRUE
                    ELSE FALSE
                END as is_enrollment_open
            FROM COURSE c
            JOIN MOSQUE m ON c.mosque_id = m.id
            LEFT JOIN MOSQUE_LOCATION mloc ON m.id = mloc.mosque_id
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            LEFT JOIN MEMORIZATION_LEVEL ml ON c.course_level = ml.id
            LEFT JOIN USER u ON c.teacher_id = u.id
            WHERE c.id = ? AND c.is_active = TRUE
        `, [courseId]);

        if (courses.length === 0) return null;

        const course = courses[0];

        // Get course schedule
        const [schedules] = await db.execute(`
            SELECT day_of_week, start_time, end_time, location
            FROM COURSE_SCHEDULE
            WHERE course_id = ?
            ORDER BY FIELD(day_of_week, 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')
        `, [courseId]);

        course.schedule = schedules;
        return course;
    },

    /**
     * Get filter options for courses page
     * Returns available values for dropdowns
     */
    async getFilterOptions() {
        // Get available governorates
        const [governorates] = await db.execute(`
            SELECT DISTINCT governorate 
            FROM MOSQUE_LOCATION 
            WHERE governorate IS NOT NULL
            ORDER BY governorate
        `);

        // Get course types
        const [courseTypes] = await db.execute(`
            SELECT id, name, description 
            FROM COURSE_TYPE
            ORDER BY name
        `);

        return {
            governorates: governorates.map(g => g.governorate),
            courseTypes: courseTypes,
            ageGroups: ['all', 'children', 'teenagers', 'adults'],
            genders: ['all', 'male', 'female'],
            scheduleTypes: ['all', 'onsite', 'online', 'hybrid'],
            priceFilters: ['all', 'free', 'paid']
        };
    }
};

