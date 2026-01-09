import db from '../config/db.js';

export const MaterialModel = {

    /**
     * Create material record (UPDATED)
     */
    async createMaterial(materialData) {
        const {
            courseId, sectionId, uploadedBy, title, description,
            materialLabel, fileName, fileSize, fileType,
            localUrl, localPath // UPDATED: Changed from firebase fields
        } = materialData;

        const [result] = await db.execute(`
            INSERT INTO COURSE_MATERIAL 
            (course_id, section_id, uploaded_by, title, description, 
             material_label, file_name, file_size, file_type, 
             local_url, local_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            courseId, sectionId, uploadedBy, title, description,
            materialLabel, fileName, fileSize, fileType,
            localUrl, localPath
        ]);

        return result.insertId;
    },

    // All other methods remain THE SAME
    async getCourseMaterials(courseId) {
        const [sections] = await db.execute(`
            SELECT id, section_name, section_order
            FROM MATERIAL_SECTION
            WHERE course_id = ?
            ORDER BY section_order ASC, id ASC
        `, [courseId]);

        const [ungroupedMaterials] = await db.execute(`
            SELECT 
                cm.*,
                u.full_name as uploaded_by_name
            FROM COURSE_MATERIAL cm
            JOIN USER u ON cm.uploaded_by = u.id
            WHERE cm.course_id = ? AND cm.section_id IS NULL AND cm.is_visible = TRUE
            ORDER BY cm.created_at DESC
        `, [courseId]);

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

    async getMaterialById(materialId) {
        const [materials] = await db.execute(`
            SELECT * FROM COURSE_MATERIAL WHERE id = ?
        `, [materialId]);

        return materials[0] || null;
    },

    async deleteMaterial(materialId) {
        await db.execute(`
            DELETE FROM COURSE_MATERIAL WHERE id = ?
        `, [materialId]);
    },

    async trackDownload(materialId, userId) {
        await db.execute(`
            UPDATE COURSE_MATERIAL 
            SET download_count = download_count + 1
            WHERE id = ?
        `, [materialId]);

        await db.execute(`
            INSERT INTO MATERIAL_DOWNLOAD_LOG (material_id, user_id)
            VALUES (?, ?)
        `, [materialId, userId]);
    },

    async verifyUserAccess(userId, courseId, userRoles) {
        if (userRoles.includes('teacher')) {
            const [courses] = await db.execute(`
                SELECT id FROM COURSE WHERE id = ? AND teacher_id = ?
            `, [courseId, userId]);

            if (courses.length > 0) return true;
        }

        if (userRoles.includes('student')) {
            const [enrollments] = await db.execute(`
                SELECT id FROM ENROLLMENT 
                WHERE course_id = ? AND student_id = ? AND status = 'active'
            `, [courseId, userId]);

            if (enrollments.length > 0) return true;
        }

        return false;
    },

    async verifyCourseTeacher(teacherId, courseId) {
        const [courses] = await db.execute(`
            SELECT id FROM COURSE WHERE id = ? AND teacher_id = ?
        `, [courseId, teacherId]);

        return courses.length > 0;
    },

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
        await db.execute(`
            DELETE FROM MATERIAL_SECTION WHERE id = ?
        `, [sectionId]);
    }
};