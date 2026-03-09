import express from "express";
import {
    updateCourseProgress,
    updateProgress,
} from "../controllers/progressController";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Progress
 *   description: Progress tracking endpoints
 */

/**
 * @swagger
 * /progress/update:
 *   post:
 *     summary: Update lesson progress
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lesson_id
 *               - is_completed
 *             properties:
 *               lesson_id:
 *                 type: string
 *               is_completed:
 *                 type: boolean
 *               last_watched_position:
 *                 type: number
 *     responses:
 *       200:
 *         description: Progress updated
 */
router.post("/update", authenticate, updateProgress);

/**
 * @swagger
 * /progress/course:
 *   post:
 *     summary: Update course progress (mark lesson complete within a course)
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - course_id
 *               - lesson_id
 *             properties:
 *               course_id:
 *                 type: string
 *               lesson_id:
 *                 type: string
 *               is_completed:
 *                 type: boolean
 *               last_watched_position:
 *                 type: number
 *     responses:
 *       200:
 *         description: Course progress updated
 */
router.patch("/course", authenticate, updateCourseProgress);

export default router;
