import express from "express";
import { getDashboardStats } from "../controllers/statsController";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/dashboard", authenticate, getDashboardStats);

export default router;
