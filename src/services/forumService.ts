import prisma from "../config/prisma";

export async function listForumPostsService(courseId: string) {
  const posts = await prisma.forumPost.findMany({
    where: { course_id: courseId, parent_id: null },
    include: {
      user: { select: { full_name: true, avatar_url: true } },
      children: {
        include: { user: { select: { full_name: true, avatar_url: true } } },
        orderBy: { created_at: "asc" },
      },
    },
    orderBy: { created_at: "desc" },
  });
  return posts;
}

export async function createForumPostService(params: {
  userId: string;
  course_id: string;
  content: string;
  parent_id?: string;
}) {
  const post = await prisma.forumPost.create({
    data: {
      course_id: params.course_id,
      user_id: params.userId,
      content: params.content,
      parent_id: params.parent_id,
    },
  });
  return post;
}
