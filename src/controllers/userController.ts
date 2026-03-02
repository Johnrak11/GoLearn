import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/authMiddleware";
import { z } from "zod";

// ============ Admin: List Users ============
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
        phone: u.phone,
        date_of_birth: u.date_of_birth,
        gender: u.gender,
        bio: u.bio,
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

// ============ Admin: Get User By ID ============
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
      password_hash: undefined,
      roles: user.roles.map((r: any) => r.role.name),
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============ Admin: Update User ============
const updateUserSchema = z.object({
  full_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  skills: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "BANNED", "PENDING"]).optional(),
  roles: z.array(z.string()).optional(),
});

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    // Build update data
    const updateData: any = {};
    if (data.full_name) updateData.full_name = data.full_name;
    if (data.email) updateData.email = data.email;
    if (data.status) updateData.status = data.status;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.date_of_birth !== undefined)
      updateData.date_of_birth = data.date_of_birth
        ? new Date(data.date_of_birth)
        : null;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.skills !== undefined) updateData.skills = data.skills;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;

    // Transaction to update roles if provided
    await prisma.$transaction(async (tx: any) => {
      if (data.roles) {
        // Remove existing roles
        await tx.userRole.deleteMany({
          where: { user_id: id },
        });

        // Add new roles
        for (const roleName of data.roles) {
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

// ============ Admin: Delete User ============
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============ User: Get My Profile ============
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      headline: user.headline,
      bio: user.bio,
      avatar_url: user.avatar_url,
      phone: user.phone,
      date_of_birth: user.date_of_birth,
      gender: user.gender,
      skills: user.skills,
      address: user.address,
      timezone: user.timezone,
      status: user.status,
      created_at: user.created_at,
      roles: user.roles.map((r: any) => r.role.name),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============ User: Update My Profile ============
const updateMeSchema = z.object({
  full_name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  headline: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  skills: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const data = updateMeSchema.parse(req.body);

    const updateData: any = {};
    if (data.full_name) updateData.full_name = data.full_name;
    if (data.email) updateData.email = data.email;
    if (data.headline !== undefined) updateData.headline = data.headline;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.date_of_birth !== undefined)
      updateData.date_of_birth = data.date_of_birth
        ? new Date(data.date_of_birth)
        : null;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.skills !== undefined) updateData.skills = data.skills;
    if (data.address !== undefined) updateData.address = data.address;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        roles: { include: { role: true } },
      },
    });

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        headline: updatedUser.headline,
        bio: updatedUser.bio,
        avatar_url: updatedUser.avatar_url,
        phone: updatedUser.phone,
        date_of_birth: updatedUser.date_of_birth,
        gender: updatedUser.gender,
        skills: updatedUser.skills,
        address: updatedUser.address,
        roles: updatedUser.roles.map((r: any) => r.role.name),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: (error as any).errors });
    } else {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
