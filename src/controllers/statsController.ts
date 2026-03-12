import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import {
  getAdminStatsService,
  getInstructorStatsService,
} from "../services/statsService";

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const roles = req.user?.roles || [];
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (roles.includes("admin")) {
      const stats = await getAdminStatsService();
      res.json(stats);
      return;
    }

    if (roles.includes("instructor")) {
      const stats = await getInstructorStatsService(userId);
      res.json(stats);
      return;
    }

    // Default for students or others if needed
    res.json({ message: "Dashboard stats for this role not implemented yet" });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
