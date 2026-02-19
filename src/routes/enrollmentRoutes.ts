import { Router } from "express";
import * as enrollmentController from "../controllers/enrollmentController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

// Protected routes - require authentication
router.get("/my-courses", authenticate, enrollmentController.getMyEnrollments);
router.get(
  "/:courseId/status",
  authenticate,
  enrollmentController.checkEnrollment,
);
router.post("/:courseId", authenticate, enrollmentController.enrollUser);

export default router;
