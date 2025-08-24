import {
  uploadListingImagesToCloudinary,
  uploadProfileImageToCloudinary,
  deleteImageFromCloudinary,
  deleteMultipleImages,
  getImagePublicId,
  getCloudinaryUsage,
} from "../utils/cloudinary.js";
import prisma from "../config/db.js";
import type { UploadResponse, DeleteImageResponse } from "../types/upload.js";

// Upload images for a listing
export const uploadListingImagesService = async (
  files: Express.Multer.File[],
  userId: number,
  listingId?: number
): Promise<UploadResponse> => {
  try {
    if (!files || files.length === 0) {
      throw new Error("No files provided");
    }

    if (files.length > 5) {
      throw new Error("Maximum 5 images allowed per listing");
    }

    const { urls, publicIds } = await uploadListingImagesToCloudinary(
      files,
      userId
    );

    if (listingId) {
      const existingListing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: { images: true, userId: true },
      });

      if (!existingListing) {
        await deleteMultipleImages(publicIds);
        throw new Error("Listing not found");
      }

      if (existingListing.userId !== userId) {
        await deleteMultipleImages(publicIds);
        throw new Error("Not authorized to update this listing");
      }

      const combinedImages = [...(existingListing.images || []), ...urls].slice(
        0,
        5
      );

      await prisma.listing.update({
        where: { id: listingId },
        data: { images: combinedImages },
      });
    }

    return {
      success: true,
      message: `${urls.length} image(s) uploaded successfully`,
      data: {
        urls,
        publicIds,
      },
    };
  } catch (error: any) {
    console.error("Upload listing images error:", error);
    throw error;
  }
};

// Upload profile image
export const uploadProfileImageService = async (
  file: Express.Multer.File,
  userId: number
): Promise<UploadResponse> => {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const { url, publicId } = await uploadProfileImageToCloudinary(
      file,
      userId
    );

    if (user.avatar) {
      const oldPublicId = getImagePublicId(user.avatar);
      if (oldPublicId) {
        await deleteImageFromCloudinary(oldPublicId);
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: url },
    });

    return {
      success: true,
      message: "Profile image updated successfully",
      data: {
        urls: [url],
        publicIds: [publicId],
      },
    };
  } catch (error: any) {
    console.error("Upload profile image error:", error);
    throw error;
  }
};

// Delete image from listing
export const deleteListingImageService = async (
  imageUrl: string,
  listingId: number,
  userId: number
): Promise<DeleteImageResponse> => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { images: true, userId: true },
    });

    if (!listing) {
      throw new Error("Listing not found");
    }

    if (listing.userId !== userId) {
      throw new Error("Not authorized to modify this listing");
    }

    if (!listing.images || !listing.images.includes(imageUrl)) {
      throw new Error("Image not found in listing");
    }

    const publicId = getImagePublicId(imageUrl);
    if (!publicId) {
      throw new Error("Invalid image URL");
    }

    const deleted = await deleteImageFromCloudinary(publicId);
    if (!deleted) {
      throw new Error("Failed to delete image from cloud storage");
    }

    const updatedImages = listing.images.filter((img) => img !== imageUrl);
    await prisma.listing.update({
      where: { id: listingId },
      data: { images: updatedImages },
    });

    return {
      success: true,
      message: "Image deleted successfully",
      deleted: [publicId],
    };
  } catch (error: any) {
    console.error("Delete listing image error:", error);
    throw error;
  }
};

// Delete profile image
export const deleteProfileImageService = async (
  userId: number
): Promise<DeleteImageResponse> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (!user || !user.avatar) {
      throw new Error("No profile image found");
    }

    const publicId = getImagePublicId(user.avatar);
    if (!publicId) {
      throw new Error("Invalid image URL");
    }

    const deleted = await deleteImageFromCloudinary(publicId);
    if (!deleted) {
      throw new Error("Failed to delete image from cloud storage");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: null },
    });

    return {
      success: true,
      message: "Profile image deleted successfully",
      deleted: [publicId],
    };
  } catch (error: any) {
    console.error("Delete profile image error:", error);
    throw error;
  }
};

// Get Cloudinary usage stats (admin only!!!!!!!!!!!!)
export const getUsageStatsService = async (): Promise<{
  storage: number;
  bandwidth: number;
  transformations: number;
} | null> => {
  try {
    return await getCloudinaryUsage();
  } catch (error) {
    console.error("Get usage stats error:", error);
    return null;
  }
};
