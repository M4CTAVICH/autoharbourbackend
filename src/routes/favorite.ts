import { Router } from "express";
import {
  addToFavoritesController,
  removeFromFavoritesController,
  getUserFavoritesController,
  toggleFavoriteController,
} from "../controller/favoriteController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/:listingId", authenticateToken, addToFavoritesController);
router.delete("/:listingId", authenticateToken, removeFromFavoritesController);
router.patch("/:listingId", authenticateToken, toggleFavoriteController);
router.get("/", authenticateToken, getUserFavoritesController);

export default router;
