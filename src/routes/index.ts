import express from "express";
import authRoutes from "./authRoutes";
import courseRoutes from "./courseRoutes";
import progressRoutes from "./progressRoutes";
import quizRoutes from "./quizRoutes";
import forumRoutes from "./forumRoutes";
import enrollmentRoutes from "./enrollmentRoutes";
import userRoutes from "./userRoutes";
import mobileRoutes from "./mobileRoutes";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/courses", courseRoutes);
router.use("/progress", progressRoutes);
router.use("/quizzes", quizRoutes);
router.use("/forum", forumRoutes);
router.use("/enrollments", enrollmentRoutes);
router.use("/mobile", mobileRoutes);

export default router;
