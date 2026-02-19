import express from "express";
import { getMobileCourses } from "../controllers/mobileController";
// import { protect } from "../middlewares/authMiddleware"; // Add protection later if needed

const router = express.Router();

// Public endpoint for mobile app specific format
router.get("/courses", getMobileCourses);

// Potential future endpoints
// router.get("/courses/:id", getMobileCourseDetails);

export default router;
