import type { Request, Response } from "express";
import {
  getDashboardStatsService,
  getUsersService,
  banUserService,
  unbanUserService,
  getReportsService,
  logAdminActionService,
} from "../services/adminService.js";
import prisma from "../config/db.js";

const getAuthenticatedAdmin = (req: Request) => {
  return (req as any).user as { userId: number; role: string } | null;
};

export const getDashboardController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const stats = await getDashboardStatsService();

    res.status(200).json({
      success: true,
      message: "Dashboard stats retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error("Get dashboard controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve dashboard stats",
    });
  }
};

export const getUsersController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const role = req.query.role as string;
    const status = req.query.status as "active" | "inactive" | "banned";
    const sortBy = req.query.sortBy as
      | "name"
      | "email"
      | "createdAt"
      | "lastSeen";
    const sortOrder = req.query.sortOrder as "asc" | "desc";

    if (page < 1) {
      res.status(400).json({
        success: false,
        message: "Page must be 1 or greater",
      });
      return;
    }

    if (limit < 1 || limit > 50) {
      res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 50",
      });
      return;
    }

    const result = await getUsersService(page, limit, {
      search,
      role,
      status,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      message: `Retrieved ${result.users.length} users`,
      data: result,
    });
  } catch (error: any) {
    console.error("Get users controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve users",
    });
  }
};

export const getUserDetailsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId || "");

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
        location: true,
        bio: true,
        avatar: true,
        _count: {
          select: {
            listings: true,
            favorites: true,
            reportsSubmitted: true,
            messagesSent: true,
          },
        },
        userBans: {
          select: {
            id: true,
            action: true,
            reason: true,
            duration: true,
            expiresAt: true,
            isActive: true,
            createdAt: true,
            admin: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        listings: {
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const userDetails = {
      ...user,
      listingCount: user._count.listings,
      favoriteCount: user._count.favorites,
      reportCount: user._count.reportsSubmitted,
      messageCount: user._count.messagesSent,
      recentListings: user.listings,
      banHistory: user.userBans,
    };

    res.status(200).json({
      success: true,
      message: "User details retrieved successfully",
      data: userDetails,
    });
  } catch (error: any) {
    console.error("Get user details controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve user details",
    });
  }
};

export const banUserController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const admin = getAuthenticatedAdmin(req);
    if (!admin) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const userId = parseInt(req.params.userId || "");
    const { reason, duration } = req.body;

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    if (!reason || reason.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Ban reason is required",
      });
      return;
    }

    if (duration && (duration < 1 || duration > 365)) {
      res.status(400).json({
        success: false,
        message: "Duration must be between 1 and 365 days",
      });
      return;
    }

    const banLog = await banUserService(
      userId,
      admin.userId,
      reason.trim(),
      duration
    );

    await logAdminActionService({
      adminId: admin.userId,
      actionType: "BAN_USER",
      targetType: "USER",
      targetId: userId,
      details: { reason, duration },
      ipAddress: (req as any).adminAction?.ipAddress,
      userAgent: (req as any).adminAction?.userAgent,
      endpoint: (req as any).adminAction?.endpoint,
    });

    res.status(200).json({
      success: true,
      message: `User ${duration ? "temporarily " : ""}banned successfully`,
      data: { banLog },
    });
  } catch (error: any) {
    console.error("Ban user controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to ban user",
    });
  }
};

export const unbanUserController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const admin = getAuthenticatedAdmin(req);
    if (!admin) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const userId = parseInt(req.params.userId || "");
    const { reason } = req.body;

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    if (!reason || reason.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Unban reason is required",
      });
      return;
    }

    const unbanLog = await unbanUserService(
      userId,
      admin.userId,
      reason.trim()
    );

    await logAdminActionService({
      adminId: admin.userId,
      actionType: "UNBAN_USER",
      targetType: "USER",
      targetId: userId,
      details: { reason },
      ipAddress: (req as any).adminAction?.ipAddress,
      userAgent: (req as any).adminAction?.userAgent,
      endpoint: (req as any).adminAction?.endpoint,
    });
    res.status(200).json({
      success: true,
      message: "User unbanned successfully",
      data: { unbanLog },
    });
  } catch (error: any) {
    console.error("Unban user controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to unban user",
    });
  }
};

export const getReportsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const targetType = req.query.targetType as string;
    const sortBy = req.query.sortBy as "createdAt" | "updatedAt";
    const sortOrder = req.query.sortOrder as "asc" | "desc";

    const result = await getReportsService(page, limit, {
      status,
      targetType,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      message: `Retrieved ${result.reports.length} reports`,
      data: result,
    });
  } catch (error: any) {
    console.error("Get reports controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve reports",
    });
  }
};

export const resolveReportController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const admin = getAuthenticatedAdmin(req);
    if (!admin) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const reportId = parseInt(req.params.reportId || "");
    const { status, resolution } = req.body;

    if (isNaN(reportId)) {
      res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
      return;
    }

    if (!["RESOLVED", "DISMISSED"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Status must be RESOLVED or DISMISSED",
      });
      return;
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      res.status(404).json({
        success: false,
        message: "Report not found",
      });
      return;
    }

    if (report.status !== "PENDING" && report.status !== "UNDER_REVIEW") {
      res.status(400).json({
        success: false,
        message: "Report has already been resolved",
      });
      return;
    }

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        resolution: resolution || null,
        reviewedBy: admin.userId,
        reviewedAt: new Date(),
      },
    });

    await logAdminActionService({
      adminId: admin.userId,
      actionType: "RESOLVE_REPORT",
      targetType: "REPORT",
      targetId: reportId,
      details: { status, resolution },
      ipAddress: (req as any).adminAction?.ipAddress,
      userAgent: (req as any).adminAction?.userAgent,
      endpoint: (req as any).adminAction?.endpoint,
    });

    res.status(200).json({
      success: true,
      message: "Report resolved successfully",
      data: { report: updatedReport },
    });
  } catch (error: any) {
    console.error("Resolve report controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to resolve report",
    });
  }
};

export const getAnalyticsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const timeframe = (req.query.timeframe as string) || "30days";

    let startDate: Date;
    const now = new Date();

    switch (timeframe) {
      case "7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90days":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [userGrowth, listingGrowth, topCategories, recentActivity] =
      await Promise.all([
        prisma.user.groupBy({
          by: ["createdAt"],
          where: { createdAt: { gte: startDate } },
          _count: true,
        }),

        prisma.listing.groupBy({
          by: ["createdAt"],
          where: { createdAt: { gte: startDate } },
          _count: true,
        }),

        prisma.listing.groupBy({
          by: ["categoryId"],
          _count: true,
          orderBy: { _count: { categoryId: "desc" } },
          take: 10,
        }),

        prisma.adminAction.findMany({
          select: {
            actionType: true,
            createdAt: true,
            admin: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      ]);

    const analytics = {
      timeframe,
      userGrowth: userGrowth.length,
      listingGrowth: listingGrowth.length,
      topCategories,
      recentActivity,
    };

    res.status(200).json({
      success: true,
      message: "Analytics retrieved successfully",
      data: analytics,
    });
  } catch (error: any) {
    console.error("Get analytics controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve analytics",
    });
  }
};
