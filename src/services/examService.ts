import prisma from "../config/prisma";

// ============ Get Exam by Course ID ============
export async function getExamByCourseService(courseId: string) {
  return prisma.exam.findUnique({
    where: { course_id: courseId },
    include: {
      questions: {
        orderBy: { id: "asc" },
        include: {
          options: {
            orderBy: { id: "asc" },
            select: { id: true, text: true }, // hide is_correct for students
          },
        },
      },
    },
  });
}

// ============ Get Exam by Course ID (with answers — for instructors) ============
export async function getExamByCourseWithAnswersService(courseId: string) {
  return prisma.exam.findUnique({
    where: { course_id: courseId },
    include: {
      questions: {
        orderBy: { id: "asc" },
        include: { options: { orderBy: { id: "asc" } } },
      },
    },
  });
}

// ============ Check if student can take exam ============
// Student must complete ALL lessons in the course (quiz lessons are optional)
export async function checkExamEligibilityService(
  userId: string,
  courseId: string,
) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { user_id_course_id: { user_id: userId, course_id: courseId } },
    include: {
      course: {
        include: {
          modules: {
            include: {
              lessons: { select: { id: true, title: true, type: true } },
            },
          },
        },
      },
      lesson_progress: { where: { is_completed: true } },
    },
  });

  if (!enrollment) {
    return { eligible: false, reason: "Not enrolled in this course" };
  }

  // All lessons across all modules
  const allLessons = enrollment.course.modules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;

  if (totalLessons === 0) {
    return { eligible: true, reason: "No lessons in this course" };
  }

  const completedLessonIds = new Set(
    enrollment.lesson_progress.map((lp) => lp.lesson_id),
  );

  const incompleteLessons = allLessons.filter(
    (l) => !completedLessonIds.has(l.id),
  );

  if (incompleteLessons.length > 0) {
    return {
      eligible: false,
      reason: `Complete ${incompleteLessons.length} more lesson(s) to unlock the exam`,
      completed: totalLessons - incompleteLessons.length,
      total: totalLessons,
      incomplete_lessons: incompleteLessons.map((l) => ({
        id: l.id,
        title: l.title,
        type: l.type,
      })),
    };
  }

  return {
    eligible: true,
    reason: "All lessons completed — you can take the exam!",
    completed: totalLessons,
    total: totalLessons,
  };
}

// ============ Create Exam ============
export async function createExamService(params: {
  courseId: string;
  title: string;
  description?: string;
  passing_score?: number;
  time_limit?: number;
  questions: {
    prompt: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SINGLE_CHOICE";
    points?: number;
    options: { text: string; is_correct: boolean }[];
  }[];
}) {
  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
  });
  if (!course) return { error: "Course not found" };

  const existing = await prisma.exam.findUnique({
    where: { course_id: params.courseId },
  });
  if (existing) return { error: "Exam already exists for this course" };

  return prisma.exam.create({
    data: {
      course_id: params.courseId,
      title: params.title,
      description: params.description,
      passing_score: params.passing_score ?? 70,
      time_limit: params.time_limit,
      questions: {
        create: params.questions.map((q) => ({
          prompt: q.prompt,
          type: q.type,
          points: q.points ?? 1,
          options: {
            create: q.options.map((o) => ({
              text: o.text,
              is_correct: o.is_correct,
            })),
          },
        })),
      },
    },
    include: { questions: { include: { options: true } } },
  });
}

// ============ Update Exam ============
export async function updateExamService(params: {
  examId: string;
  title?: string;
  description?: string;
  passing_score?: number;
  time_limit?: number;
  questions?: {
    prompt: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SINGLE_CHOICE";
    points?: number;
    options: { text: string; is_correct: boolean }[];
  }[];
}) {
  const exam = await prisma.exam.findUnique({ where: { id: params.examId } });
  if (!exam) return { error: "Exam not found" };

  return prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {};
    if (params.title) updateData.title = params.title;
    if (params.description !== undefined)
      updateData.description = params.description;
    if (params.passing_score !== undefined)
      updateData.passing_score = params.passing_score;
    if (params.time_limit !== undefined)
      updateData.time_limit = params.time_limit;

    if (Object.keys(updateData).length > 0) {
      await tx.exam.update({ where: { id: params.examId }, data: updateData });
    }

    if (params.questions) {
      await tx.examQuestion.deleteMany({ where: { exam_id: params.examId } });
      for (const q of params.questions) {
        await tx.examQuestion.create({
          data: {
            exam_id: params.examId,
            prompt: q.prompt,
            type: q.type,
            points: q.points ?? 1,
            options: {
              create: q.options.map((o) => ({
                text: o.text,
                is_correct: o.is_correct,
              })),
            },
          },
        });
      }
    }

    return tx.exam.findUnique({
      where: { id: params.examId },
      include: { questions: { include: { options: true } } },
    });
  });
}

// ============ Delete Exam ============
export async function deleteExamService(examId: string) {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) return { error: "Exam not found" };
  await prisma.exam.delete({ where: { id: examId } });
  return { message: "Exam deleted successfully" };
}

// ============ Submit Exam ============
export async function submitExamService(params: {
  userId: string;
  examId: string;
  courseId: string;
  answers: { question_id: string; option_id: string }[];
}) {
  // Verify enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      user_id_course_id: { user_id: params.userId, course_id: params.courseId },
    },
  });
  if (!enrollment) return { error: "Not enrolled in this course" };

  const exam = await prisma.exam.findUnique({
    where: { id: params.examId },
    include: { questions: { include: { options: true } } },
  });
  if (!exam) return { error: "Exam not found" };

  // Grade it
  let earnedPoints = 0;
  let totalPoints = 0;
  for (const q of exam.questions) {
    totalPoints += q.points;
    const ans = params.answers.find((a) => a.question_id === q.id);
    if (ans) {
      const opt = q.options.find((o) => o.id === ans.option_id);
      if (opt?.is_correct) earnedPoints += q.points;
    }
  }

  const score =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed = score >= exam.passing_score;

  const attempt = await prisma.examAttempt.create({
    data: {
      exam_id: params.examId,
      user_id: params.userId,
      enrollment_id: enrollment.id,
      score,
      passed,
      answers_json: params.answers,
    },
  });

  // If passed, mark enrollment as COMPLETED
  if (passed) {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        status: "COMPLETED",
        completed_at: new Date(),
        progress_pct: 100,
      },
    });
  }

  return {
    score,
    passed,
    attempt_id: attempt.id,
    passing_score: exam.passing_score,
  };
}

// ============ Get My Exam Attempts ============
export async function getMyExamAttemptsService(
  userId: string,
  courseId: string,
) {
  const exam = await prisma.exam.findUnique({ where: { course_id: courseId } });
  if (!exam) return { error: "No exam for this course" };

  return prisma.examAttempt.findMany({
    where: { exam_id: exam.id, user_id: userId },
    orderBy: { attempted_at: "desc" },
  });
}
