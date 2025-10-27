import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import dotenv from "dotenv";
dotenv.config();

const calculateIsChild = (dob) => {
    const birthDate = new Date(dob);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return age < 13;
};

export const register = async (req, res) => {
    console.log("Register route hit ");

    const { full_name, email, phone, password, dob, gender, roles = ["student"] } = req.body;

    if (!email || !password || !full_name || !gender || !dob) {
        return res.status(400).json({ message: "Full name, email, password, gender, and date of birth are required." });
    }

    try {
        const [existing] = await db.query("SELECT * FROM USER WHERE email = ?", [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const is_child = calculateIsChild(dob);

        const [result] = await db.query(
            `INSERT INTO USER (full_name, email, phone, password_hash, dob, gender, is_child)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [full_name, email, phone, password_hash, dob, gender, is_child]
        );

        const userId = result.insertId;

        // Assign one or more roles
        for (const role_name of roles) {
            const [roleData] = await db.query("SELECT id FROM ROLE WHERE name = ?", [role_name]);
            if (roleData.length > 0) {
                const roleId = roleData[0].id;
                await db.query("INSERT INTO ROLE_ASSIGNMENT (user_id, role_id) VALUES (?, ?)", [userId, roleId]);
            }
        }

        res.status(201).json({ message: "User registered successfully!", userId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database error", error: err });
    }
};

export const login = async (req, res) => {
    console.log("Login route hit ");

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    try {
        const [results] = await db.query("SELECT * FROM USER WHERE email = ?", [email]);
        if (results.length === 0) return res.status(401).json({ message: "No such email" });

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

        // Fetch roles
        const [roleRows] = await db.query(`
      SELECT R.name
      FROM ROLE_ASSIGNMENT RA
      JOIN ROLE R ON RA.role_id = R.id
      WHERE RA.user_id = ?
    `, [user.id]);

        const roles = roleRows.map(r => r.name);

        // Fetch children if user is a parent

        let children = [];
        if (roles.includes("parent")) {
            const [childRows] = await db.query(`
            SELECT id, full_name, dob, email
            FROM USER
            WHERE parent_id = ? AND is_child = TRUE
          `, [user.id]);
            children = childRows;
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, roles },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                roles,
                children,
                approved: user.approved,
                is_child: user.is_child
            },
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database error", error: err });
    }
};

