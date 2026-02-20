import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getMobileCourses = async (req: Request, res: Response) => {
  try {
    const { search, category } = req.query;

    const where: any = {
      status: "PUBLISHED",
    };

    if (search) {
      where.title = {
        contains: String(search),
      };
    }

    if (category) {
      where.tags = {
        some: {
          tag: {
            name: {
              equals: String(category),
            },
          },
        },
      };
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        instructor: {
          select: {
            full_name: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        modules: {
          orderBy: {
            order_index: "asc",
          },
          include: {
            lessons: {
              orderBy: {
                order_index: "asc",
              },
              include: {
                video: true,
                resources: true,
              },
            },
          },
        },
      },
    });

    const formattedCourses = courses.map((course) => {
      // Calculate average rating
      const totalRating = course.reviews.reduce(
        (acc, review) => acc + review.rating,
        0,
      );
      const avgRating =
        course.reviews.length > 0
          ? (totalRating / course.reviews.length).toFixed(1)
          : "0.0";

      // Map modules and lessons
      const curriculum = course.modules.map((module) => ({
        module_id: module.id, // Keeping UUID as string
        title: module.title,
        lessons: module.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          type: lesson.type.toLowerCase(),
          duration_minutes: lesson.video
            ? Math.round(lesson.video.duration / 60)
            : 0,
          video_url: lesson.video?.url || "",
          resources: lesson.resources.map((r) => r.file_url),
        })),
      }));

      // Map tags
      const tags = course.tags.map((t) => t.tag.name);

      return {
        id: course.id,
        course_image: course.thumbnail_url || "",
        preview_video: course.thumbnail_url || "", // Using thumbnail as preview image per example
        title: course.title,
        instructor: {
          name: course.instructor.full_name,
          rating: parseFloat(avgRating),
        },
        curriculum: curriculum,
        pricing: {
          amount: Number(course.price),
          currency: "USD",
          discount_available: course.compare_at_price
            ? Number(course.compare_at_price) > Number(course.price)
            : false,
        },
        tags: tags,
      };
    });

    res.json(formattedCourses);
  } catch (error) {
    console.error("Error fetching mobile courses:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
};
