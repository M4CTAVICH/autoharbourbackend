import type { Request, Response } from "express";
import {
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  toggleFavorite,
} from "../services/favoriteService.js";

const getAuthenticatedUser = (req: Request) => {
  return (req as any).user;
};

// Add to favorites
export const addToFavoritesController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getAuthenticatedUser(req);
    const listingId = parseInt(req.params.listingId || "");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
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

    const result = await addToFavorites(user.userId, listingId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Add to favorites controller error:", error);
    const statusCode = error.message === "Listing not found" ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to add to favorites",
    });
  }
};

// Remove from favorites
export const removeFromFavoritesController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getAuthenticatedUser(req);
    const listingId = parseInt(req.params.listingId || "");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
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

    const result = await removeFromFavorites(user.userId, listingId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Remove from favorites controller error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to remove from favorites",
    });
  }
};

// Get user's favorites
export const getUserFavoritesController = async (
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

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const result = await getUserFavorites(user.userId, page, limit);

    res.status(200).json({
      success: true,
      message: "Favorites retrieved successfully",
      data: result.favorites,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Get user favorites controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve favorites",
    });
  }
};

// Toggle favorite
export const toggleFavoriteController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getAuthenticatedUser(req);
    const listingId = parseInt(req.params.listingId || "");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
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

    const result = await toggleFavorite(user.userId, listingId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { isFavorited: result.isFavorited },
    });
  } catch (error: any) {
    console.error("Toggle favorite controller error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to toggle favorite",
    });
  }
};
