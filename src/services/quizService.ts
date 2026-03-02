import prisma from "../config/prisma";

// ============ Get Quiz ============
export async function getQuizService(id: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: { include: { options: { select: { id: true, text: true } } } },
    },
  });
  return quiz;
}

// ============ Get Quiz by Lesson ID ============
export async function getQuizByLessonIdService(lessonId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { lesson_id: lessonId },
    include: {
      questions: {
        orderBy: { id: "asc" },
        include: {
          options: {
            orderBy: { id: "asc" },
          },
        },
      },
    },
  });
  return quiz;
}

// ============ Create Quiz ============
export async function createQuizService(params: {
  lessonId: string;
  title: string;
  passing_score?: number;
  questions: {
    prompt: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SINGLE_CHOICE";
    points?: number;
    options: { text: string; is_correct: boolean }[];
  }[];
}) {
  // Check if lesson exists
  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
  });
  if (!lesson) return { error: "Lesson not found" };

  // Check if quiz already exists for this lesson
  const existing = await prisma.quiz.findUnique({
    where: { lesson_id: params.lessonId },
  });
  if (existing) return { error: "Quiz already exists for this lesson" };

  const quiz = await prisma.quiz.create({
    data: {
      lesson_id: params.lessonId,
      title: params.title,
      passing_score: params.passing_score || 70,
      questions: {
        create: params.questions.map((q) => ({
          prompt: q.prompt,
          type: q.type,
          points: q.points || 1,
          options: {
            create: q.options.map((o) => ({
              text: o.text,
              is_correct: o.is_correct,
            })),
          },
        })),
      },
    },
    include: {
      questions: {
        include: { options: true },
      },
    },
  });

  return quiz;
}

// ============ Update Quiz ============
export async function updateQuizService(params: {
  quizId: string;
  title?: string;
  passing_score?: number;
  questions?: {
    prompt: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SINGLE_CHOICE";
    points?: number;
    options: { text: string; is_correct: boolean }[];
  }[];
}) {
  const quiz = await prisma.quiz.findUnique({ where: { id: params.quizId } });
  if (!quiz) return { error: "Quiz not found" };

  // Use a transaction to update quiz + replace questions if provided
  const updated = await prisma.$transaction(async (tx) => {
    // Update quiz basic info
    const updateData: any = {};
    if (params.title !== undefined) updateData.title = params.title;
    if (params.passing_score !== undefined)
      updateData.passing_score = params.passing_score;

    if (Object.keys(updateData).length > 0) {
      await tx.quiz.update({
        where: { id: params.quizId },
        data: updateData,
      });
    }

    // If questions provided, delete old ones and create new ones
    if (params.questions) {
      // Delete all existing questions (cascades to options)
      await tx.question.deleteMany({
        where: { quiz_id: params.quizId },
      });

      // Create new questions with options
      for (const q of params.questions) {
        await tx.question.create({
          data: {
            quiz_id: params.quizId,
            prompt: q.prompt,
            type: q.type,
            points: q.points || 1,
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

    // Return the updated quiz
    return tx.quiz.findUnique({
      where: { id: params.quizId },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });
  });

  return updated;
}

// ============ Delete Quiz ============
export async function deleteQuizService(quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) return { error: "Quiz not found" };

  await prisma.quiz.delete({ where: { id: quizId } });
  return { message: "Quiz deleted successfully" };
}

// ============ Submit Quiz ============
export async function submitQuizService(params: {
  userId: string;
  id: string;
  answers: { question_id: string; option_id: string }[];
}) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: { questions: { include: { options: true } } },
  });
  if (!quiz) return { error: "Quiz not found" } as any;
  let correctCount = 0;
  const total = quiz.questions.length;
  params.answers.forEach((ans) => {
    const q = (quiz.questions as any).find(
      (qq: any) => qq.id === ans.question_id,
    );
    if (q) {
      const opt = (q.options as any).find((oo: any) => oo.id === ans.option_id);
      if (opt && opt.is_correct) correctCount++;
    }
  });
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const passed = score >= quiz.passing_score;
  const attempt = await prisma.quizAttempt.create({
    data: {
      quiz_id: params.id,
      user_id: params.userId,
      score,
      passed,
      answers_json: params.answers as any,
    },
  });

  if (passed && quiz.lesson_id) {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        user_id: params.userId,
        course: {
          modules: { some: { lessons: { some: { id: quiz.lesson_id } } } },
        },
      },
    });
    if (enrollment) {
      await prisma.lessonProgress.upsert({
        where: {
          enrollment_id_lesson_id: {
            enrollment_id: enrollment.id,
            lesson_id: quiz.lesson_id,
          },
        },
        update: { is_completed: true },
        create: {
          enrollment_id: enrollment.id,
          lesson_id: quiz.lesson_id,
          is_completed: true,
        },
      });
    }
  }

  return { score, passed, attempt_id: attempt.id } as any;
}
