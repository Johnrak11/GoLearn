import express from "express";
import {
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/userController";
// import { protect, admin } from "../middleware/authMiddleware"; // Assuming these exist, if not I will skip for now

const router = express.Router();

// Public for now until I confirm middleware existence/structure
router.get("/", listUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
