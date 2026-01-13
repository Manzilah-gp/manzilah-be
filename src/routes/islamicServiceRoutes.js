// routes/islamicServiceRoutes.js
import express from "express";
import {
  getPrayerTimes,
  getQiblaDirection,
  getHijriDate,
  getMonthlyPrayerTimes,
} from "../controllers/islamicServiceController.js";

const router = express.Router();

// Get prayer times for specific date and location
router.get("/prayer-times", getPrayerTimes);

// Get monthly prayer times calendar
router.get("/prayer-times/monthly", getMonthlyPrayerTimes);

// Get Qibla direction based on coordinates
router.get("/qibla", getQiblaDirection);

// Get Hijri date for a Gregorian date
router.get("/hijri-date", getHijriDate);

export default router;