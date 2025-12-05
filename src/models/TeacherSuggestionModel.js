import db from "../config/db.js";

export const TeacherSuggestionModel = {
    /**
     * Get suggested teachers for a course with match scoring
     * @param {Object} courseRequirements - Course details for matching
     * @returns {Array} List of teachers with match scores
     */

    // Later: If to add a warning system for pending teachers later:
    // In getSuggestedTeachers query, add:
    // LEFT JOIN TEACHER_CERTIFICATION tc ON u.id = tc.user_id
    // WHERE tc.status IN ('approved', 'pending')

    // Then in the response, add:
    // certification_status: tc.status,
    // show_warning: tc.status === 'pending'

    async getSuggestedTeachers(courseRequirements) {
        const {
            mosque_id,
            course_type_id,
            course_level = null,
            target_gender = null,
            schedule = []
        } = courseRequirements;

        // Step 1: Get all approved teachers with their details
        const [teachers] = await db.execute(`
            SELECT 
                u.id,
                u.full_name,
                u.email,
                u.phone,
                u.gender,
                u.dob,
                -- Teacher certification
                tc.has_tajweed_certificate,
                tc.has_sharea_certificate,
                tc.experience_years,
                -- Teacher expertise for this course type
                te.course_type_id,
                te.max_mem_level_id,
                te.years_experience,
                te.hourly_rate_cents,
                ml.level_name as max_level_name,
                -- Current workload
                (SELECT COUNT(*) FROM ENROLLMENT e 
                 WHERE e.teacher_id = u.id 
                 AND e.status = 'active') as active_courses_count
            FROM USER u
            -- Join with teacher certification (must be approved)
            INNER JOIN TEACHER_CERTIFICATION tc ON u.id = tc.user_id
            -- Join with teacher expertise for this course type
            INNER JOIN TEACHER_EXPERTISE te ON u.id = te.teacher_id 
                AND te.course_type_id = ?
            -- Join with role assignment to ensure active teacher role
            INNER JOIN ROLE_ASSIGNMENT ra ON u.id = ra.user_id
            -- Join with role table to get teacher role
            INNER JOIN ROLE r ON ra.role_id = r.id AND r.name = 'teacher'
            -- Join with memorization level if applicable
            LEFT JOIN MEMORIZATION_LEVEL ml ON te.max_mem_level_id = ml.id
            -- Teacher must be approved and active
            WHERE tc.status = 'approved'
            AND ra.is_active = TRUE
            GROUP BY u.id
        `, [course_type_id]);



        // Step 2: Get additional details for each teacher
        const teachersWithDetails = await Promise.all(
            teachers.map(async (teacher) => {
                // Get teacher availability
                const [availability] = await db.execute(`
                    SELECT * FROM TEACHER_AVAILABILITY 
                    WHERE teacher_id = ? 
                    ORDER BY day_of_week, start_time
                `, [teacher.id]);

                // Get teacher's preferred mosques
                const [mosquePreferences] = await db.execute(`
                    SELECT m.*, ml.governorate 
                    FROM TEACHER_PREFERRED_MOSQUE tpm
                    JOIN MOSQUE m ON tpm.mosque_id = m.id
                    LEFT JOIN MOSQUE_LOCATION ml ON m.id = ml.mosque_id
                    WHERE tpm.teacher_id = ?
                `, [teacher.id]);

                // Get teacher's current courses (for workload details)
                const [currentCourses] = await db.execute(`
                    SELECT 
                        c.name,
                        m.name as mosque_name,
                        COUNT(e.id) as student_count
                    FROM ENROLLMENT e
                    JOIN COURSE c ON e.course_id = c.id
                    JOIN MOSQUE m ON c.mosque_id = m.id
                    WHERE e.teacher_id = ? 
                    AND e.status = 'active'
                    GROUP BY c.id
                `, [teacher.id]);

                // Calculate match score
                const matchDetails = this.calculateMatchScore(
                    teacher,
                    courseRequirements,
                    { availability, mosquePreferences, currentCourses }
                );

                return {
                    ...teacher,
                    availability,
                    mosque_preferences: mosquePreferences,
                    current_courses: currentCourses,
                    match_details: matchDetails.details,
                    match_score: matchDetails.totalScore,
                    recommendation_level: this.getRecommendationLevel(matchDetails.totalScore)
                };
            })
        );

        // Step 3: Sort by match score (highest first)
        return teachersWithDetails.sort((a, b) => b.match_score - a.match_score);
    },

    /**
     * Calculate match score for a teacher (0-100)
     */
    calculateMatchScore(teacher, courseReq, additionalData) {
        const { availability, mosquePreferences, currentCourses } = additionalData;
        let totalScore = 0;
        const details = {};

        // 1. Gender Match (30 points - HIGHEST priority)
        if (courseReq.target_gender === null) {
            // Mixed course - no gender restriction
            details.gender_match = true;
            totalScore += 30;
        } else {
            details.gender_match = teacher.gender === courseReq.target_gender;
            totalScore += details.gender_match ? 30 : -50; // Heavy penalty for mismatch
        }

        // 2. Expertise Match (20 points)
        details.expertise_match = teacher.course_type_id === courseReq.course_type_id;
        totalScore += details.expertise_match ? 20 : 0;

        // 3. Memorization Level Capability (20 points)
        if (courseReq.course_type_id === 1 && courseReq.course_level) { // Memorization course
            details.level_match = teacher.max_mem_level_id >= courseReq.course_level;
            totalScore += details.level_match ? 20 : 0;
        } else {
            details.level_match = null; // Not applicable
        }

        // 4. Schedule Availability (15 points)
        if (courseReq.schedule && courseReq.schedule.length > 0) {
            details.schedule_match = this.checkScheduleMatch(availability, courseReq.schedule);
            totalScore += details.schedule_match === 'full' ? 15 :
                details.schedule_match === 'partial' ? 8 : 0;
        } else {
            details.schedule_match = null; // No schedule specified
        }

        // 5. Mosque Preference (10 points)
        details.mosque_preference_match = mosquePreferences.some(
            mosque => mosque.id === courseReq.mosque_id
        );
        totalScore += details.mosque_preference_match ? 10 : 0;

        // 6. Current Workload (5 points)
        details.workload_score = this.calculateWorkloadScore(teacher.active_courses_count);
        details.workload_status = this.getWorkloadStatus(teacher.active_courses_count);
        totalScore += details.workload_score;

        // 7. Years of Experience (5 points max)
        details.experience_bonus = Math.min(teacher.experience_years || 0, 5);
        totalScore += details.experience_bonus;

        // 8. Certification Bonus (5 points max)
        details.certification_bonus = 0;
        if (teacher.has_tajweed_certificate && teacher.has_sharea_certificate) {
            details.certification_bonus = 5;
        } else if (teacher.has_tajweed_certificate || teacher.has_sharea_certificate) {
            details.certification_bonus = 3;
        }
        totalScore += details.certification_bonus;

        // Cap score at 100
        totalScore = Math.min(Math.max(totalScore, 0), 100);

        return { totalScore, details };
    },

    /**
     * Check if teacher's availability matches course schedule
     */
    checkScheduleMatch(teacherAvailability, courseSchedule) {
        if (teacherAvailability.length === 0) return 'none';

        let matches = 0;
        for (const courseSlot of courseSchedule) {
            const hasMatch = teacherAvailability.some(teacherSlot =>
                teacherSlot.day_of_week === courseSlot.day_of_week &&
                this.timeOverlaps(
                    teacherSlot.start_time, teacherSlot.end_time,
                    courseSlot.start_time, courseSlot.end_time
                )
            );
            if (hasMatch) matches++;
        }

        if (matches === courseSchedule.length) return 'full';
        if (matches > 0) return 'partial';
        return 'none';
    },

    /**
     * Check if two time slots overlap
     */
    timeOverlaps(start1, end1, start2, end2) {
        const s1 = this.timeToMinutes(start1);
        const e1 = this.timeToMinutes(end1);
        const s2 = this.timeToMinutes(start2);
        const e2 = this.timeToMinutes(end2);

        return s1 < e2 && s2 < e1;
    },

    /**
     * Convert HH:MM:SS to minutes
     */
    timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    },

    /**
     * Calculate workload score (5 points max)
     */
    calculateWorkloadScore(activeCourses) {
        if (activeCourses >= 3) return 0;       // Maxed out
        if (activeCourses === 2) return 1;      // Light load
        if (activeCourses === 1) return 3;      // Moderate load
        return 5;                               // Available
    },

    /**
     * Get workload status label
     */
    getWorkloadStatus(activeCourses) {
        if (activeCourses >= 3) return 'full';
        if (activeCourses === 2) return 'moderate';
        if (activeCourses === 1) return 'light';
        return 'available';
    },

    /**
     * Get recommendation level based on score
     */
    getRecommendationLevel(score) {
        if (score >= 80) return 'highly_recommended';
        if (score >= 60) return 'recommended';
        if (score >= 40) return 'suitable';
        return 'not_recommended';
    },

    /**
     * Simple: Get mosque ID for mosque admin (1-1 relationship)
     */
    async getMosqueIdForAdmin(userId) {
        const [rows] = await db.execute(
            'SELECT id FROM MOSQUE WHERE mosque_admin_id = ?',
            [userId]
        );

        if (rows.length === 0) {
            throw new Error('User is not a mosque admin or mosque not found');
        }

        return rows[0].id;
    }
};