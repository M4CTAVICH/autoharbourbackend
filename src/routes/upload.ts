import { Router } from "express";
import {
  uploadListingImagesController,
  uploadProfileImageController,
  deleteListingImageController,
  deleteProfileImageController,
  getUsageStatsController,
} from "../controller/uploadController.js";
import {
  uploadListingImages,
  uploadProfileImage,
} from "../utils/cloudinary.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(authenticateToken);

router.post(
  "/listing-images",
  uploadListingImages.array("images", 5),
  uploadListingImagesController
);

router.post(
  "/profile-image",
  uploadProfileImage.single("image"),
  uploadProfileImageController
);

router.delete("/listing/:listingId/image", deleteListingImageController);

router.delete("/profile-image", deleteProfileImageController);

// Admin Route
router.get("/usage-stats", getUsageStatsController);

export default router;
