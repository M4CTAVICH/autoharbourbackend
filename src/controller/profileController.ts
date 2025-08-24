import type { Request, Response } from "express";
import prisma from "../config/db.js";
import {
  getMyProfileService,
  getPublicProfileService,
  updateProfileService,
  changePasswordService,
  deactivateAccountService,
  getUserListingsForProfileService,
} from "../services/profileService.js";
import type { UpdateProfileDTO, ChangePasswordDTO } from "../types/profile.js";

const getAuthenticatedUser = (req: Request) => {
  return (req as any).user;
};

// Get current user's profile
export const getMyProfileController = async (
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

    const profile = await getMyProfileService(user.userId);

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: profile,
    });
  } catch (error: any) {
    console.error("Get my profile controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve profile",
    });
  }
};

// Get public profile by user ID
export const getPublicProfileController = async (
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

    const profile = await getPublicProfileService(userId);

    res.status(200).json({
      success: true,
      message: "Public profile retrieved successfully",
      data: profile,
    });
  } catch (error: any) {
    console.error("Get public profile controller error:", error);
    const statusCode =
      error.message === "User not found or inactive" ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to retrieve profile",
    });
  }
};

// Update user profile
export const updateProfileController = async (
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

    const updateData: UpdateProfileDTO = req.body;

    // Validate update data
    if (updateData.name !== undefined && updateData.name.trim().length < 2) {
      res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters long",
      });
      return;
    }

    if (updateData.bio !== undefined && updateData.bio.length > 500) {
      res.status(400).json({
        success: false,
        message: "Bio must be 500 characters or less",
      });
      return;
    }

    if (updateData.dateOfBirth && typeof updateData.dateOfBirth === "string") {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);

      if (isNaN(updateData.dateOfBirth.getTime())) {
        res.status(400).json({
          success: false,
          message: "Invalid date of birth format",
        });
        return;
      }
    }

    const updatedProfile = await updateProfileService(user.userId, updateData);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedProfile,
    });
  } catch (error: any) {
    console.error("Update profile controller error:", error);
    const statusCode = error.message.includes("already in use") ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
};

// Change password
export const changePasswordController = async (
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

    const passwordData: ChangePasswordDTO = req.body;

    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      res.status(400).json({
        success: false,
        message:
          "Current password, new password, and confirmation are required",
      });
      return;
    }

    await changePasswordService(user.userId, passwordData);

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error: any) {
    console.error("Change password controller error:", error);
    const statusCode =
      error.message === "Current password is incorrect" ? 401 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to change password",
    });
  }
};

// Deactivate account
export const deactivateAccountController = async (
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

    await deactivateAccountService(user.userId);

    res.status(200).json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error: any) {
    console.error("Deactivate account controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to deactivate account",
    });
  }
};

// Get user listings
export const getUserListingsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId || "");
    const currentUser = getAuthenticatedUser(req);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const result = await getUserListingsForProfileService(
      userId,
      currentUser?.userId,
      page,
      limit
    );

    res.status(200).json({
      success: true,
      message: "User listings retrieved successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Get user listings controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve user listings",
    });
  }
};

// Get user statistics
export const getUserStatsController = async (
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

    // Get basic stats
    const [totalListings, activeListings, totalFavorites, joinedAt] =
      await Promise.all([
        prisma.listing.count({ where: { userId } }),
        prisma.listing.count({ where: { userId, status: "ACTIVE" } }),
        prisma.favorite.count({ where: { listing: { userId } } }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { createdAt: true, rating: true, reviewCount: true },
        }),
      ]);

    if (!joinedAt) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const stats = {
      totalListings,
      activeListings,
      totalFavorites,
      rating: joinedAt.rating || 0,
      reviewCount: joinedAt.reviewCount || 0,
      joinedDaysAgo: Math.floor(
        (Date.now() - joinedAt.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
    };

    res.status(200).json({
      success: true,
      message: "User statistics retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error("Get user stats controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve user statistics",
    });
  }
};
