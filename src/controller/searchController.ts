import type { Request, Response } from "express";
import prisma from "../config/db.js";
import {
  searchListingsService,
  getSearchSuggestionsService,
  saveSearchService,
  getSavedSearchesService,
  getPopularSearchesService,
} from "../services/searchService.js";
import type { SearchParams } from "../types/search.js";

const getAuthenticatedUser = (req: Request) => {
  return (req as any).user as { userId: number } | null;
};

export const searchListingsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = getAuthenticatedUser(req);

    const searchParams: SearchParams = {
      q: req.query.q as string,
      category: req.query.category as string,
      location: req.query.location as string,
      minPrice: req.query.minPrice
        ? parseFloat(req.query.minPrice as string)
        : undefined,
      maxPrice: req.query.maxPrice
        ? parseFloat(req.query.maxPrice as string)
        : undefined,
      radius: req.query.radius
        ? parseInt(req.query.radius as string)
        : undefined,
      sortBy:
        (req.query.sortBy as "price" | "date" | "popularity" | "distance") ||
        "date",
      sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      status:
        (req.query.status as "ACTIVE" | "INACTIVE" | "PENDING") || "ACTIVE",
      userId: req.query.userId
        ? parseInt(req.query.userId as string)
        : undefined,
      hasImages: req.query.hasImages === "true",
      dateFrom: req.query.dateFrom
        ? new Date(req.query.dateFrom as string)
        : undefined,
      dateTo: req.query.dateTo
        ? new Date(req.query.dateTo as string)
        : undefined,
    };

    if (searchParams.page && searchParams.page < 1) {
      res.status(400).json({
        success: false,
        message: "Page number must be 1 or greater",
      });
      return;
    }

    if (
      searchParams.limit &&
      (searchParams.limit < 1 || searchParams.limit > 50)
    ) {
      res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 50",
      });
      return;
    }

    if (
      searchParams.minPrice &&
      searchParams.maxPrice &&
      searchParams.minPrice > searchParams.maxPrice
    ) {
      res.status(400).json({
        success: false,
        message: "Minimum price cannot be greater than maximum price",
      });
      return;
    }

    const result = await searchListingsService(searchParams, user?.userId);

    const pagination = {
      page: searchParams.page || 1,
      limit: searchParams.limit || 20,
      total: result.total,
      pages: Math.ceil(result.total / (searchParams.limit || 20)),
    };

    res.status(200).json({
      success: true,
      message: `Found ${result.total} listing(s)`,
      data: {
        listings: result.listings,
        pagination,
        filters: result.filters,
      },
    });
  } catch (error: any) {
    console.error("Search listings controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Search failed",
    });
  }
};

export const getSearchSuggestionsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const query = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    if (!query || query.length < 2) {
      res.status(400).json({
        success: false,
        message: "Query must be at least 2 characters long",
      });
      return;
    }

    const suggestions = await getSearchSuggestionsService(query, limit);

    res.status(200).json({
      success: true,
      message: "Search suggestions retrieved successfully",
      data: { suggestions },
    });
  } catch (error: any) {
    console.error("Get search suggestions controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get search suggestions",
    });
  }
};

export const saveSearchController = async (
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

    const { name, searchParams, alertEnabled = false } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Search name is required",
      });
      return;
    }

    if (!searchParams || typeof searchParams !== "object") {
      res.status(400).json({
        success: false,
        message: "Search parameters are required",
      });
      return;
    }

    const savedSearch = await saveSearchService(
      user.userId,
      name.trim(),
      searchParams,
      Boolean(alertEnabled)
    );

    res.status(201).json({
      success: true,
      message: "Search saved successfully",
      data: { savedSearch },
    });
  } catch (error: any) {
    console.error("Save search controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to save search",
    });
  }
};

export const getSavedSearchesController = async (
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

    const savedSearches = await getSavedSearchesService(user.userId);

    res.status(200).json({
      success: true,
      message: "Saved searches retrieved successfully",
      data: { savedSearches },
    });
  } catch (error: any) {
    console.error("Get saved searches controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve saved searches",
    });
  }
};

export const deleteSavedSearchController = async (
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

    const searchId = parseInt(req.params.searchId || "");
    if (isNaN(searchId)) {
      res.status(400).json({
        success: false,
        message: "Invalid search ID",
      });
      return;
    }

    const existingSearch = await prisma.savedSearch.findFirst({
      where: { id: searchId, userId: user.userId },
    });

    if (!existingSearch) {
      res.status(404).json({
        success: false,
        message: "Saved search not found",
      });
      return;
    }

    await prisma.savedSearch.delete({
      where: { id: searchId },
    });

    res.status(200).json({
      success: true,
      message: "Saved search deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete saved search controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete saved search",
    });
  }
};

export const getPopularSearchesController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    if (limit < 1 || limit > 50) {
      res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 50",
      });
      return;
    }

    const popularSearches = await getPopularSearchesService(limit);

    res.status(200).json({
      success: true,
      message: "Popular searches retrieved successfully",
      data: { popularSearches },
    });
  } catch (error: any) {
    console.error("Get popular searches controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve popular searches",
    });
  }
};

export const runSavedSearchController = async (
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

    const searchId = parseInt(req.params.searchId || "");
    if (isNaN(searchId)) {
      res.status(400).json({
        success: false,
        message: "Invalid search ID",
      });
      return;
    }

    const savedSearch = await prisma.savedSearch.findFirst({
      where: { id: searchId, userId: user.userId },
    });

    if (!savedSearch) {
      res.status(404).json({
        success: false,
        message: "Saved search not found",
      });
      return;
    }

    const searchParams: SearchParams = JSON.parse(savedSearch.searchParams);
    const result = await searchListingsService(searchParams, user.userId);

    await prisma.savedSearch.update({
      where: { id: searchId },
      data: { lastRun: new Date() },
    });

    const pagination = {
      page: searchParams.page || 1,
      limit: searchParams.limit || 20,
      total: result.total,
      pages: Math.ceil(result.total / (searchParams.limit || 20)),
    };

    res.status(200).json({
      success: true,
      message: `Found ${result.total} listing(s) for saved search "${savedSearch.name}"`,
      data: {
        listings: result.listings,
        pagination,
        filters: result.filters,
        searchName: savedSearch.name,
      },
    });
  } catch (error: any) {
    console.error("Run saved search controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to run saved search",
    });
  }
};
