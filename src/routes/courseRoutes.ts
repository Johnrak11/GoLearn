import express from "express";
import {
  createCourse,
  getCourses,
  getCourseById,
  getCourseByIdRaw,
  listInstructorCourses,
  updateCourse,
  deleteCourse,
  toggleCourseStatus,
} from "../controllers/courseController";
import {
  createModule,
  updateModule,
  deleteModule,
} from "../controllers/moduleController";
import {
  createLesson,
  updateLesson,
  deleteLesson,
} from "../controllers/lessonController";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Courses
 *   description: Course management endpoints (supports both Web & Mobile)
 */

/**
 * @swagger
 * /courses:
 *   get:
 *     summary: List all published courses
 *     description: |
 *       Returns all published courses with search and category filtering.
 *       Supports both Web and Mobile clients.
 *       - Use `?format=mobile` to get the mobile-friendly JSON format.
 *       - Use `?search=keyword` to search by course title.
 *       - Use `?category=tagName` to filter by tag/category.
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search courses by title (partial match)
 *         example: "Python"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter courses by tag/category name (exact match)
 *         example: "Development"
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [mobile]
 *         description: Set to "mobile" to get mobile-friendly response format
 *     responses:
 *       200:
 *         description: List of published courses
 *       500:
 *         description: Internal server error
 */
router.get("/", getCourses);

/**
 * @swagger
 * /courses/my-courses:
 *   get:
 *     summary: List instructor's own courses
 *     description: Returns courses owned by the authenticated instructor. Admins see all courses.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of instructor's courses
 *       401:
 *         description: Unauthorized
 */
router.get("/my-courses", authenticate, listInstructorCourses);

/**
 * @swagger
 * /courses:
 *   post:
 *     summary: Create a new course
 *     description: Only instructors and admins can create courses.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - price
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *               description:
 *                 type: string
 *                 minLength: 10
 *               price:
 *                 type: number
 *                 minimum: 0
 *               thumbnail_url:
 *                 type: string
 *                 format: uri
 *     responses:
 *       201:
 *         description: Course created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - Not an instructor or admin
 */
router.post("/", authenticate, createCourse);

/**
 * @swagger
 * /courses/{id}:
 *   get:
 *     summary: Get course details by ID
 *     description: Returns full course details with curriculum. Locked content is hidden for non-enrolled users.
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course UUID
 *     responses:
 *       200:
 *         description: Course details
 *       404:
 *         description: Course not found
 */
router.get("/:id", getCourseById);

/**
 * @swagger
 * /courses/{id}/raw:
 *   get:
 *     summary: Get raw course data (internal use)
 *     description: Returns raw Prisma course data for dashboard/edit views.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Raw course data
 *       404:
 *         description: Course not found
 */
router.get("/:id/raw", authenticate, getCourseByIdRaw);

/**
 * @swagger
 * /courses/{id}:
 *   patch:
 *     summary: Update a course
 *     description: Update course details. Only the course owner or admin can update.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               image_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Course updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Course not found
 */
router.patch("/:id", authenticate, updateCourse);

/**
 * @swagger
 * /courses/{id}:
 *   delete:
 *     summary: Delete a course
 *     description: Only the course owner or admin can delete.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Course not found
 */
router.delete("/:id", authenticate, deleteCourse);

/**
 * @swagger
 * /courses/{id}/status:
 *   patch:
 *     summary: Toggle course status
 *     description: Change course status to PUBLISHED, DRAFT, or ARCHIVED.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PUBLISHED, DRAFT, ARCHIVED]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status
 *       403:
 *         description: Forbidden
 */
router.patch("/:id/status", authenticate, toggleCourseStatus);

// ============ Module Routes ============

/**
 * @swagger
 * /courses/{courseId}/modules:
 *   post:
 *     summary: Create a module for a course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: Module created
 */
router.post("/:courseId/modules", authenticate, createModule);

/**
 * @swagger
 * /courses/modules/{id}:
 *   patch:
 *     summary: Update a module
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Module updated
 */
router.patch("/modules/:id", authenticate, updateModule);

/**
 * @swagger
 * /courses/modules/{id}:
 *   delete:
 *     summary: Delete a module
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Module deleted
 */
router.delete("/modules/:id", authenticate, deleteModule);

// ============ Lesson Routes ============

/**
 * @swagger
 * /courses/modules/{moduleId}/lessons:
 *   post:
 *     summary: Create a lesson in a module
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [VIDEO, TEXT, QUIZ, PDF]
 *     responses:
 *       201:
 *         description: Lesson created
 */
router.post("/modules/:moduleId/lessons", authenticate, createLesson);

/**
 * @swagger
 * /courses/lessons/{id}:
 *   patch:
 *     summary: Update a lesson
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson updated
 */
router.patch("/lessons/:id", authenticate, updateLesson);

/**
 * @swagger
 * /courses/lessons/{id}:
 *   delete:
 *     summary: Delete a lesson
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson deleted
 */
router.delete("/lessons/:id", authenticate, deleteLesson);

export default router;
