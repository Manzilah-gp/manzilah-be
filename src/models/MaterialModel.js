import db from '../config/db.js';

export const MaterialModel = {

    /**
     * Create material record
     */
    async createMaterial(materialData) {
        const {
            courseId, sectionId, uploadedBy, title, description,
            materialLabel, fileName, fileSize, fileType,
            firebaseUrl, firebasePath
        } = materialData;

        const [result] = await db.execute(`
            INSERT INTO COURSE_MATERIAL 
            (course_id, section_id, uploaded_by, title, description, 
             material_label, file_name, file_size, file_type, 
             firebase_url, firebase_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            courseId, sectionId, uploadedBy, title, description,
            materialLabel, fileName, fileSize, fileType,
            firebaseUrl, firebasePath
        ]);

        return result.insertId;
    },

    /**
     * Get all materials for a course (organized by sections)
     */
    async getCourseMaterials(courseId) {
        // Get sections
        const [sections] = await db.execute(`
            SELECT id, section_name, section_order
            FROM MATERIAL_SECTION
            WHERE course_id = ?
            ORDER BY section_order ASC, id ASC
        `, [courseId]);

        // Get materials without section
        const [ungroupedMaterials] = await db.execute(`
            SELECT 
                cm.*,
                u.full_name as uploaded_by_name
            FROM COURSE_MATERIAL cm
            JOIN USER u ON cm.uploaded_by = u.id
            WHERE cm.course_id = ? AND cm.section_id IS NULL AND cm.is_visible = TRUE
            ORDER BY cm.created_at DESC
        `, [courseId]);

        // Get materials for each section
        const sectionsWithMaterials = await Promise.all(
            sections.map(async (section) => {
                const [materials] = await db.execute(`
                    SELECT 
                        cm.*,
                        u.full_name as uploaded_by_name
                    FROM COURSE_MATERIAL cm
                    JOIN USER u ON cm.uploaded_by = u.id
                    WHERE cm.section_id = ? AND cm.is_visible = TRUE
                    ORDER BY cm.created_at DESC
                `, [section.id]);

                return {
                    ...section,
                    materials
                };
            })
        );

        return {
            sections: sectionsWithMaterials,
            ungroupedMaterials
        };
    },

    /**
     * Get material by ID
     */
    async getMaterialById(materialId) {
        const [materials] = await db.execute(`
            SELECT * FROM COURSE_MATERIAL WHERE id = ?
        `, [materialId]);

        return materials[0] || null;
    },

    /**
     * Delete material
     */
    async deleteMaterial(materialId) {
        await db.execute(`
            DELETE FROM COURSE_MATERIAL WHERE id = ?
        `, [materialId]);
    },

    /**
     * Track download
     */
    async trackDownload(materialId, userId) {
        // Increment download count
        await db.execute(`
            UPDATE COURSE_MATERIAL 
            SET download_count = download_count + 1
            WHERE id = ?
        `, [materialId]);

        // Log download
        await db.execute(`
            INSERT INTO MATERIAL_DOWNLOAD_LOG (material_id, user_id)
            VALUES (?, ?)
        `, [materialId, userId]);
    },

    /**
     * Verify user has access to course materials
     */
    async verifyUserAccess(userId, courseId, userRoles) {
        // Teachers can access if they teach the course
        if (userRoles.includes('teacher')) {
            const [courses] = await db.execute(`
                SELECT id FROM COURSE WHERE id = ? AND teacher_id = ?
            `, [courseId, userId]);

            if (courses.length > 0) return true;
        }

        // Students can access if enrolled
        if (userRoles.includes('student')) {
            const [enrollments] = await db.execute(`
                SELECT id FROM ENROLLMENT 
                WHERE course_id = ? AND student_id = ? AND status = 'active'
            `, [courseId, userId]);

            if (enrollments.length > 0) return true;
        }

        return false;
    },

    /**
     * Verify teacher owns course
     */
    async verifyCourseTeacher(teacherId, courseId) {
        const [courses] = await db.execute(`
            SELECT id FROM COURSE WHERE id = ? AND teacher_id = ?
        `, [courseId, teacherId]);

        return courses.length > 0;
    },

    /**
     * Section Management
     */
    async createSection(sectionData) {
        const { courseId, sectionName, sectionOrder } = sectionData;

        const [result] = await db.execute(`
            INSERT INTO MATERIAL_SECTION (course_id, section_name, section_order)
            VALUES (?, ?, ?)
        `, [courseId, sectionName, sectionOrder]);

        return result.insertId;
    },

    async getSections(courseId) {
        const [sections] = await db.execute(`
            SELECT * FROM MATERIAL_SECTION
            WHERE course_id = ?
            ORDER BY section_order ASC, id ASC
        `, [courseId]);

        return sections;
    },

    async updateSection(sectionId, updateData) {
        const { sectionName, sectionOrder } = updateData;

        await db.execute(`
            UPDATE MATERIAL_SECTION
            SET section_name = COALESCE(?, section_name),
                section_order = COALESCE(?, section_order)
            WHERE id = ?
        `, [sectionName, sectionOrder, sectionId]);
    },

    async deleteSection(sectionId) {
        // Materials will cascade delete or set to NULL based on FK constraint
        await db.execute(`
            DELETE FROM MATERIAL_SECTION WHERE id = ?
        `, [sectionId]);
    }
};