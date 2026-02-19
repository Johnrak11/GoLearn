import express from "express";
import { getForumPosts, createForumPost } from "../controllers/forumController";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Forum
 *   description: Forum endpoints
 */

/**
 * @swagger
 * /forum/courses/{courseId}:
 *   get:
 *     summary: Get forum posts for a course
 *     tags: [Forum]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of forum posts
 */
router.get("/courses/:courseId", authenticate, getForumPosts);

/**
 * @swagger
 * /forum:
 *   post:
 *     summary: Create a forum post
 *     tags: [Forum]
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
 *               - content
 *             properties:
 *               course_id:
 *                 type: string
 *               content:
 *                 type: string
 *               parent_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Post created
 */
router.post("/", authenticate, createForumPost);

export default router;
