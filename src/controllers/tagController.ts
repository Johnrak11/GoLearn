import { Request, Response } from "express";
import prisma from "../config/prisma";

/**
 * GET /api/tags
 * List all available tags (categories)
 */
export const listTags = async (req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
    });
    res.json(tags);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
