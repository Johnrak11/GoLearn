import { Router } from "express";
import * as enrollmentController from "../controllers/enrollmentController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Enrollments
 *   description: Enrollment management endpoints
 */

/**
 * @swagger
 * /enrollments/my-courses:
 *   get:
 *     summary: Get user's enrolled courses
 *     description: Returns all courses the authenticated user is enrolled in.
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of enrollments
 *       401:
 *         description: Unauthorized
 */
router.get("/my-courses", authenticate, enrollmentController.getMyEnrollments);

/**
 * @swagger
 * /enrollments/{courseId}/status:
 *   get:
 *     summary: Check enrollment status
 *     description: Check if the authenticated user is enrolled in a specific course.
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course UUID
 *     responses:
 *       200:
 *         description: Enrollment status
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/:courseId/status",
  authenticate,
  enrollmentController.checkEnrollment,
);

/**
 * @swagger
 * /enrollments/{courseId}:
 *   post:
 *     summary: Enroll in a course
 *     description: Enroll the authenticated user in a course. Only free courses can be enrolled directly.
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course UUID
 *     responses:
 *       201:
 *         description: Successfully enrolled
 *       400:
 *         description: Already enrolled or course requires payment
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.post("/:courseId", authenticate, enrollmentController.enrollUser);

export default router;
