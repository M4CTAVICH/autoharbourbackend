import type { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader } from "../utils/jwt.js";
import type { JWTPayload } from "../types/user.js";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Main authentication middleware
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: "Access token is required",
      });
      return;
    }

    const token = extractTokenFromHeader(authHeader);

    const decoded = verifyToken(token);

    req.user = decoded;

    next();
  } catch (error: any) {
    console.error("Authentication middleware error:", error);
    res.status(401).json({
      success: false,
      message: error.message || "Invalid or expired token",
    });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = extractTokenFromHeader(authHeader);
      const decoded = verifyToken(token);
      req.user = decoded;
    }

    next();
  } catch (error) {
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions",
        });
        return;
      }

      next();
    } catch (error: any) {
      console.error("Role authorization error:", error);
      res.status(403).json({
        success: false,
        message: "Authorization failed",
      });
    }
  };
};

export const requireEmailVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const prisma = (await import("../config/db.js")).default;
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isVerified: true },
    });

    if (!user?.isVerified) {
      res.status(403).json({
        success: false,
        message: "Email verification required",
      });
      return;
    }

    next();
  } catch (error: any) {
    console.error("Email verification middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Verification check failed",
    });
  }
};

export const requireAdmin = requireRole(["ADMIN"]);

export const requireAdminOrModerator = requireRole(["ADMIN", "MODERATOR"]);
