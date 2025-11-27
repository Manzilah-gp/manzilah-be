// backend/models/MosqueModel.js
import db from "../config/db.js";

export const MosqueModel = {
    // ✅ Create a new mosque with location (transaction)
    async createWithLocation(mosqueData, locationData, createdBy) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Insert into MOSQUE table WITH created_by
            const [mosqueResult] = await connection.execute(
                `INSERT INTO MOSQUE (name, contact_number, mosque_admin_id, created_by) 
                 VALUES (?, ?, ?, ?)`,
                [
                    mosqueData.name,
                    mosqueData.contact_number || null,
                    mosqueData.mosque_admin_id || null,
                    createdBy
                ]
            );

            const mosqueId = mosqueResult.insertId;

            // Insert into MOSQUE_LOCATION table
            await connection.execute(
                `INSERT INTO MOSQUE_LOCATION 
                 (mosque_id, latitude, longitude, address, region, governorate, postal_code) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    mosqueId,
                    parseFloat(locationData.latitude),
                    parseFloat(locationData.longitude),
                    locationData.address || '',
                    locationData.region || '',
                    locationData.governorate || '',
                    locationData.postal_code || ''
                ]
            );

            await connection.commit();
            return mosqueId;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },


    async findAll() {
        const [mosques] = await db.execute(`
        SELECT 
            m.id,
            m.name,
            m.contact_number,
            ml.governorate,
            ml.region,
            ml.address,
            u.full_name as admin_name
        FROM MOSQUE m
        LEFT JOIN MOSQUE_LOCATION ml ON m.id = ml.mosque_id
        LEFT JOIN USER u ON m.mosque_admin_id = u.id
        ORDER BY m.name ASC
    `);
        return mosques;
    },


    async findById(mosqueId) {
        const [mosques] = await db.execute(`
        SELECT 
            m.id,
            m.name,
            m.contact_number,
            m.mosque_admin_id,
            m.created_by,
            m.created_at,
            ml.latitude,
            ml.longitude,
            ml.address,
            ml.region,
            ml.governorate,
            ml.postal_code,
            u.full_name as admin_name
        FROM MOSQUE m
        LEFT JOIN MOSQUE_LOCATION ml ON m.id = ml.mosque_id
        LEFT JOIN USER u ON m.mosque_admin_id = u.id
        WHERE m.id = ?
    `, [mosqueId]);

        return mosques.length > 0 ? mosques[0] : null;
    },

    // ✅ Update mosque information - FIXED
    async update(mosqueId, mosqueData) {
        console.log('Updating mosque with ID:', mosqueId, 'Data:', mosqueData);

        const [result] = await db.execute(
            `UPDATE MOSQUE 
             SET name = ?, contact_number = ?, mosque_admin_id = ?
             WHERE id = ?`,
            [
                mosqueData.name,
                mosqueData.contact_number || null,
                mosqueData.mosque_admin_id || null,
                mosqueId
            ]
        );

        console.log('Mosque update result:', result);
        return result;
    },

    // ✅ Update mosque location - FIXED
    async updateLocation(mosqueId, locationData) {
        console.log('Updating location for mosque ID:', mosqueId, 'Data:', locationData);

        // Check if location exists for this mosque
        const [existingLocation] = await db.execute(
            "SELECT id FROM MOSQUE_LOCATION WHERE mosque_id = ?",
            [mosqueId]
        );

        let result;

        if (existingLocation.length > 0) {
            // Update existing location
            [result] = await db.execute(
                `UPDATE MOSQUE_LOCATION 
                 SET latitude = ?, longitude = ?, address = ?, region = ?, governorate = ?, postal_code = ?
                 WHERE mosque_id = ?`,
                [
                    parseFloat(locationData.latitude),
                    parseFloat(locationData.longitude),
                    locationData.address || '',
                    locationData.region || '',
                    locationData.governorate || '',
                    locationData.postal_code || '',
                    mosqueId
                ]
            );
        }

        console.log('Location update result:', result);
        return result;
    },

    // ✅ Delete mosque (location will be deleted automatically due to CASCADE)
    async delete(mosqueId) {
        const [result] = await db.execute(
            "DELETE FROM MOSQUE WHERE id = ?",
            [mosqueId]
        );
        return result;
    },

    // ✅ Check if mosque exists
    async exists(mosqueId) {
        const [rows] = await db.execute(
            "SELECT id FROM MOSQUE WHERE id = ?",
            [mosqueId]
        );
        return rows.length > 0;
    },

    // ✅ Find mosques by governorate
    async findByGovernorate(governorate) {
        const [mosques] = await db.execute(`
            SELECT 
                m.id,
                m.name,
                m.contact_number,
                ml.latitude,
                ml.longitude,
                ml.address,
                ml.region,
                ml.governorate
            FROM MOSQUE m
            JOIN MOSQUE_LOCATION ml ON m.id = ml.mosque_id
            WHERE ml.governorate = ?
            ORDER BY m.name
        `, [governorate]);

        return mosques;
    },

    // ✅ Search mosques by name
    async searchByName(searchTerm) {
        const [mosques] = await db.execute(`
            SELECT 
                m.id,
                m.name,
                m.contact_number,
                ml.latitude,
                ml.longitude,
                ml.address,
                ml.region,
                ml.governorate
            FROM MOSQUE m
            JOIN MOSQUE_LOCATION ml ON m.id = ml.mosque_id
            WHERE m.name LIKE ?
            ORDER BY m.name
        `, [`%${searchTerm}%`]);

        return mosques;
    }
};