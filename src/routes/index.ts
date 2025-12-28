import express from "express";
import authRoutes from "./authRoutes";
import courseRoutes from "./courseRoutes";
import progressRoutes from "./progressRoutes";
import quizRoutes from "./quizRoutes";
import forumRoutes from "./forumRoutes";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/courses", courseRoutes);
router.use("/progress", progressRoutes);
router.use("/quizzes", quizRoutes);
router.use("/forum", forumRoutes);

export default router;
