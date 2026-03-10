import express from "express";
import { getMobileCourses } from "../controllers/mobileController";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Mobile
 *   description: Mobile-optimized API endpoints (Android/iOS format)
 */

/**
 * @swagger
 * /mobile/courses:
 *   get:
 *     summary: Get courses in mobile format
 *     description: Returns published courses formatted specifically for the mobile app, including curriculum, pricing, tags, and instructor info.
 *     tags: [Mobile]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by course title
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category/tag name
 *     responses:
 *       200:
 *         description: List of courses in mobile format
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   course_image:
 *                     type: string
 *                   instructor:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       rating:
 *                         type: number
 *                   curriculum:
 *                     type: array
 *                   pricing:
 *                     type: object
 *                     properties:
 *                       amount:
 *                         type: number
 *                       currency:
 *                         type: string
 *                       discount_available:
 *                         type: boolean
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 */
router.get("/courses", getMobileCourses);

export default router;
