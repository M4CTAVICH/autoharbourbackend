import type { Request, Response } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryTree,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  getRootCategories,
  searchCategories,
} from "../services/categoryService.js";
import type {
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from "../types/category.js";

// Create new category Admin only
export const createCategoryController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const categoryData: CreateCategoryDTO = req.body;

    if (!categoryData.name || !categoryData.slug) {
      res.status(400).json({
        success: false,
        message: "Name and slug are required",
      });
      return;
    }

    const category = await createCategory(categoryData);

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error: any) {
    console.error("Create category controller error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create category",
    });
  }
};

// Get all categories
export const getAllCategoriesController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const categories = await getAllCategories();

    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: categories,
    });
  } catch (error: any) {
    console.error("Get all categories controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve categories",
    });
  }
};

// Get category tree hierarchy
export const getCategoryTreeController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const categoryTree = await getCategoryTree();

    res.status(200).json({
      success: true,
      message: "Category tree retrieved successfully",
      data: categoryTree,
    });
  } catch (error: any) {
    console.error("Get category tree controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve category tree",
    });
  }
};

// Get root categories only for main navigation
export const getRootCategoriesController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const rootCategories = await getRootCategories();

    res.status(200).json({
      success: true,
      message: "Root categories retrieved successfully",
      data: rootCategories,
    });
  } catch (error: any) {
    console.error("Get root categories controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve root categories",
    });
  }
};

// Get single category by ID
export const getCategoryByIdController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const categoryId = parseInt(req.params.id || "");

    if (isNaN(categoryId)) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
      return;
    }

    const category = await getCategoryById(categoryId);

    res.status(200).json({
      success: true,
      message: "Category retrieved successfully",
      data: category,
    });
  } catch (error: any) {
    console.error("Get category by ID controller error:", error);
    const statusCode = error.message === "Category not found" ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to retrieve category",
    });
  }
};

// Get single category by slug
export const getCategoryBySlugController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;

    if (!slug) {
      res.status(400).json({
        success: false,
        message: "Category slug is required",
      });
      return;
    }

    const category = await getCategoryBySlug(slug);

    res.status(200).json({
      success: true,
      message: "Category retrieved successfully",
      data: category,
    });
  } catch (error: any) {
    console.error("Get category by slug controller error:", error);
    const statusCode = error.message === "Category not found" ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to retrieve category",
    });
  }
};

// Update category (Admin only)
export const updateCategoryController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const categoryId = parseInt(req.params.id || "");
    const updateData: UpdateCategoryDTO = req.body;

    if (isNaN(categoryId)) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
      return;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: "No update data provided",
      });
      return;
    }

    const updatedCategory = await updateCategory(categoryId, updateData);

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error: any) {
    console.error("Update category controller error:", error);
    const statusCode = error.message === "Category not found" ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update category",
    });
  }
};

// Delete category Admin only
export const deleteCategoryController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const categoryId = parseInt(req.params.id || "");

    if (isNaN(categoryId)) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
      return;
    }

    const result = await deleteCategory(categoryId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Delete category controller error:", error);
    const statusCode = error.message === "Category not found" ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete category",
    });
  }
};

// Search categories
export const searchCategoriesController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { q: query } = req.query;

    if (!query || typeof query !== "string") {
      res.status(400).json({
        success: false,
        message: "Search query is required",
      });
      return;
    }

    if (query.trim().length < 2) {
      res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters long",
      });
      return;
    }

    const categories = await searchCategories(query.trim());

    res.status(200).json({
      success: true,
      message: "Categories search completed",
      data: categories,
    });
  } catch (error: any) {
    console.error("Search categories controller error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search categories",
    });
  }
};
