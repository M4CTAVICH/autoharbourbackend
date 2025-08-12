import { Router } from "express";
import {
  createCategoryController,
  getAllCategoriesController,
  getCategoryTreeController,
  getRootCategoriesController,
  getCategoryByIdController,
  getCategoryBySlugController,
  updateCategoryController,
  deleteCategoryController,
  searchCategoriesController,
} from "../controller/categoryController.js";
import {
  authenticateToken,
  requireAdmin,
  optionalAuth,
} from "../middlewares/authMiddleware.js";

const router = Router();

// Public routes
router.get("/", getAllCategoriesController);
router.get("/tree", getCategoryTreeController);
router.get("/root", getRootCategoriesController);
router.get("/search", searchCategoriesController);
router.get("/slug/:slug", getCategoryBySlugController);
router.get("/:id", getCategoryByIdController);

// Admin routes
router.post("/", authenticateToken, requireAdmin, createCategoryController);
router.put("/:id", authenticateToken, requireAdmin, updateCategoryController);
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  deleteCategoryController
);

export default router;
