import express from "express";
import { updateProgress } from "../controllers/progressController";
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

export default router;
