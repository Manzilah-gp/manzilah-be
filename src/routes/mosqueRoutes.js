import express from "express";
import {
    createMosque,
    getMosques,
    getMosqueById,
    updateMosque,
    deleteMosque,
    getMosquesByGovernorate,
    searchMosques
} from "../controllers/mosqueController.js";
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ✅ PUBLIC READ ROUTES - Any authenticated user can fetch mosques
router.get("/", getMosques);
router.get("/search", verifyToken, searchMosques);
router.get("/governorate/:governorate", getMosquesByGovernorate);
router.get("/:id", verifyToken, getMosqueById);

// ✅ PROTECTED WRITE ROUTES - Only ministry_admin can modify
router.post("/", verifyToken, checkRole(["ministry_admin"]), createMosque);
router.put("/:id", verifyToken, checkRole(["ministry_admin"]), updateMosque);
router.delete("/:id", verifyToken, checkRole(["ministry_admin"]), deleteMosque);

export default router;