import type { Request, Response } from "express";
import {
  uploadListingImagesService,
  uploadProfileImageService,
  deleteListingImageService,
  deleteProfileImageService,
  getUsageStatsService,
} from "../services/uploadService.js";

// Get authenticated user
const getAuthenticatedUser = (req: Request) => {
  return (req as any).user;
};

// Upload images for listing
export const uploadListingImagesController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const files = req.files as Express.Multer.File[];
    const listingId = req.body.listingId
      ? parseInt(req.body.listingId)
      : undefined;

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        message: "No images provided",
      });
      return;
    }

    const result = await uploadListingImagesService(
      files,
      user.userId,
      listingId
    );

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Upload listing images controller error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to upload images",
    });
  }
};

// Upload profile image
export const uploadProfileImageController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        message: "No image provided",
      });
      return;
    }

    const result = await uploadProfileImageService(file, user.userId);

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Upload profile image controller error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to upload profile image",
    });
  }
};

// Delete image from listing
export const deleteListingImageController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const { imageUrl } = req.body;
    const listingId = parseInt(req.params.listingId || "");

    if (!imageUrl) {
      res.status(400).json({
        success: false,
        message: "Image URL is required",
      });
      return;
    }

    if (isNaN(listingId)) {
      res.status(400).json({
        success: false,
        message: "Invalid listing ID",
      });
      return;
    }

    const result = await deleteListingImageService(
      imageUrl,
      listingId,
      user.userId
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Delete listing image controller error:", error);
    const statusCode =
      error.message === "Listing not found"
        ? 404
        : error.message.includes("Not authorized")
        ? 403
        : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete image",
    });
  }
};

// Delete profile image
export const deleteProfileImageController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const result = await deleteProfileImageService(user.userId);

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Delete profile image controller error:", error);
    const statusCode = error.message === "No profile image found" ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete profile image",
    });
  }
};

// Get Cloudinary usage stats (admin only)
export const getUsageStatsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getAuthenticatedUser(req);
    if (!user || user.role !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Admin access required",
      });
      return;
    }

    const stats = await getUsageStatsService();

    if (!stats) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch usage statistics",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Usage statistics retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error("Get usage stats controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get usage statistics",
    });
  }
};
