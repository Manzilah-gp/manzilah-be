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
    static async assignRole(userId, roleId, mosqueId = null, isActive = false) {
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
}

export default UserModel;
