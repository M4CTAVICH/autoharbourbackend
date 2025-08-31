import type { Request, Response } from "express";
import {
  submitReportService,
  getMyReportsService,
  getReportDetailsService,
} from "../services/reportsService.js";

// Submit a report
export const submitReportController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { targetType, targetId, reason, description } = req.body;
    const reporterId = (req as any).user.userId;

    // Validation
    if (!targetType || !targetId || !reason) {
      res.status(400).json({
        success: false,
        message: "Target type, target ID, and reason are required",
      });
      return;
    }

    if (!["USER", "LISTING", "MESSAGE"].includes(targetType)) {
      res.status(400).json({
        success: false,
        message: "Invalid target type. Must be USER, LISTING, or MESSAGE",
      });
      return;
    }

    if (!Number.isInteger(targetId) || targetId <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid target ID",
      });
      return;
    }

    const validReasons = [
      "SPAM",
      "HARASSMENT",
      "INAPPROPRIATE_CONTENT",
      "FRAUD",
      "FAKE_LISTING",
      "OFFENSIVE_LANGUAGE",
      "COPYRIGHT_VIOLATION",
      "OTHER",
    ];

    if (!validReasons.includes(reason)) {
      res.status(400).json({
        success: false,
        message: "Invalid reason",
        validReasons,
      });
      return;
    }

    const report = await submitReportService({
      reporterId,
      targetType,
      targetId,
      reason,
      description: description || null,
    });

    res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      data: { report },
    });
  } catch (error: any) {
    console.error("Submit report controller error:", error);

    if (error.message === "Cannot report your own content") {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    if (error.message === "Target not found") {
      res.status(404).json({
        success: false,
        message: error.message,
      });
      return;
    }

    if (error.message === "You have already reported this content") {
      res.status(409).json({
        success: false,
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to submit report",
    });
  }
};

// Get user's reports
export const getMyReportsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const targetType = req.query.targetType as string;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) || "desc";

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
      });
      return;
    }

    // Validate status filter
    if (status && !["PENDING", "RESOLVED", "DISMISSED"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status. Must be PENDING, RESOLVED, or DISMISSED",
      });
      return;
    }

    // Validate target type filter
    if (targetType && !["USER", "LISTING", "MESSAGE"].includes(targetType)) {
      res.status(400).json({
        success: false,
        message: "Invalid target type. Must be USER, LISTING, or MESSAGE",
      });
      return;
    }

    // Validate sort parameters
    const validSortFields = ["createdAt", "updatedAt", "status", "reason"];
    if (!validSortFields.includes(sortBy)) {
      res.status(400).json({
        success: false,
        message: "Invalid sort field",
        validSortFields,
      });
      return;
    }

    if (!["asc", "desc"].includes(sortOrder)) {
      res.status(400).json({
        success: false,
        message: "Invalid sort order. Must be asc or desc",
      });
      return;
    }

    const result = await getMyReportsService({
      userId,
      page,
      limit,
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
    console.error("Get my reports controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve reports",
    });
  }
};

// Get report details
export const getReportDetailsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const reportId = parseInt(req.params.reportId || "");
    const userId = (req as any).user.userId;

    if (!Number.isInteger(reportId) || reportId <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
      return;
    }

    const report = await getReportDetailsService(reportId, userId);

    res.status(200).json({
      success: true,
      message: "Report details retrieved successfully",
      data: { report },
    });
  } catch (error: any) {
    console.error("Get report details controller error:", error);

    if (error.message === "Report not found") {
      res.status(404).json({
        success: false,
        message: error.message,
      });
      return;
    }

    if (error.message === "Access denied") {
      res.status(403).json({
        success: false,
        message: "You can only view your own reports",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to retrieve report details",
    });
  }
};
