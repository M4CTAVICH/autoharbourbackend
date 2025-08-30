import { Router } from "express";
import {
  searchListingsController,
  getSearchSuggestionsController,
  saveSearchController,
  getSavedSearchesController,
  deleteSavedSearchController,
  getPopularSearchesController,
  runSavedSearchController,
} from "../controller/searchController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = Router();

// Public Route
router.get("/", searchListingsController);
router.get("/suggestions", getSearchSuggestionsController);
router.get("/popular", getPopularSearchesController);

// Protected Routes
router.use(authenticateToken);

// Saved searches management
router.post("/save", saveSearchController);
router.get("/saved", getSavedSearchesController);
router.delete("/saved/:searchId", deleteSavedSearchController);
router.get("/saved/:searchId/run", runSavedSearchController);

export default router;
