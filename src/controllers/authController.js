// backend/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import UserModel from "../models/UserModel.js";
import TeacherModel from "../models/TeacherModel.js";
import { sendEmail } from "../services/emailService.js";
import dotenv from "dotenv";
dotenv.config();


/**
 * STANDARD USER REGISTRATION
 */
export const register = async (req, res) => {
    console.log("📝 Register route hit");

    const {
        name, // Frontend sends 'name'
        email,
        phone,
        password,
        date_of_birth, // Frontend sends 'date_of_birth'
        gender,
        address,
        roles = []
    } = req.body;

    // Map frontend field names to database field names
    const full_name = name || req.body.full_name;
    const dob = date_of_birth || req.body.dob;

    if (!email || !password || !full_name || !gender || !dob) {
        return res.status(400).json({
            message: "Full name, email, password, gender, and date of birth are required."
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Check existing email
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            await connection.rollback();
            return res.status(400).json({ message: "Email already exists" });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create user
        const userId = await UserModel.createUser({
            full_name,
            email,
            phone,
            password_hash,
            dob,
            gender
        });

        // Insert location if provided
        if (address && address.address_line1) {
            await UserModel.createUserLocation(userId, address);
        }

        // Assign roles (if paraent or teacher) parent -> from checkbox
        for (const role_name of roles) {
            const role = await UserModel.getRoleByName(role_name);
            if (role) {
                await UserModel.assignRole(userId, role.id);
            }
        }

        await connection.commit();

        res.status(201).json({
            message: "User registered successfully!",
            userId
        });

    } catch (err) {
        await connection.rollback();
        console.error("❌ Registration error:", err);
        res.status(500).json({
            message: "Database error",
            error: err.message
        });
    } finally {
        connection.release();
    }
};

/**
 * TEACHER REGISTRATION
 */
export const registerTeacher = async (req, res) => {
    console.log("👨‍🏫 Teacher registration route hit");

    const {
        full_name,
        email,
        phone,
        password,
        dob,
        gender,
        address,
        certification,
        expertise = [],
        availability = [],
        preferred_mosques = []
    } = req.body;

    if (!email || !password || !full_name || !gender || !dob) {
        return res.status(400).json({
            message: "Full name, email, password, gender, and date of birth are required."
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Check existing email
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            await connection.rollback();
            return res.status(400).json({ message: "Email already exists" });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create user
        const userId = await UserModel.createUser({
            full_name,
            email,
            phone,
            password_hash,
            dob,
            gender
        });

        // Assign teacher role (inactive until approved)
        // const teacherRole = await UserModel.getRoleByName('teacher');
        // if (teacherRole) {
        //     await UserModel.assignRole(userId, teacherRole.id, null, false);
        // }

        // Insert location
        if (address) {
            await UserModel.createUserLocation(userId, address);
        }

        // Insert teacher certification
        if (certification) {
            await TeacherModel.createCertification(userId, certification);
        }

        // Insert teacher expertise
        if (expertise && expertise.length > 0) {
            await TeacherModel.addExpertise(userId, expertise);
        }

        // Insert availability
        if (availability && availability.length > 0) {
            await TeacherModel.addAvailability(userId, availability);
        }

        // Insert mosques
        if (preferred_mosques && preferred_mosques.length > 0) {
            await TeacherModel.assignToMosques(userId, preferred_mosques);
        }

        await connection.commit();

        res.status(201).json({
            message: "Teacher registration submitted successfully! Awaiting approval.",
            userId
        });

    } catch (err) {
        await connection.rollback();
        console.error("❌ Teacher registration error:", err);
        res.status(500).json({
            message: "Database error",
            error: err.message
        });
    } finally {
        connection.release();
    }
};

/**
 * LOGIN
 */
export const login = async (req, res) => {
    console.log("🔐 Login route hit");

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    try {
        const user = await UserModel.findByEmail(email);

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // First try comparing as hashed password
        let isMatch = await bcrypt.compare(password, user.password_hash);

        // If not matched, check if plain-text password matches
        if (!isMatch && password === user.password_hash) {
            // Update the password in DB to hashed version
            const newHashedPassword = await bcrypt.hash(password, 10);
            await UserModel.updatePassword(user.id, newHashedPassword);
            isMatch = true;
            console.log("✅ Detected plain-text password. Updated to hashed password.");
        }

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Fetch roles
        const roleRows = await UserModel.getUserRoles(user.id);
        const roles = roleRows.map(r => r.name);
        const activeRoles = roleRows.filter(r => r.is_active).map(r => r.name);

        // Fetch children if parent
        let children = [];
        if (roles.includes("parent")) {
            children = await UserModel.getUserChildren(user.id);
        }

        // Generate JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                roles: activeRoles
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                roles,
                activeRoles,
                children,
            }
        });

    } catch (err) {
        console.error("❌ Login error:", err);
        res.status(500).json({ message: "Database error", error: err.message });
    }
};

/**
 * GENERATE AND SEND VERIFICATION CODE
 */
export const sendVerificationCode = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required." });
        }

        const user = await UserModel.findByEmail(email);
        if (!user) {
            // For security, don't reveal if user exists
            return res.json({
                message: "If an account exists with this email, a verification code has been sent."
            });
        }

        const userId = user.id;

        // Generate 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        // Expires in 15 minutes
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // Save to DB
        await UserModel.saveVerificationCode(userId, code, expiresAt);

        // Send Email
        const subject = "Your Verification Code - Manzilah";
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset Verification</h2>
                <p>Hello,</p>
                <p>You requested to reset your password. Use the verification code below:</p>
                <div style="background-color: #f4f4f4; padding: 15px; text-align: center; margin: 20px 0;">
                    <h1 style="margin: 0; color: #007bff; letter-spacing: 5px;">${code}</h1>
                </div>
                <p>This code will expire in 15 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">© ${new Date().getFullYear()} Manzilah. All rights reserved.</p>
            </div>
        `;

        await sendEmail(email, subject, html);

        res.json({
            message: "Verification code sent to your email.",
            // Don't send code in production, only for testing
            ...(process.env.NODE_ENV === 'development' && { code })
        });

    } catch (err) {
        console.error("Error sending verification code:", err);

        // Better error messages
        if (err.message.includes('Failed to send email')) {
            return res.status(500).json({
                message: "Failed to send email. Please try again later."
            });
        }

        res.status(500).json({ message: "Failed to send verification code." });
    }
};


export const changePassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: 'Email, verification code, and new password are required' });
        }

        const user = await UserModel.findByEmail(email);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = user.id;

        // 1. Verify Code
        const record = await UserModel.getVerificationCode(userId);
        if (!record) {
            return res.status(400).json({ message: 'Invalid or expired verification code.' });
        }

        if (record.code !== code) {
            return res.status(400).json({ message: 'Incorrect verification code.' });
        }

        if (new Date(record.expires_at) < new Date()) {
            return res.status(400).json({ message: 'Verification code has expired.' });
        }

        // 2. Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 3. Update the password in DB
        await UserModel.updatePassword(userId, hashedPassword);

        // 4. Delete the used code
        await UserModel.deleteVerificationCode(userId);

        res.status(200).json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};