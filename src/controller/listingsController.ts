import type { Request, Response } from "express";
import {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  incrementListingViews,
  updateListingStatus,
  getRelatedListings,
  getUserListings,
} from "../services/listingService.js";
import type { CreateListingDTO, ListingSearchQuery } from "../types/listing.js";

const getAuthenticatedUser = (req: Request) => {
  return (req as any).user;
};

export const createListingController = async (
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

    const listingData: CreateListingDTO = req.body;

    if (!listingData.title?.trim()) {
      res.status(400).json({
        success: false,
        message: "Title is required",
      });
      return;
    }

    if (!listingData.price || listingData.price <= 0) {
      res.status(400).json({
        success: false,
        message: "Valid price is required",
      });
      return;
    }

    if (!listingData.description?.trim()) {
      res.status(400).json({
        success: false,
        message: "Description is required",
      });
      return;
    }

    const listing = await createListing(user.userId, listingData);

    res.status(201).json({
      success: true,
      message: "Listing created successfully",
      data: listing,
    });
  } catch (error: any) {
    console.error("Create listing controller error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create listing",
    });
  }
};

export const getListingsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getAuthenticatedUser(req);
    const userId = user?.userId;

    const query: ListingSearchQuery = {
      search: req.query.search as string,
      location: req.query.location as string,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      sortBy: req.query.sortBy as "price" | "createdAt" | "views",
      sortOrder: req.query.sortOrder as "asc" | "desc",
      ...(req.query.categoryId && { categoryId: Number(req.query.categoryId) }),
    };

    if (query.page && query.page < 1) {
      res.status(400).json({
        success: false,
        message: "Page must be greater than 0",
      });
      return;
    }

    if (query.limit && (query.limit < 1 || query.limit > 100)) {
      res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100",
      });
      return;
    }

    if (query.minPrice && query.minPrice < 0) {
      res.status(400).json({
        success: false,
        message: "Minimum price cannot be negative",
      });
      return;
    }

    if (query.maxPrice && query.maxPrice < 0) {
      res.status(400).json({
        success: false,
        message: "Maximum price cannot be negative",
      });
      return;
    }

    if (query.minPrice && query.maxPrice && query.minPrice > query.maxPrice) {
      res.status(400).json({
        success: false,
        message: "Minimum price cannot be greater than maximum price",
      });
      return;
    }

    const result = await getListings(query, userId);

    res.status(200).json({
      success: true,
      message: "Listings retrieved successfully",
      data: result.listings,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Get listings controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve listings",
    });
  }
};

export const getListingController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const listingId = parseInt(req.params.id || "");
    const user = getAuthenticatedUser(req);
    const userId = user?.userId;

    if (isNaN(listingId)) {
      res.status(400).json({
        success: false,
        message: "Invalid listing ID",
      });
      return;
    }

    incrementListingViews(listingId).catch((error) => {
      console.error("Failed to increment views:", error);
    });

    const listing = await getListingById(listingId, userId);

    const relatedListings = await getRelatedListings(
      listingId,
      listing.category.id,
      4
    );

    res.status(200).json({
      success: true,
      message: "Listing retrieved successfully",
      data: {
        listing,
        relatedListings,
      },
    });
  } catch (error: any) {
    console.error("Get listing controller error:", error);
    const statusCode = error.message === "Listing not found" ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to retrieve listing",
    });
  }
};

export const updateListingController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const listingId = parseInt(req.params.id || "");
    const user = getAuthenticatedUser(req);

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

    const updateData = req.body;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: "No update data provided",
      });
      return;
    }

    if (updateData.price !== undefined && updateData.price <= 0) {
      res.status(400).json({
        success: false,
        message: "Price must be greater than 0",
      });
      return;
    }

    if (
      updateData.images &&
      (!Array.isArray(updateData.images) || updateData.images.length === 0)
    ) {
      res.status(400).json({
        success: false,
        message: "At least one image is required",
      });
      return;
    }

    const isAdmin = user.role === "ADMIN";
    const updatedListing = await updateListing(
      listingId,
      user.userId,
      updateData,
      isAdmin
    );

    res.status(200).json({
      success: true,
      message: "Listing updated successfully",
      data: updatedListing,
    });
  } catch (error: any) {
    console.error("Update listing controller error:", error);
    const statusCode =
      error.message === "Listing not found"
        ? 404
        : error.message.includes("only update your own")
        ? 403
        : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update listing",
    });
  }
};

export const deleteListingController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const listingId = parseInt(req.params.id || "");
    const user = getAuthenticatedUser(req);

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

    const isAdmin = user.role === "ADMIN";
    const result = await deleteListing(listingId, user.userId, isAdmin);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Delete listing controller error:", error);
    const statusCode =
      error.message === "Listing not found"
        ? 404
        : error.message.includes("only delete your own")
        ? 403
        : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete listing",
    });
  }
};

export const updateListingStatusController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const listingId = parseInt(req.params.id || "");
    const user = getAuthenticatedUser(req);
    const { status } = req.body;

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

    if (!status) {
      res.status(400).json({
        success: false,
        message: "Status is required",
      });
      return;
    }

    const validStatuses = ["ACTIVE", "SOLD", "EXPIRED", "BANNED"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      });
      return;
    }

    const isAdmin = user.role === "ADMIN";
    const updatedListing = await updateListingStatus(
      listingId,
      status,
      user.userId,
      isAdmin
    );

    res.status(200).json({
      success: true,
      message: "Listing status updated successfully",
      data: updatedListing,
    });
  } catch (error: any) {
    console.error("Update listing status controller error:", error);
    const statusCode =
      error.message === "Listing not found"
        ? 404
        : error.message.includes("administrators can ban")
        ? 403
        : error.message.includes("only update your own")
        ? 403
        : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update listing status",
    });
  }
};

export const getMyListingsController = async (
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

    const query: ListingSearchQuery = {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      sortBy: req.query.sortBy as "price" | "createdAt" | "views",
      sortOrder: req.query.sortOrder as "asc" | "desc",
    };

    const result = await getUserListings(user.userId, query);

    res.status(200).json({
      success: true,
      message: "Your listings retrieved successfully",
      data: result.listings,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Get my listings controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve your listings",
    });
  }
};
