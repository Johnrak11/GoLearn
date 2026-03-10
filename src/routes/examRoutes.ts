import express from "express";
import {
  getExamByCourse,
  checkEligibility,
  createExam,
  updateExam,
  deleteExam,
  submitExam,
  getMyAttempts,
} from "../controllers/examController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Exams
 *   description: Course final exam endpoints. Students must complete all lesson quizzes before taking an exam.
 */

/**
 * @swagger
 * /exams/course/{courseId}:
 *   get:
 *     summary: Get exam for a course
 *     description: Returns the exam with questions and options. Instructors/admins see correct answers; students do not.
 *     tags: [Exams]
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
 *         description: Exam details with questions
 *       404:
 *         description: No exam found for this course
 */
router.get("/course/:courseId", authenticate, getExamByCourse);

/**
 * @swagger
 * /exams/course/{courseId}/eligibility:
 *   get:
 *     summary: Check if student can take the exam
 *     description: Returns whether the authenticated student has completed all required lesson quizzes. Must be enrolled in the course.
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Eligibility check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eligible:
 *                   type: boolean
 *                   example: true
 *                 reason:
 *                   type: string
 *                   example: "All lesson quizzes completed"
 *                 incomplete_lessons:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 */
router.get("/course/:courseId/eligibility", authenticate, checkEligibility);

/**
 * @swagger
 * /exams/course/{courseId}/my-attempts:
 *   get:
 *     summary: Get my exam attempts for a course
 *     description: Returns all previous exam attempts for the authenticated student.
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of exam attempts
 */
router.get("/course/:courseId/my-attempts", authenticate, getMyAttempts);

/**
 * @swagger
 * /exams/course/{courseId}:
 *   post:
 *     summary: Create exam for a course (Instructor/Admin)
 *     description: Creates a course final exam with questions and options. One exam per course.
 *     tags: [Exams]
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
 *               - questions
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Final Exam"
 *               description:
 *                 type: string
 *               passing_score:
 *                 type: number
 *                 default: 70
 *               time_limit:
 *                 type: number
 *                 description: Time limit in minutes (null = no limit)
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - prompt
 *                     - type
 *                     - options
 *                   properties:
 *                     prompt:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [MULTIPLE_CHOICE, TRUE_FALSE, SINGLE_CHOICE]
 *                     points:
 *                       type: number
 *                       default: 1
 *                     options:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           text:
 *                             type: string
 *                           is_correct:
 *                             type: boolean
 *     responses:
 *       201:
 *         description: Exam created
 *       400:
 *         description: Validation error or exam already exists
 *       403:
 *         description: Forbidden
 */
router.post(
  "/course/:courseId",
  authenticate,
  authorize(["instructor", "admin"]),
  createExam,
);

/**
 * @swagger
 * /exams/{id}:
 *   patch:
 *     summary: Update exam (Instructor/Admin)
 *     description: Update exam info and/or replace all questions.
 *     tags: [Exams]
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
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               passing_score:
 *                 type: number
 *               time_limit:
 *                 type: number
 *               questions:
 *                 type: array
 *                 description: If provided, replaces ALL existing questions
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Exam updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Exam not found
 */
router.patch(
  "/:id",
  authenticate,
  authorize(["instructor", "admin"]),
  updateExam,
);

/**
 * @swagger
 * /exams/{id}:
 *   delete:
 *     summary: Delete exam (Instructor/Admin)
 *     tags: [Exams]
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
 *         description: Exam deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Exam not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize(["instructor", "admin"]),
  deleteExam,
);

/**
 * @swagger
 * /exams/{id}/submit:
 *   post:
 *     summary: Submit exam answers (Student)
 *     description: |
 *       Submit answers for a course exam. The system automatically:
 *       1. **Checks eligibility** — student must have completed all lesson quizzes
 *       2. **Grades the exam** — calculates score based on correct answers
 *       3. **Marks enrollment as COMPLETED** — if student passes
 *
 *       If the student is not eligible (hasn't completed all quizzes), a 403 is returned with the list of incomplete lessons.
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exam UUID
 *       - in: query
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course UUID (needed for enrollment verification)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answers
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - question_id
 *                     - option_id
 *                   properties:
 *                     question_id:
 *                       type: string
 *                       format: uuid
 *                     option_id:
 *                       type: string
 *                       format: uuid
 *     responses:
 *       200:
 *         description: Exam result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 score:
 *                   type: number
 *                   example: 85
 *                 passed:
 *                   type: boolean
 *                   example: true
 *                 attempt_id:
 *                   type: string
 *                 passing_score:
 *                   type: number
 *                   example: 70
 *       403:
 *         description: Not eligible — incomplete lesson quizzes
 */
router.post("/:id/submit", authenticate, submitExam);

export default router;
