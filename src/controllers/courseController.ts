import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { z } from "zod";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import {
  createCourseService,
  listPublishedCoursesService,
} from "../services/courseService";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

const createCourseSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  price: z.number().min(0),
  thumbnail_url: z.string().url().optional(),
});

// =============================================
// Shared helper: transform a raw Prisma course
// into the unified JSON format for Web & Mobile
// =============================================
function formatCourse(course: any, lessonProgress: Record<string, boolean> = {}) {
  // Calculate average instructor rating from reviews
  const totalRating = (course.reviews || []).reduce(
    (acc: number, review: any) => acc + review.rating,
    0,
  );
  const avgRating =
    course.reviews?.length > 0
      ? parseFloat((totalRating / course.reviews.length).toFixed(1))
      : 0.0;

  return {
    id: course.id,
    course_image: course.thumbnail_url || "",
    preview_video: course.thumbnail_url || "",
    title: course.title,
    description: course.description || "",
    instructor: {
      name: course.instructor?.full_name || "",
      rating: avgRating,
    },
    curriculum: (course.modules || []).map((module: any) => ({
      module_id: module.order_index,
      title: module.title,
      lessons: (module.lessons || []).map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        type: lesson.type.toLowerCase(),
        duration_minutes: lesson.video
          ? Math.round(lesson.video.duration / 60)
          : 0,
        video_url: lesson.video?.url || "",
        is_completed: lessonProgress[lesson.id] ?? false,
        ...(lesson.resources?.length > 0 && {
          resources: lesson.resources.map((r: any) => r.title),
        }),
      })),
    })),
    pricing: {
      amount: Number(course.price),
      currency: "USD",
      discount_available: course.compare_at_price
        ? Number(course.compare_at_price) > Number(course.price)
        : false,
    },
    tags: (course.tags || []).map((t: any) => t.tag?.name || t.name),
    is_enrolled: course.isEnrolled,
    progress_pct: typeof course.progress_pct === "number" ? course.progress_pct : 0,
  };
}

// =============================================
// Controllers
// =============================================

export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    if (
      !req.user ||
      !req.user.roles.some((r) => ["instructor", "admin"].includes(r))
    ) {
      res
        .status(403)
        .json({ error: "Only instructors and admins can create courses" });
      return;
    }

    const { title, description, price, thumbnail_url } =
      createCourseSchema.parse(req.body);

    const course = await createCourseService({
      instructorId: req.user.userId,
      title,
      description,
      price,
      thumbnail_url,
    });

    res.status(201).json(course);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: (error as any).errors });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

/**
 * GET /api/courses
 * List all published courses — unified format for Web & Mobile
 */
export const getCourses = async (req: Request, res: Response) => {
  try {
    const { search, category } = req.query;

    const courses = await listPublishedCoursesService(
      search as string | undefined,
      category as string | undefined,
    );

    // Always return the unified format
    const formatted = courses.map((course) => formatCourse(course));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/courses/:id
 * Get single course detail — unified format for Web & Mobile
 */
export const getCourseById = async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;

    // Determine enrollment + progress for provided userId (if any)
    let isEnrolled = false;
    let enrollmentProgressPct = 0;
    let lessonProgressMap: Record<string, boolean> = {};

    if (userId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          user_id_course_id: {
            user_id: userId,
            course_id: id,
          },
        },
        select: {
          id: true,
        },
      });

      if (enrollment) {
        isEnrolled = true;

        // Calculate progress based on total lessons across all modules
        const totalLessons = await prisma.lesson.count({
          where: { module: { course_id: id } },
        });
        const completedLessons = await prisma.lessonProgress.count({
          where: { enrollment_id: enrollment.id, is_completed: true },
        });

        enrollmentProgressPct =
          totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

        const progressRows = await prisma.lessonProgress.findMany({
          where: { enrollment_id: enrollment.id },
          select: { lesson_id: true, is_completed: true },
        });

        lessonProgressMap = progressRows.reduce(
          (acc: Record<string, boolean>, row) => ({
            ...acc,
            [row.lesson_id]: row.is_completed,
          }),
          {},
        );
      }
    }

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: { id: true, full_name: true, avatar_url: true },
        },
        reviews: { select: { rating: true } },
        tags: { include: { tag: true } },
        modules: {
          orderBy: { order_index: "asc" },
          include: {
            lessons: {
              orderBy: { order_index: "asc" },
              include: {
                video: true,
                resources: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    // Return the unified format (same structure as list)
    res.json(
      formatCourse(
        {
          ...course,
          isEnrolled,
          progress_pct: enrollmentProgressPct,
        },
        lessonProgressMap,
      ),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/courses/:id/raw
 * Get raw course data for dashboard editing/preview (NOT for mobile)
 */
export const getCourseByIdRaw = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: { id: true, full_name: true, avatar_url: true },
        },
        reviews: { select: { rating: true } },
        tags: { include: { tag: true } },
        modules: {
          orderBy: { order_index: "asc" },
          include: {
            lessons: {
              orderBy: { order_index: "asc" },
              include: {
                video: true,
                resources: true,
                quiz: {
                  select: { id: true, title: true, passing_score: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            modules: true,
          },
        },
      },
    });

    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    // Return raw Prisma data as-is
    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const listInstructorCourses = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { search } = req.query;

    // Admin can see all, Instructor sees only theirs
    const where: any = {};
    if (req.user?.role !== "admin") {
      where.instructor_id = userId;
    }

    // Add search filter
    if (search) {
      where.title = { contains: String(search) };
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        _count: {
          select: {
            enrollments: true,
            modules: true,
          },
        },
      },
    });

    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateCourse = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { title, description, price, image_url } = req.body;

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    if (course.instructor_id !== req.user.userId && req.user.role !== "admin") {
      res.status(403).json({ error: "You can only edit your own courses" });
      return;
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(image_url && { thumbnail_url: image_url }),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    if (course.instructor_id !== req.user.userId && req.user.role !== "admin") {
      res.status(403).json({ error: "You can only delete your own courses" });
      return;
    }

    await prisma.course.delete({ where: { id } });
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleCourseStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["PUBLISHED", "DRAFT", "ARCHIVED"].includes(status)) {
      res.status(400).json({
        error: "Invalid status. Must be PUBLISHED, DRAFT, or ARCHIVED",
      });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    if (course.instructor_id !== req.user.userId && req.user.role !== "admin") {
      res.status(403).json({ error: "You can only modify your own courses" });
      return;
    }

    const updated = await prisma.course.update({
      where: { id },
      data: { status },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
