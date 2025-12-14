import db from "../config/db.js";

export const CourseModel = {
    // ✅ Create a new course
    async create(courseData, createdBy) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Insert course
            const [courseResult] = await connection.execute(
                `INSERT INTO COURSE 
                 (mosque_id, teacher_id, target_gender, course_type_id, name, description, course_format, 
                 price_cents, duration_weeks, total_sessions, 
                 max_students, schedule_type, target_age_group, course_level, 
                 created_by, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    courseData.mosque_id,
                    courseData.teacher_id || null,
                    courseData.target_gender || null,
                    courseData.course_type_id,
                    courseData.name,
                    courseData.description || '',
                    courseData.course_format,
                    courseData.price_cents || 0,
                    courseData.duration_weeks || null,
                    courseData.total_sessions || null,
                    courseData.max_students || null,
                    courseData.schedule_type || 'onsite',
                    courseData.target_age_group || 'all',
                    courseData.course_level || null,
                    createdBy,
                    courseData.is_active !== undefined ? courseData.is_active : true
                ]
            );

            const courseId = courseResult.insertId;

            // Insert course schedule if provided
            if (courseData.schedule && courseData.schedule.length > 0) {
                for (const schedule of courseData.schedule) {
                    await connection.execute(
                        `INSERT INTO COURSE_SCHEDULE 
                        (course_id, day_of_week, start_time, end_time, location) 
                        VALUES (?, ?, ?, ?, ?)`,
                        [
                            courseId,
                            schedule.day_of_week,
                            schedule.start_time,
                            schedule.end_time,
                            schedule.location || ''
                        ]
                    );
                }
            }

            await connection.commit();
            return courseId;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // ✅ Get all courses for a specific mosque
    async findByMosque(mosqueId) {
        const [courses] = await db.execute(`
            SELECT 
                c.id,
                c.name,
                c.description,
                c.course_format,
                c.price_cents,
                c.duration_weeks,
                c.total_sessions,
                c.max_students,
                c.schedule_type,
                c.target_age_group,
                c.course_level,
                c.is_active,
                c.created_at,
                ct.name as course_type,
                ml.level_name as memorization_level,
                (SELECT COUNT(*) FROM ENROLLMENT WHERE course_id = c.id AND status = 'active') as enrolled_students
            FROM COURSE c
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            LEFT JOIN MEMORIZATION_LEVEL ml ON c.course_level = ml.id
            WHERE c.mosque_id = ?
            ORDER BY c.created_at DESC
        `, [mosqueId]);

        return courses;
    },

    // ✅ Get course by ID with full details including schedule
    async findById(courseId) {
        const [courses] = await db.execute(`
            SELECT 
                c.*,
                ct.name as course_type,
                ct.description as course_type_description,
                ml.level_name as memorization_level,
                ml.juz_range_start,
                ml.juz_range_end,
                m.name as mosque_name,
                u.full_name as created_by_name,
                u2.full_name as teacher_name,
                (SELECT COUNT(*) FROM ENROLLMENT WHERE course_id = c.id AND status = 'active') as enrolled_students
            FROM COURSE c
            JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
            JOIN MOSQUE m ON c.mosque_id = m.id
            JOIN USER u ON c.created_by = u.id
            LEFT JOIN MEMORIZATION_LEVEL ml ON c.course_level = ml.id
            LEFT JOIN USER u2 ON c.teacher_id = u2.id
            
            WHERE c.id = ?
        `, [courseId]);

        if (courses.length === 0) return null;

        const course = courses[0];

        // Get course schedule
        const [schedules] = await db.execute(`
            SELECT * FROM COURSE_SCHEDULE WHERE course_id = ? ORDER BY day_of_week
        `, [courseId]);

        // Parse JSON and attach schedule
        return {
            ...course,
            schedule: schedules
        };
    },

    // ✅ Update course
    async update(courseId, courseData) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Update course main data
            const updateFields = [];
            const updateValues = [];

            const allowedFields = [
                'name', 'description', 'course_format',
                'price_cents', 'duration_weeks', 'total_sessions', 'max_students',
                'schedule_type', 'course_level', 'is_active', 'target_gender',
                'teacher_id', 'target_age_group'
            ];

            allowedFields.forEach(field => {
                if (courseData[field] !== undefined) {
                    updateFields.push(`${field} = ?`);
                    updateValues.push(courseData[field]);
                }
            });


            if (updateFields.length > 0) {
                updateValues.push(courseId);
                await connection.execute(
                    `UPDATE COURSE SET ${updateFields.join(', ')} WHERE id = ?`,
                    updateValues
                );
            }

            // Update schedule if provided
            if (courseData.schedule !== undefined) {
                // Delete existing schedule
                await connection.execute(
                    'DELETE FROM COURSE_SCHEDULE WHERE course_id = ?',
                    [courseId]
                );

                // Insert new schedule
                if (courseData.schedule.length > 0) {
                    for (const schedule of courseData.schedule) {
                        await connection.execute(
                            `INSERT INTO COURSE_SCHEDULE 
                            (course_id, day_of_week, start_time, end_time, location) 
                            VALUES (?, ?, ?, ?, ?)`,
                            [
                                courseId,
                                schedule.day_of_week,
                                schedule.start_time,
                                schedule.end_time,
                                schedule.location || ''
                            ]
                        );
                    }
                }
            }

            await connection.commit();
            return true;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // ✅ Assign teacher to course
    async assignTeacher(courseId, teacherId, assignedBy) {
        // Create a course assignment record or update enrollment
        const [result] = await db.execute(
            `UPDATE COURSE SET updated_at = NOW() , teacher_id = ? WHERE id = ?`,
            [teacherId, courseId]
        );

        // You might want to create a separate COURSE_TEACHER table for this
        // For now, enrollments will handle teacher assignment
        return result.affectedRows > 0;
    },

    // ✅ Delete course (soft delete by setting is_active = false)
    async delete(courseId) {
        const [result] = await db.execute(
            'UPDATE COURSE SET is_active = false WHERE id = ?',
            [courseId]
        );
        return result.affectedRows > 0;
    },

    // ✅ Hard delete course
    async hardDelete(courseId) {
        const [result] = await db.execute(
            'DELETE FROM COURSE WHERE id = ?',
            [courseId]
        );
        return result.affectedRows > 0;
    },

    // ✅ Check if course exists
    async exists(courseId) {
        const [rows] = await db.execute(
            'SELECT id FROM COURSE WHERE id = ?',
            [courseId]
        );
        return rows.length > 0;
    },

    // ✅ Get course types
    async getCourseTypes() {
        const [types] = await db.execute('SELECT * FROM COURSE_TYPE');
        return types;
    },

    // ✅ Get memorization levels
    async getMemorizationLevels() {
        const [levels] = await db.execute(`
            SELECT 
                ml.*,
                ct.name as course_type_name
            FROM MEMORIZATION_LEVEL ml
            JOIN COURSE_TYPE ct ON ml.course_type_id = ct.id
            ORDER BY ml.level_number
        `);
        return levels;
    },

    async getMosqueIdForAdmin(userId) {
        const [rows] = await db.execute(`
            SELECT id FROM MOSQUE WHERE mosque_admin_id = ?
        `, [userId]);
        if (rows.length === 0) {
            return null;
        }

        return rows.length > 0 ? rows[0].id : null;
    }

};