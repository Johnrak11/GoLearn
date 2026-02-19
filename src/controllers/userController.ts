import { Request, Response } from "express";
import prisma from "../config/prisma";
import { z } from "zod";

export const listUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const role = (req.query.role as string) || "";
    const status = (req.query.status as string) || "";

    const skip = (page - 1) * limit;

    const whereClause: any = {
      OR: [
        { email: { contains: search } },
        { full_name: { contains: search } },
      ],
    };

    if (role) {
      whereClause.roles = {
        some: {
          role: {
            name: role,
          },
        },
      };
    }

    if (status) {
      whereClause.status = status;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          _count: {
            select: { enrollments: true },
          },
        },
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    res.json({
      data: users.map((u: any) => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        avatar_url: u.avatar_url,
        status: u.status,
        created_at: u.created_at,
        roles: u.roles.map((r: any) => r.role.name),
        enrollments_count: u._count.enrollments,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        enrollments: { include: { course: true } },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      ...user,
      roles: user.roles.map((r: any) => r.role.name),
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateUserSchema = z.object({
  full_name: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "BANNED", "PENDING"]).optional(),
  roles: z.array(z.string()).optional(), // Array of role names
});

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { full_name, status, roles } = updateUserSchema.parse(req.body);

    // Update basic info
    const updateData: any = {};
    if (full_name) updateData.full_name = full_name;
    if (status) updateData.status = status;

    // Transaction to update roles if provided
    await prisma.$transaction(async (tx: any) => {
      if (roles) {
        // Remove existing roles
        await tx.userRole.deleteMany({
          where: { user_id: id },
        });

        // Add new roles
        for (const roleName of roles) {
          const role = await tx.role.findUnique({ where: { name: roleName } });
          if (role) {
            await tx.userRole.create({
              data: {
                user_id: id,
                role_id: role.id,
              },
            });
          }
        }
      }

      if (Object.keys(updateData).length > 0) {
        await tx.user.update({
          where: { id },
          data: updateData,
        });
      }
    });

    res.json({ message: "User updated successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: (error as any).errors });
    } else {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
