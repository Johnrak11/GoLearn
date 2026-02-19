import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    roles: string[];
    role?: string; // Backwards compatibility if needed, or derived
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      roles: string[];
    };
    req.user = {
      userId: decoded.userId,
      roles: decoded.roles,
      role: decoded.roles[0], // Default to first role for legacy checks
    };
    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid token." });
  }
};

export const authorize = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.roles.some((r) => allowedRoles.includes(r))) {
      res
        .status(403)
        .json({ error: "Access denied. Insufficient permissions." });
      return;
    }
    next();
  };
};
