import db from "../config/db.js";

/**
 * User Model - Handles all database operations for users
 */
class UserModel {
    /**
     * Check if email already exists
     */
    static async findByEmail(email) {
        const [users] = await db.query(
            "SELECT * FROM USER WHERE email = ?",
            [email]
        );
        return users[0] || null;
    }

    /**
     * Create a new user
     */
    static async createUser(userData) {
        const { full_name, email, phone, password_hash, dob, gender } = userData;

        const [result] = await db.query(
            `INSERT INTO USER (full_name, email, phone, password_hash, dob, gender)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [full_name, email, phone, password_hash, dob, gender]
        );

        return result.insertId;
    }

    /**
     * Insert user location
     */
    static async createUserLocation(userId, address) {
        const [result] = await db.query(
            `INSERT INTO USER_LOCATION 
             (user_id, address_line1, address_line2, region, governorate, 
              postal_code, latitude, longitude)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                address.address_line1 || null,
                address.address_line2 || null,
                address.region || null,
                address.governorate || null,
                address.postal_code || null,
                address.latitude || null,
                address.longitude || null
            ]
        );
        return result.insertId;
    }

    /**
     * Assign role to user
     */
    static async assignRole(userId, roleId, mosqueId = null, isActive = true) {
        await db.query(
            "INSERT INTO ROLE_ASSIGNMENT (user_id, role_id, mosque_id, is_active) VALUES (?, ?, ?, ?)",
            [userId, roleId, mosqueId, isActive]
        );
    }

    /**
     * Get role ID by name
     */
    static async getRoleByName(roleName) {
        const [roles] = await db.query(
            "SELECT id FROM ROLE WHERE name = ?",
            [roleName]
        );
        return roles[0] || null;
    }

    /**
     * Get user roles
     */
    static async getUserRoles(userId) {
        const [roles] = await db.query(
            `SELECT R.name, RA.is_active, RA.mosque_id
             FROM ROLE_ASSIGNMENT RA
             JOIN ROLE R ON RA.role_id = R.id
             WHERE RA.user_id = ?`,
            [userId]
        );
        return roles;
    }

    /**
     * Get user's children (for parents)
     */
    static async getUserChildren(userId) {
        const [children] = await db.query(
            `SELECT U.id, U.full_name, U.dob, U.email
             FROM PARENT_CHILD_RELATIONSHIP PCR
             JOIN USER U ON PCR.child_id = U.id
             WHERE PCR.parent_id = ? AND PCR.is_verified = TRUE`,
            [userId]
        );
        return children;
    }

    /**
     * Update user's password
     */
    static async updatePassword(userId, newHashedPassword) {
        try {
            const connection = await db.getConnection();
            await connection.query(
                "UPDATE USER SET password_hash = ? WHERE id = ?",
                [newHashedPassword, userId]
            );
            connection.release();
        } catch (err) {
            console.error("❌ Error updating password:", err);
            throw err;
        }
    }

    /**
     * Retrieves the password hash for a given user.
     * @param {number} userId - The ID of the user.
     * @returns {Promise<Object>} - The user object with password_hash.
     */
    static async getUserPasswordHash(userId) {
        const query = 'SELECT password_hash FROM USER WHERE id = ?';
        const [rows] = await db.execute(query, [userId]);
        return rows[0];
    }

    /**
     * Updates the password hash for a user.
     * @param {number} userId - The ID of the user.
     * @param {string} newPasswordHash - The new hashed password.
     * @returns {Promise<Object>} - The query result.
     */
    static async updatePassword(userId, newPasswordHash) {
        const query = 'UPDATE USER SET password_hash = ? WHERE id = ?';
        const [result] = await db.execute(query, [newPasswordHash, userId]);
        return result;
    }



    /**
     * Save verification code for a user
     * Creates the table if it doesn't exist.
     */
    static async saveVerificationCode(userId, code, expiresAt) {
        const connection = await db.getConnection();
        try {
            // Ensure table exists (temporary solution, ideally use migrations)
            await connection.query(`
                CREATE TABLE IF NOT EXISTS VERIFICATION_CODES (
                    user_id INT PRIMARY KEY,
                    code VARCHAR(10) NOT NULL,
                    expires_at DATETIME NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES USER(id) ON DELETE CASCADE
                )
            `);

            // Insert or Update
            await connection.query(
                `INSERT INTO VERIFICATION_CODES (user_id, code, expires_at)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at)`,
                [userId, code, expiresAt]
            );
        } finally {
            connection.release();
        }
    }

    /**
     * Get verification code for a user
     */
    static async getVerificationCode(userId) {
        // Build table just in case read happens before write (unlikely in this flow but safe)
        // Actually, if table doesn't exist, this will error. 
        // We assume saveVerificationCode is called first, or we catch the error.
        try {
            const [rows] = await db.query(
                "SELECT * FROM VERIFICATION_CODES WHERE user_id = ?",
                [userId]
            );
            return rows[0] || null;
        } catch (err) {
            // If table doesn't exist, return null
            if (err.code === 'ER_NO_SUCH_TABLE') return null;
            throw err;
        }
    }

    /**
     * Delete verification code after use
     */
    static async deleteVerificationCode(userId) {
        try {
            await db.query("DELETE FROM VERIFICATION_CODES WHERE user_id = ?", [userId]);
        } catch (err) {
            // Ignore if table missing
        }
    }
}

export default UserModel;
