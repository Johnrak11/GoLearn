import prisma from "../config/prisma";

export async function updateProgressService(params: {
  userId: string;
  lesson_id: string;
  is_completed: boolean;
  last_watched_position?: number;
}) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lesson_id },
    include: { module: true },
  });
  if (!lesson) return { error: "Lesson not found" } as any;
  const courseId = (lesson as any).module.course_id as string;

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      user_id_course_id: { user_id: params.userId, course_id: courseId },
    },
  });
  if (!enrollment) return { error: "Not enrolled" } as any;

  await prisma.lessonProgress.upsert({
    where: {
      enrollment_id_lesson_id: {
        enrollment_id: enrollment.id,
        lesson_id: params.lesson_id,
      },
    },
    update: {
      is_completed: params.is_completed,
      last_watched_position: params.last_watched_position || 0,
    },
    create: {
      enrollment_id: enrollment.id,
      lesson_id: params.lesson_id,
      is_completed: params.is_completed,
      last_watched_position: params.last_watched_position || 0,
    },
  });

  const totalLessons = await prisma.lesson.count({
    where: { module: { course_id: courseId } },
  });
  const completedLessons = await prisma.lessonProgress.count({
    where: { enrollment_id: enrollment.id, is_completed: true },
  });
  const progressPct =
    totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  const isFinished = progressPct === 100;
  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      progress_pct: progressPct,
      status: isFinished ? "COMPLETED" : "ACTIVE",
      completed_at: isFinished ? new Date() : null,
    },
  });

  let certificate: any = null;
  if (isFinished) {
    certificate = await prisma.certificate.upsert({
      where: { enrollment_id: enrollment.id },
      update: {},
      create: {
        enrollment_id: enrollment.id,
        user_id: params.userId,
        code: `CERT-${Date.now()}-${params.userId
          .substring(0, 4)
          .toUpperCase()}`,
      },
    });
  }

  return {
    progress_pct: progressPct,
    is_completed: isFinished,
    certificate,
  } as any;
}
