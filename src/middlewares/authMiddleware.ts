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
export const requireSuperAdmin = requireRole(["SUPER_ADMIN"]);

//admin access with permission levels
export const requireAdminAccess = (
  level: "VIEW" | "MODERATE" | "MANAGE" | "SYSTEM" = "VIEW"
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      const { role } = req.user;

      // Check role permissions
      const hasPermission = (() => {
        switch (level) {
          case "VIEW":
            return ["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(role);
          case "MODERATE":
            return ["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(role);
          case "MANAGE":
            return ["SUPER_ADMIN", "ADMIN"].includes(role);
          case "SYSTEM":
            return ["SUPER_ADMIN"].includes(role);
          default:
            return false;
        }
      })();

      if (!hasPermission) {
        const requiredRole =
          level === "SYSTEM"
            ? "SUPER_ADMIN"
            : level === "MANAGE"
            ? "ADMIN or SUPER_ADMIN"
            : "MODERATOR or above";

        res.status(403).json({
          success: false,
          message: `Insufficient permissions. Required: ${requiredRole}`,
          currentRole: role,
          requiredLevel: level,
        });
        return;
      }

      next();
    } catch (error: any) {
      console.error("Admin access check error:", error);
      res.status(403).json({
        success: false,
        message: "Authorization failed",
      });
    }
  };
};

// Admin action logging middleware
export const logAdminAction = (actionType: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      // Store admin action data for logging after request completion
      (req as any).adminAction = {
        actionType,
        adminId: req.user.userId,
        adminRole: req.user.role,
        timestamp: new Date(),
        ipAddress: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.headers["user-agent"] || "unknown",
        endpoint: `${req.method} ${req.originalUrl}`,
        body: req.method !== "GET" ? JSON.stringify(req.body) : null,
      };

      next();
    } catch (error: any) {
      console.error("Admin action logging error:", error);
      next();
    }
  };
};

//active/not banned
export const requireActiveUser = async (
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
      select: { isActive: true },
    });

    if (!user?.isActive) {
      res.status(403).json({
        success: false,
        message: "Account has been deactivated or banned",
      });
      return;
    }

    next();
  } catch (error: any) {
    console.error("Active user check error:", error);
    res.status(500).json({
      success: false,
      message: "User status check failed",
    });
  }
};

export const requireAdminUpdated = requireRole(["ADMIN", "SUPER_ADMIN"]);
export const requireAdminOrModeratorUpdated = requireRole([
  "ADMIN",
  "MODERATOR",
  "SUPER_ADMIN",
]);
export const requireAdmin = requireAdminUpdated;
export const requireAdminOrModerator = requireAdminOrModeratorUpdated;
