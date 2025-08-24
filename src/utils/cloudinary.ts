import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { ENV } from "../config/env.js";

cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (
  buffer: Buffer,
  folder: string,
  publicId?: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const options: any = {
      folder: `autoharbour/${folder}`,
      transformation:
        folder === "profiles"
          ? [
              {
                width: 300,
                height: 300,
                crop: "fill",
                gravity: "face",
                quality: "80",
              },
            ]
          : [{ width: 800, height: 600, crop: "limit", quality: "80" }],
      allowed_formats: ["jpg", "jpeg", "png"],
    };
    if (publicId !== undefined) {
      options.public_id = publicId;
    }

    cloudinary.uploader
      .upload_stream(options, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      })
      .end(buffer);
  });
};

const storage = multer.memoryStorage();

export const uploadListingImages = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export const uploadProfileImage = multer({
  storage,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export const uploadListingImagesToCloudinary = async (
  files: Express.Multer.File[],
  userId: number
): Promise<{
  urls: string[];
  publicIds: string[];
}> => {
  const urls: string[] = [];
  const publicIds: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) {
      console.error(`File at index ${i} is undefined`);
      throw new Error(`File at index ${i} is undefined`);
    }
    const timestamp = Date.now();
    const publicId = `listing_${userId}_${timestamp}_${i}`;
    try {
      const result = await uploadToCloudinary(
        file.buffer,
        "listings",
        publicId
      );
      urls.push(result.secure.url);
      publicIds.push(result.public_id);
    } catch (error) {
      console.error("Error uploading listing image", error);
      throw new Error(`Failed to upload image ${i + 1}`);
    }
  }
  return { urls, publicIds };
};
export const uploadProfileImageToCloudinary = async (
  file: Express.Multer.File,
  userId: number
): Promise<{
  url: string;
  publicId: string;
}> => {
  const timestamp = Date.now();
  const publicId = `profile_${userId}_${timestamp}`;

  try {
    const result = await uploadToCloudinary(file.buffer, "profiles", publicId);
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw new Error("Failed to upload profile image");
  }
};

export const deleteImageFromCloudinary = async (
  publicId: string
): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    return false;
  }
};

export const getImagePublicId = (url: string): string | null => {
  try {
    const urlParts = url.split("/");
    const publicIdWithExtension = urlParts[urlParts.length - 1];
    if (!publicIdWithExtension) {
      console.error("URL does not contain a valid public ID segment.");
      return null;
    }
    const publicId = publicIdWithExtension.split(".")[0];

    // Include folder path
    const folderIndex = urlParts.indexOf("autoharbour");
    if (folderIndex !== -1) {
      const folderPath = urlParts.slice(folderIndex, -1).join("/");
      return `${folderPath}/${publicId}`;
    }

    return publicId ?? null;
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
};

// Simple image optimization for free plan
export const getOptimizedImageUrl = (
  url: string,
  size: "small" | "medium" | "large" = "medium"
): string => {
  try {
    const publicId = getImagePublicId(url);
    if (!publicId) return url;

    const sizes = {
      small: { width: 200, height: 150 },
      medium: { width: 400, height: 300 },
      large: { width: 800, height: 600 },
    };

    const { width, height } = sizes[size];

    return cloudinary.url(publicId, {
      width,
      height,
      crop: "fill",
      quality: "80",
      fetch_format: "auto",
    });
  } catch (error) {
    console.error("Error optimizing image URL:", error);
    return url;
  }
};

// Bulk delete images
export const deleteMultipleImages = async (
  publicIds: string[]
): Promise<{
  deleted: string[];
  failed: string[];
  savedBandwidth: number;
}> => {
  const deleted: string[] = [];
  const failed: string[] = [];
  let savedBandwidth = 0;

  for (const publicId of publicIds) {
    const success = await deleteImageFromCloudinary(publicId);
    if (success) {
      deleted.push(publicId);
      savedBandwidth += 500000; // Estimate ~500KB per image
    } else {
      failed.push(publicId);
    }
  }

  return { deleted, failed, savedBandwidth };
};

// Get Cloudinary usage stats
export const getCloudinaryUsage = async (): Promise<{
  storage: number;
  bandwidth: number;
  transformations: number;
} | null> => {
  try {
    const usage = await cloudinary.api.usage();
    return {
      storage: usage.storage.usage || 0,
      bandwidth: usage.bandwidth.usage || 0,
      transformations: usage.transformations.usage || 0,
    };
  } catch (error) {
    console.error("Error fetching Cloudinary usage:", error);
    return null;
  }
};

export default cloudinary;
