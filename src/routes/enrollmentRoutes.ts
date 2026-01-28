import { Router } from "express";
import * as enrollmentController from "../controllers/enrollmentController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

// Protected routes - require authentication
router.get("/my-courses", authenticate, enrollmentController.getMyEnrollments);

export default router;
