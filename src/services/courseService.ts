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

export async function listPublishedCoursesService(search?: string) {
  const where: any = { status: "PUBLISHED" };
  if (search) where.title = { contains: String(search) };
  const courses = await prisma.course.findMany({
    where,
    include: {
      instructor: { select: { full_name: true, avatar_url: true } },
    },
  });
  return courses;
}

export async function getCourseCurriculumService(
  courseId: string,
  userId?: string | null
) {
  let isEnrolled = false;
  if (userId) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } },
    });
    if (enrollment && enrollment.status === "ACTIVE") isEnrolled = true;
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: { select: { full_name: true, avatar_url: true } },
      modules: {
        orderBy: { order_index: "asc" },
        include: {
          lessons: {
            orderBy: { order_index: "asc" },
            select: {
              id: true,
              title: true,
              type: true,
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

  const sanitized = {
    ...course,
    modules: course.modules.map((m: any) => ({
      ...m,
      lessons: m.lessons.map((l: any) => {
        const content_url =
          isEnrolled && l.video ? l.video.url || l.video.playback_id : null;
        return {
          id: l.id,
          title: l.title,
          type: l.type,
          duration: l.video?.duration || 0,
          content_url,
          is_locked: !isEnrolled,
        };
      }),
    })),
  };

  return sanitized as any;
}
