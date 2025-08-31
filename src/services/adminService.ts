import prisma from "../config/db.js";
import type {
  AdminAction,
  Report,
  BanLog,
  ListingModerationLog,
} from "@prisma/client";

export const getDashboardStatsService = async () => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      todayUsers,
      todayListings,
      todayReports,
      totalUsers,
      totalListings,
      totalReports,
      activeUsers,
      pendingListings,
      pendingReports,
      thisMonthUsers,
      lastMonthUsers,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: { gte: today },
        },
      }),
      prisma.listing.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.report.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.user.count(),
      prisma.listing.count(),
      prisma.report.count(),
      prisma.user.count({
        where: {
          lastSeen: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.listing.count({
        where: { status: "PENDING" },
      }),

      prisma.user.count({
        where: { createdAt: { gte: thisMonth } },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: lastMonth,
            lt: thisMonth,
          },
        },
      }),
    ]);

    const userGrowthRate =
      lastMonthUsers > 0
        ? ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100
        : 0;
    return {
      today: {
        newUsers: todayUsers,
        newListings: todayListings,
        newReports: todayReports,
      },
      totals: {
        users: totalUsers,
        listings: totalListings,
        reports: totalReports,
        activeUsers,
      },
      pending: {
        listings: pendingListings,
        reports: pendingReports,
      },
      growth: {
        userGrowthRate: Math.round(userGrowthRate * 100) / 100,
        thisMonthUsers,
        lastMonthUsers,
      },
    };
  } catch (error) {
    console.error("Get dashboard stats service error", error);
    throw error;
  }
};
export const getUsersService = async (
  page = 1,
  limit = 20,
  filters: {
    search?: string;
    role?: string;
    status?: "active" | "inactive" | "banned";
    sortBy?: "name" | "email" | "createdAt" | "lastSeen";
    sortOrder?: "asc" | "desc";
  } = {}
) => {
  try {
    const offset = (page - 1) * Math.min(limit, 50);
    const {
      search,
      role,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = filters;

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive " } },
      ];
    }

    if (role && role !== "ALL") {
      whereClause.role = role;
    }

    if (status) {
      if (status === "active") {
        whereClause.isActive = true;
      } else if (status === "inactive") {
        whereClause.isActive = false;
      } else if (status === "banned") {
        whereClause.userBans = {
          some: {
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        };
      }
    }

    let orderBy: any = {};
    switch (sortBy) {
      case "name":
        orderBy = { name: sortOrder };
        break;
      case "email":
        orderBy = { email: sortOrder };
        break;
      case "lastSeen":
        orderBy = { lastSeen: sortOrder };
        break;
      default:
        orderBy = { createdAt: sortOrder };
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          isVerified: true,
          lastSeen: true,
          createdAt: true,
          _count: {
            select: {
              listings: true,
              favorites: true,
              reportsSubmitted: true,
            },
          },
          userBans: {
            where: { isActive: true },
            select: {
              reason: true,
              expiresAt: true,
              createdAt: true,
            },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy,
        skip: offset,
        take: Math.min(limit, 50),
      }),

      prisma.user.count({
        where: whereClause,
      }),
    ]);

    const processedUsers = users.map((user: any) => ({
      ...user,
      listingCount: user._count?.listings ?? 0,
      favouriteCount: user._count.favorites,
      reportCount: user._count.reportsSubmitted,
      isBanned: user.userBans.length > 0,
      banInfo: user.userBans[0] || null,
    }));

    return {
      users: processedUsers,
      pagination: {
        page,
        limit: Math.min(limit, 50),
        total,
        paegs: Math.ceil(total / Math.min(limit, 50)),
      },
    };
  } catch (error) {
    console.error("Get users service error:", error);
    throw error;
  }
};

export const banUserService = async (
  userId: number,
  adminId: number,
  reason: string,
  duration: number
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });
    if (!user) {
      throw new Error("User not found");
    }
    if (user.role === "SUPER_ADMIN") {
      throw new Error("Cannot ban super admin");
    }

    const existingBan = await prisma.banLog.findFirst({
      where: {
        userId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (existingBan) {
      throw new Error("User is already banned");
    }

    const expiresAt = duration
      ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
      : null;

    const banLog = await prisma.banLog.create({
      data: {
        userId,
        adminId,
        action: duration ? "TEMPORARY_BAN" : "BAN",
        reason,
        duration,
        expiresAt,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    return banLog;
  } catch (error) {
    console.error("Ban user service error: ", error);
    throw error;
  }
};

export const unbanUserService = async (
  userId: number,
  adminId: number,
  reason: string
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: adminId },
    });
    if (!user) {
      throw new Error("User not found");
    }

    const activeBan = await prisma.banLog.findFirst({
      where: {
        userId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!activeBan) {
      throw new Error("User is not currently banned");
    }

    await prisma.banLog.update({
      where: { id: activeBan.id },
      data: { isActive: false },
    });

    const unbanLog = await prisma.banLog.create({
      data: {
        userId,
        adminId,
        action: "UNBAN",
        reason,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
    return unbanLog;
  } catch (error) {
    console.error("Unban user service error:", error);
    throw error;
  }
};

export const getReportsService = async (
  page = 1,
  limit = 20,
  filters: {
    status?: string;
    targetType?: string;
    sortBy?: "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
  } = {}
) => {
  try {
    const offset = (page - 1) * Math.min(limit, 50);
    const {
      status,
      targetType,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = filters;

    const whereClause: any = {};

    if (status && status !== "ALL") {
      whereClause.status = status;
    }
    if (targetType && targetType !== "ALL") {
      whereClause.targetType = targetType;
    }
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: whereClause,
        select: {
          id: true,
          targetType: true,
          targetId: true,
          reason: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          reviewedAt: true,
          resolution: true,
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: Math.min(limit, 50),
      }),

      prisma.report.count({
        where: whereClause,
      }),
    ]);
    return {
      reports,
      pagination: {
        page,
        limit: Math.min(limit, 50),
        total,
        pages: Math.ceil(total / Math.min(limit, 50)),
      },
    };
  } catch (error) {
    console.error("Get reports service error:", error);
    throw error;
  }
};

export const logAdminActionService = async (actionData: {
  adminId: number;
  actionType: string;
  targetType?: string;
  targetId?: number;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
}) => {
  try {
    const adminAction = await prisma.adminAction.create({
      data: actionData,
    });

    return adminAction;
  } catch (error) {
    console.error("Log admin action service error:", error);
    throw error;
  }
};
