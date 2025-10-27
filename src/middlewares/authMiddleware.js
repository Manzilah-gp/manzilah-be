import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(403).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Invalid or expired token" });

        req.user = decoded;
        next();
    });
};

// Allow access if user has *any* of the required roles
export const checkRole = (allowedRoles) => {
    return (req, res, next) => {

        const userRoles = req.user.roles || [];
        const hasAccess = allowedRoles.some((role) => userRoles.includes(role));

        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied. Insufficient role." });
        }
        next();
    };
};
