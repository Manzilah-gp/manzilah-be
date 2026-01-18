import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

/**
 * ZEGOCLOUD Service
 * Handles token generation and meeting room management
 */
export const ZegoCloudService = {
    /**
     * Generate a meeting room ID for a course
     * Format: course_{courseId}
     */
    generateRoomId(courseId) {
        return `course_${courseId}`;
    },

    /**
     * Generate meeting URL for a course
     * This is a permanent link students/teachers can use
     */
    generateMeetingUrl(courseId) {
        const roomId = this.generateRoomId(courseId);
        // This will be your frontend meeting page URL
        return `${process.env.FRONTEND_URL || 'http://localhost:5173'}/meeting/${roomId}`;
    },

    /**
     * Generate ZEGOCLOUD access token for a user
     * This token allows them to join the specific room
     * 
     * @param {string} userId - User ID
     * @param {string} userName - User display name
     * @param {string} roomId - Meeting room ID
     * @param {number} expirationSeconds - Token validity (default 24h)
     */
    generateToken(userId, userName, roomId, expirationSeconds = 86400) {
        const appId = parseInt(process.env.ZEGOCLOUD_APP_ID);
        const serverSecret = process.env.ZEGOCLOUD_SERVER_SECRET;

        if (!appId || !serverSecret) {
            throw new Error('ZEGOCLOUD credentials not configured');
        }

        // Generate token using generic Token04 algorithm
        const token = this.generateToken04(
            appId,
            userId.toString(),
            serverSecret,
            expirationSeconds,
            ''
        );

        const expiresAt = new Date(Date.now() + expirationSeconds * 1000);

        return {
            token,
            appId,
            roomId,
            userId: userId.toString(),
            userName,
            expiresAt: expiresAt.toISOString()
        };
    },

    /**
     * ZEGOCLOUD Token04 generation algorithm
     * Reference: https://docs.zegocloud.com/article/14072
     */

    generateToken04(appId, userId, secret, effectiveTimeInSeconds, payload) {
        if (!appId || typeof appId !== 'number') {
            throw new Error('appId invalid');
        }
        if (!userId || typeof userId !== 'string') {
            throw new Error('userId invalid');
        }
        if (!secret || typeof secret !== 'string' || secret.length !== 32) {
            throw new Error('secret must be a 32 byte string');
        }

        const effectiveTime = Math.floor(Date.now() / 1000);
        const tokenInfo = {
            app_id: appId,
            user_id: userId,
            nonce: Math.floor(Math.random() * 2147483647),
            ctime: effectiveTime,
            expire: effectiveTime + effectiveTimeInSeconds,
            payload: payload || ''
        };

        const plainText = JSON.stringify(tokenInfo);

        // IV: 16 byte random string
        const iv = makeRandomString(16);

        // Key: Use the 32-byte secret directly. 
        // Use AES-256-CBC because the key length is 32 bytes (chars).
        const key = Buffer.from(secret);
        const algorithm = 'aes-256-cbc';

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(plainText, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        // Pack the token
        // Format: [8 bytes expire] [2 bytes iv length] [iv] [2 bytes content length] [content]

        const b1 = Buffer.alloc(8);
        b1.writeBigInt64BE(BigInt(tokenInfo.expire), 0);

        const b2 = Buffer.alloc(2);
        b2.writeUInt16BE(iv.length, 0);

        const b3 = Buffer.from(iv);

        const b4 = Buffer.alloc(2);
        b4.writeUInt16BE(encrypted.length, 0);

        const b5 = encrypted;

        const binary = Buffer.concat([b1, b2, b3, b4, b5]);

        return '04' + binary.toString('base64');
    },

    async generateTokenViaAPI(userId, userName, roomId) {
        try {
            const appId = process.env.ZEGOCLOUD_APP_ID;
            const serverSecret = process.env.ZEGOCLOUD_SERVER_SECRET;

            // This is a placeholder - check ZEGOCLOUD docs for actual API endpoint
            const response = await axios.post('https://zego-api.zegocloud.com/v1/token', {
                app_id: appId,
                user_id: userId,
                room_id: roomId,
                user_name: userName,
                server_secret: serverSecret
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error calling ZEGOCLOUD API:', error);
            throw new Error('Failed to generate token via API');
        }
    },

    /**
     * Validate token expiration
     */
    isTokenValid(expiresAt) {
        return new Date(expiresAt) > new Date();
    }
};

function makeRandomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

