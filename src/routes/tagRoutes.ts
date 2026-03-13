import express from "express";
import { listTags } from "../controllers/tagController";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tags
 *   description: Tag management endpoints
 */

/**
 * @swagger
 * /tags:
 *   get:
 *     summary: List all available tags
 *     tags: [Tags]
 *     responses:
 *       200:
 *         description: List of tags
 */
router.get("/", listTags);

export default router;
