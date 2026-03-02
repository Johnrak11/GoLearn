import express from "express";
import {
  getQuiz,
  getQuizByLesson,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  submitQuiz,
} from "../controllers/quizController";
import { authenticate, authorize } from "../middlewares/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Quizzes
 *   description: Quiz management and submission endpoints
 */

/**
 * @swagger
 * /quizzes/lesson/{lessonId}:
 *   get:
 *     summary: Get quiz by lesson ID
 *     description: Returns the quiz (with questions and options) linked to a specific lesson.
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson UUID
 *     responses:
 *       200:
 *         description: Quiz details with questions and options
 *       404:
 *         description: No quiz found for this lesson
 */
router.get("/lesson/:lessonId", authenticate, getQuizByLesson);

/**
 * @swagger
 * /quizzes/lesson/{lessonId}:
 *   post:
 *     summary: Create a quiz for a lesson
 *     description: Creates a new quiz with questions and answer options for the specified lesson. Only instructors and admins can create quizzes.
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson UUID
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
 *                 example: "Module 1 Quiz"
 *               passing_score:
 *                 type: number
 *                 default: 70
 *                 example: 70
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
 *                       example: "What is 2 + 2?"
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
 *                         required:
 *                           - text
 *                           - is_correct
 *                         properties:
 *                           text:
 *                             type: string
 *                             example: "4"
 *                           is_correct:
 *                             type: boolean
 *                             example: true
 *     responses:
 *       201:
 *         description: Quiz created successfully
 *       400:
 *         description: Validation error or quiz already exists for this lesson
 *       403:
 *         description: Forbidden - Not an instructor or admin
 */
router.post(
  "/lesson/:lessonId",
  authenticate,
  authorize(["instructor", "admin"]),
  createQuiz,
);

/**
 * @swagger
 * /quizzes/{id}:
 *   get:
 *     summary: Get quiz details
 *     description: Returns quiz details with questions and options (without correct answers for students).
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz UUID
 *     responses:
 *       200:
 *         description: Quiz details
 *       404:
 *         description: Quiz not found
 */
router.get("/:id", authenticate, getQuiz);

/**
 * @swagger
 * /quizzes/{id}:
 *   patch:
 *     summary: Update a quiz
 *     description: Update quiz title, passing score, and/or replace all questions. Only instructors and admins can update quizzes.
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               passing_score:
 *                 type: number
 *               questions:
 *                 type: array
 *                 description: If provided, replaces ALL existing questions
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
 *       200:
 *         description: Quiz updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Quiz not found
 */
router.patch(
  "/:id",
  authenticate,
  authorize(["instructor", "admin"]),
  updateQuiz,
);

/**
 * @swagger
 * /quizzes/{id}:
 *   delete:
 *     summary: Delete a quiz
 *     description: Permanently deletes a quiz and all its questions and options. Only instructors and admins can delete quizzes.
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz UUID
 *     responses:
 *       200:
 *         description: Quiz deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Quiz not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize(["instructor", "admin"]),
  deleteQuiz,
);

/**
 * @swagger
 * /quizzes/{id}/submit:
 *   post:
 *     summary: Submit quiz answers
 *     description: Submit answers for a quiz. The quiz is graded automatically and the result is returned.
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz UUID
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
 *         description: Quiz submitted and graded
 *       404:
 *         description: Quiz not found
 */
router.post("/:id/submit", authenticate, submitQuiz);

export default router;
