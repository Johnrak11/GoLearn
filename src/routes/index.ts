import express from "express";
import authRoutes from "./authRoutes";
import courseRoutes from "./courseRoutes";
import progressRoutes from "./progressRoutes";
import quizRoutes from "./quizRoutes";
import forumRoutes from "./forumRoutes";
import enrollmentRoutes from "./enrollmentRoutes";
import userRoutes from "./userRoutes";
import examRoutes from "./examRoutes";
import mobileRoutes from "./mobileRoutes";
import paymentRoutes from "./paymentRoutes";
import withdrawalRoutes from "./withdrawalRoutes";
import paymentConfigRoutes from "./paymentConfigRoutes";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/courses", courseRoutes);
router.use("/progress", progressRoutes);
router.use("/quizzes", quizRoutes);
router.use("/exams", examRoutes);
router.use("/forum", forumRoutes);
router.use("/enrollments", enrollmentRoutes);
router.use("/payments", paymentRoutes);
router.use("/withdrawals", withdrawalRoutes);
router.use("/mobile", mobileRoutes);
router.use("/admin/payment-config", paymentConfigRoutes);

export default router;
