import db from "../config/db.js";

export const TeacherSuggestionModel = {
    /**
     * Get suggested teachers with simplified matching
     */
    async getSuggestedTeachers(courseRequirements) {
        const {
            mosque_id,
            course_type_id,
            course_level = null,
            target_gender = null,
            schedule = []
        } = courseRequirements;

        try {
            // First, get the mosque's governorate
            const [mosqueInfo] = await db.execute(`
                SELECT ml.governorate 
                FROM MOSQUE m
                LEFT JOIN MOSQUE_LOCATION ml ON m.id = ml.mosque_id
                WHERE m.id = ?
            `, [mosque_id]);

            const mosqueGovernorate = mosqueInfo[0]?.governorate || null;

            // Build the base query
            let query = `
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
                    tc.preferred_teaching_format,
                    -- Teacher expertise for this course type
                    te.course_type_id,
                    te.max_mem_level_id,
                    te.years_experience,
                    te.hourly_rate_cents,
                    -- Current workload
                    (SELECT COUNT(*) FROM ENROLLMENT e 
                     WHERE e.teacher_id = u.id 
                     AND e.status = 'active') as active_courses_count
                FROM USER u
                INNER JOIN TEACHER_CERTIFICATION tc ON u.id = tc.user_id
                INNER JOIN TEACHER_EXPERTISE te ON u.id = te.teacher_id 
                    AND te.course_type_id = ?
                INNER JOIN ROLE_ASSIGNMENT ra ON u.id = ra.user_id
                INNER JOIN ROLE r ON ra.role_id = r.id AND r.name = 'teacher'
                WHERE tc.status = 'approved'
                AND ra.is_active = TRUE
            `;

            const params = [course_type_id];

            // 1. Filter by governorate (MUST requirement)
            if (mosqueGovernorate) {
                // Get teachers who prefer this mosque OR teachers without specific mosque preference
                query += `
                    AND (
                        u.id IN (
                            SELECT teacher_id FROM TEACHER_PREFERRED_MOSQUE tpm
                            JOIN MOSQUE m ON tpm.mosque_id = m.id
                            LEFT JOIN MOSQUE_LOCATION ml ON m.id = ml.mosque_id
                            WHERE ml.governorate = ?
                        )
                        OR NOT EXISTS (
                            SELECT 1 FROM TEACHER_PREFERRED_MOSQUE WHERE teacher_id = u.id
                        )
                    )
                `;
                params.push(mosqueGovernorate);
            }

            // 2. Filter by gender if specified (MUST requirement for non-mixed)
            if (target_gender && target_gender !== '') {
                query += ` AND u.gender = ?`;
                params.push(target_gender);
            }

            const [teachers] = await db.execute(query, params);

            // Step 2: Get additional details and calculate scores
            const teachersWithDetails = await Promise.all(
                teachers.map(async (teacher) => {
                    // Get teacher availability
                    const [availability] = await db.execute(`
                        SELECT * FROM TEACHER_AVAILABILITY 
                        WHERE teacher_id = ? 
                        ORDER BY day_of_week, start_time
                    `, [teacher.id]);

                    // Calculate match score (0-100)
                    const matchDetails = this.calculateSimpleMatchScore(
                        teacher,
                        courseRequirements,
                        { availability }
                    );

                    return {
                        ...teacher,
                        availability,
                        match_details: matchDetails.details,
                        match_score: matchDetails.totalScore,
                        recommendation_level: this.getRecommendationLevel(matchDetails.totalScore)
                    };
                })
            );

            // Step 3: Filter teachers with available times if schedule is specified
            let filteredTeachers = teachersWithDetails;

            if (schedule && schedule.length > 0) {
                filteredTeachers = teachersWithDetails.filter(teacher => {
                    // 3. Check schedule availability (MUST requirement)
                    const hasAvailableTimes = this.hasAvailableTimes(teacher.availability, schedule);
                    return hasAvailableTimes;
                });
            }

            // Step 4: Sort by match score (highest first)
            return filteredTeachers.sort((a, b) => b.match_score - a.match_score);

        } catch (error) {
            console.error("Error in getSuggestedTeachers:", error);
            throw error;
        }
    },

    /**
     * Simplified match score calculation
     * MUST requirements: governorate, gender (if specified), schedule availability
     * BONUS points: certifications, experience, workload
     */
    calculateSimpleMatchScore(teacher, courseReq, additionalData) {
        const { availability } = additionalData;
        let totalScore = 0;
        const details = {};

        // MUST requirements are already filtered out, these are bonuses

        // 1. Governorate match (Already filtered, but give points for preference match)
        details.governorate_match = true; // Already passed filter

        // 2. Gender match (Already filtered, but give points)
        details.gender_match = !courseReq.target_gender ||
            courseReq.target_gender === '' ||
            teacher.gender === courseReq.target_gender;

        // 3. Schedule availability bonus (0-30 points)
        if (courseReq.schedule && courseReq.schedule.length > 0) {
            const availabilityMatch = this.checkSimpleScheduleMatch(availability, courseReq.schedule);
            details.schedule_match = availabilityMatch.quality;
            totalScore += availabilityMatch.score;
        }

        // 4. Certification bonus (0-20 points)
        details.certification_bonus = 0;
        if (teacher.has_tajweed_certificate && teacher.has_sharea_certificate) {
            details.certification_bonus = 20;
        } else if (teacher.has_tajweed_certificate || teacher.has_sharea_certificate) {
            details.certification_bonus = 10;
        }
        totalScore += details.certification_bonus;

        // 5. Experience bonus (0-25 points)
        details.experience_bonus = Math.min(Math.floor((teacher.experience_years || 0) * 2), 25);
        totalScore += details.experience_bonus;

        // 6. Workload bonus (0-15 points) - Teachers with fewer active courses get higher score
        details.workload_bonus = Math.max(0, 15 - (teacher.active_courses_count * 3));
        totalScore += details.workload_bonus;

        // 7. Preferred format match (0-10 points)
        if (courseReq.schedule_type && teacher.preferred_teaching_format) {
            details.format_match = teacher.preferred_teaching_format === courseReq.schedule_type;
            if (details.format_match) {
                totalScore += 10;
            }
        }

        // Cap score at 100
        totalScore = Math.min(Math.max(totalScore, 0), 100);

        return { totalScore, details };
    },

    /**
     * Check if teacher has available times for the course schedule
     */
    hasAvailableTimes(teacherAvailability, courseSchedule) {
        if (!teacherAvailability || teacherAvailability.length === 0) {
            return false; // No availability data means not available
        }

        // Check each course time slot
        for (const courseSlot of courseSchedule) {
            const hasMatch = teacherAvailability.some(teacherSlot =>
                teacherSlot.day_of_week === courseSlot.day_of_week &&
                this.timeOverlaps(
                    teacherSlot.start_time, teacherSlot.end_time,
                    courseSlot.start_time, courseSlot.end_time
                )
            );

            if (!hasMatch) {
                return false; // Missing a required time slot
            }
        }

        return true; // All required time slots are available
    },

    /**
     * Check schedule match quality for scoring
     */
    checkSimpleScheduleMatch(teacherAvailability, courseSchedule) {
        if (!teacherAvailability || teacherAvailability.length === 0) {
            return { quality: 'none', score: 0 };
        }

        let perfectMatches = 0;
        let partialMatches = 0;

        for (const courseSlot of courseSchedule) {
            let matchQuality = 'none';

            teacherAvailability.forEach(teacherSlot => {
                if (teacherSlot.day_of_week === courseSlot.day_of_week) {
                    if (teacherSlot.start_time <= courseSlot.start_time &&
                        teacherSlot.end_time >= courseSlot.end_time) {
                        matchQuality = 'perfect';
                    } else if (this.timeOverlaps(
                        teacherSlot.start_time, teacherSlot.end_time,
                        courseSlot.start_time, courseSlot.end_time
                    )) {
                        matchQuality = 'partial';
                    }
                }
            });

            if (matchQuality === 'perfect') perfectMatches++;
            else if (matchQuality === 'partial') partialMatches++;
        }

        const totalSlots = courseSchedule.length;
        let score = 0;
        let quality = 'none';

        if (perfectMatches === totalSlots) {
            score = 30;
            quality = 'perfect';
        } else if (perfectMatches > 0 || partialMatches > 0) {
            score = (perfectMatches * 15) + (partialMatches * 10);
            quality = 'partial';
        }

        return { quality, score };
    },

    timeOverlaps(start1, end1, start2, end2) {
        const s1 = this.timeToMinutes(start1);
        const e1 = this.timeToMinutes(end1);
        const s2 = this.timeToMinutes(start2);
        const e2 = this.timeToMinutes(end2);
        return s1 < e2 && s2 < e1;
    },

    timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    },

    getRecommendationLevel(score) {
        if (score >= 80) return 'highly_recommended';
        if (score >= 60) return 'recommended';
        if (score >= 40) return 'suitable';
        return 'available'; // changed from 'not_recommended'
    }
};

/**
 * 
 how can we make the suggestion simpler ?
maube like this:
1.governorate -> is a must 
2.gender-> is a must to match only when not mix gender selected 
3. available times 
aprroved and available times and certification and experienced -> advantages but not necessary (extra points ) 
recommendation will show from high to low 

when the first three matches a teacher put them to the list 
if could be simpler do it 

and do not forget the backend also
 */