import prisma from "../config/prisma";

export async function getQuizService(id: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: { include: { options: { select: { id: true, text: true } } } },
    },
  });
  return quiz;
}

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
      (qq: any) => qq.id === ans.question_id
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
