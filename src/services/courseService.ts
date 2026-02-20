import prisma from "../config/prisma";

export async function createCourseService(params: {
  instructorId: string;
  title: string;
  description: string;
  price: number;
  thumbnail_url?: string;
}) {
  const slugBase = params.title
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "");
  const slug = `${slugBase}-${Date.now()}`;
  const course = await prisma.course.create({
    data: {
      instructor_id: params.instructorId,
      title: params.title,
      slug,
      description: params.description,
      price: params.price,
      thumbnail_url: params.thumbnail_url,
      status: "DRAFT",
    },
  });
  return course;
}

export async function listPublishedCoursesService(
  search?: string,
  category?: string,
) {
  const where: any = { status: "PUBLISHED" };

  if (search) {
    where.title = { contains: String(search) };
  }

  if (category) {
    where.tags = {
      some: {
        tag: {
          name: {
            equals: category,
          },
        },
      },
    };
  }

  const courses = await prisma.course.findMany({
    where,
    include: {
      instructor: { select: { full_name: true, avatar_url: true } },
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
  return courses;
}

export async function getCourseCurriculumService(
  courseId: string,
  userId?: string | null,
) {
  let isEnrolled = false;
  let isOwnerOrAdmin = false;

  if (userId) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
    });
    if (enrollment && enrollment.status === "ACTIVE") isEnrolled = true;

    // Check if the user is the course instructor or an admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (user) {
      const userRoles = user.roles.map((r: any) => r.role.name);
      if (userRoles.includes("admin")) isOwnerOrAdmin = true;
    }
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: { select: { id: true, full_name: true, avatar_url: true } },
      modules: {
        orderBy: { order_index: "asc" },
        include: {
          lessons: {
            orderBy: { order_index: "asc" },
            select: {
              id: true,
              title: true,
              type: true,
              is_free_preview: true,
              video: {
                select: { duration: true, url: true, playback_id: true },
              },
            },
          },
        },
      },
    },
  });
  if (!course) return null;

  // Check if the requesting user is the course instructor
  if (userId && course.instructor_id === userId) {
    isOwnerOrAdmin = true;
  }

  const hasFullAccess = isEnrolled || isOwnerOrAdmin;

  const sanitized = {
    ...course,
    modules: course.modules.map((m: any) => ({
      ...m,
      lessons: m.lessons.map((l: any) => {
        return {
          id: l.id,
          title: l.title,
          type: l.type,
          is_free_preview: l.is_free_preview,
          duration: l.video?.duration || 0,
          video:
            hasFullAccess && l.video
              ? {
                  url: l.video.url || l.video.playback_id,
                  duration: l.video.duration,
                }
              : null,
          is_locked: !hasFullAccess,
        };
      }),
    })),
  };

  return sanitized as any;
}
