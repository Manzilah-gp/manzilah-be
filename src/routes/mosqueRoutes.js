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

// All routes are protected and require ministry_admin role
router.post("/", verifyToken, checkRole(["ministry_admin"]), createMosque);
router.get("/", verifyToken, checkRole(["ministry_admin"]), getMosques);
router.get("/search", verifyToken, checkRole(["ministry_admin"]), searchMosques);
router.get("/governorate/:governorate", verifyToken, checkRole(["ministry_admin"]), getMosquesByGovernorate);
router.get("/:id", verifyToken, checkRole(["ministry_admin"]), getMosqueById);
router.put("/:id", verifyToken, checkRole(["ministry_admin"]), updateMosque);
router.delete("/:id", verifyToken, checkRole(["ministry_admin"]), deleteMosque);

export default router;