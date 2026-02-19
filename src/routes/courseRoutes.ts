import express from "express";
import {
  createCourse,
  getCourses,
  getCourseById,
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
 *   description: Course management endpoints
 */

// ============ Course Routes ============
router.get("/", getCourses);
router.get("/my-courses", authenticate, listInstructorCourses);
router.post("/", authenticate, createCourse);
router.get("/:id", getCourseById);
router.patch("/:id", authenticate, updateCourse);
router.delete("/:id", authenticate, deleteCourse);
router.patch("/:id/status", authenticate, toggleCourseStatus);

// ============ Module Routes ============
router.post("/:courseId/modules", authenticate, createModule);
router.patch("/modules/:id", authenticate, updateModule);
router.delete("/modules/:id", authenticate, deleteModule);

// ============ Lesson Routes ============
router.post("/modules/:moduleId/lessons", authenticate, createLesson);
router.patch("/lessons/:id", authenticate, updateLesson);
router.delete("/lessons/:id", authenticate, deleteLesson);

export default router;
