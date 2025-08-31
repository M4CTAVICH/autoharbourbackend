import prisma from "../config/db.js";
import type { Report } from "@prisma/client";

export const submitReportService = async ({
  reporterId,
  targetType,
  targetId,
  reason,
  description,
}: {
  reporterId: number;
  targetType: "USER" | "LISTING" | "MESSAGE";
  targetId: number;
  reason: string;
  description?: string | null;
}) => {
  try {
    // Check if target exists
    let targetExists = false;
    let targetOwnerId = null;

    if (targetType === "USER") {
      const user = await prisma.user.findUnique({ where: { id: targetId } });
      targetExists = !!user;
      targetOwnerId = targetId;
    } else if (targetType === "LISTING") {
      const listing = await prisma.listing.findUnique({
        where: { id: targetId },
        select: { id: true, userId: true },
      });
      targetExists = !!listing;
      targetOwnerId = listing?.userId;
    } else if (targetType === "MESSAGE") {
      const message = await prisma.message.findUnique({
        where: { id: targetId },
        select: { id: true, senderId: true },
      });
      targetExists = !!message;
      targetOwnerId = message?.senderId;
    }

    if (!targetExists) {
      throw new Error("Target not found");
    }

    // Prevent self-reporting
    if (targetOwnerId === reporterId) {
      throw new Error("Cannot report your own content");
    }

    // Check for duplicate reports
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId,
        targetType,
        targetId,
      },
    });

    if (existingReport) {
      throw new Error("You have already reported this content");
    }

    // Create the report
    const report = await prisma.report.create({
      data: {
        reporterId,
        targetType,
        targetId,
        reason,
        description,
        status: "PENDING",
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return report;
  } catch (error) {
    console.error("Submit report service error:", error);
    throw error;
  }
};

export const getMyReportsService = async ({
  userId,
  page = 1,
  limit = 20,
  status,
  targetType,
  sortBy = "createdAt",
  sortOrder = "desc",
}: {
  userId: number;
  page: number;
  limit: number;
  status?: string;
  targetType?: string;
  sortBy: string;
  sortOrder: string;
}) => {
  try {
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      reporterId: userId,
    };

    if (status && ["PENDING", "RESOLVED", "DISMISSED"].includes(status)) {
      whereClause.status = status;
    }

    if (targetType && ["USER", "LISTING", "MESSAGE"].includes(targetType)) {
      whereClause.targetType = targetType;
    }

    // Get reports with pagination
    const reports = await prisma.report.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder as "asc" | "desc",
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get total count
    const total = await prisma.report.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
      },
    };
  } catch (error) {
    console.error("Get my reports service error:", error);
    throw error;
  }
};

export const getReportDetailsService = async (
  reportId: number,
  userId: number
) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
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
    });

    if (!report) {
      throw new Error("Report not found");
    }

    // Check if user owns this report
    if (report.reporterId !== userId) {
      throw new Error("Access denied");
    }

    return report;
  } catch (error) {
    console.error("Get report details service error:", error);
    throw error;
  }
};
