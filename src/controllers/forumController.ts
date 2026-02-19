import { Response } from "express";
import {
  listForumPostsService,
  createForumPostService,
} from "../services/forumService";
import { AuthRequest } from "../middlewares/authMiddleware";
import { z } from "zod";

const createPostSchema = z.object({
  course_id: z.string().uuid(),
  content: z.string().min(1),
  parent_id: z.string().uuid().optional(),
});

export const getForumPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;

    const posts = await listForumPostsService(courseId);

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createForumPost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return;
    const { course_id, content, parent_id } = createPostSchema.parse(req.body);
    const userId = req.user.userId;

    const post = await createForumPostService({
      userId,
      course_id,
      content,
      parent_id,
    });

    res.status(201).json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: (error as any).errors });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
