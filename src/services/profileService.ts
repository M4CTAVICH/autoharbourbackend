import prisma from "../config/db.js";
import bcrypt from "bcryptjs";
import type {
  UserProfile,
  PublicUserProfile,
  UpdateProfileDTO,
  ChangePasswordDTO,
  ProfileResponse,
  UserVerificationRequest,
} from "../types/profile.js";

// Get user's own profile (private)
export const getMyProfileService = async (
  userId: number
): Promise<UserProfile> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        bio: true,
        location: true,
        dateOfBirth: true,
        isVerified: true,
        isActive: true,
        lastSeen: true,
        rating: true,
        reviewCount: true,
        createdAt: true,
        _count: {
          select: {
            listings: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get active listings count separately due to Prisma limitation
    const activeListings = await prisma.listing.count({
      where: {
        userId: userId,
        status: "ACTIVE",
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email || undefined,
      phone: user.phone || undefined,
      avatar: user.avatar || undefined,
      bio: user.bio || undefined,
      location: user.location || undefined,
      dateOfBirth: user.dateOfBirth || undefined,
      isVerified: user.isVerified,
      isActive: user.isActive,
      lastSeen: user.lastSeen || undefined,
      rating: user.rating || undefined,
      reviewCount: user.reviewCount,
      joinedAt: user.createdAt,
      totalListings: user._count.listings,
      activeListings,
    };
  } catch (error) {
    console.error("Get my profile error:", error);
    throw error;
  }
};

// Get public profile by user ID
export const getPublicProfileService = async (
  userId: number
): Promise<PublicUserProfile> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        location: true,
        isVerified: true,
        lastSeen: true,
        rating: true,
        reviewCount: true,
        createdAt: true,
        _count: {
          select: {
            listings: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found or inactive");
    }

    // Get active listings count
    const activeListings = await prisma.listing.count({
      where: {
        userId: userId,
        status: "ACTIVE",
      },
    });

    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar || undefined,
      bio: user.bio || undefined,
      location: user.location || undefined,
      isVerified: user.isVerified,
      rating: user.rating || undefined,
      reviewCount: user.reviewCount,
      joinedAt: user.createdAt,
      totalListings: user._count.listings,
      activeListings,
      lastSeen: user.lastSeen || undefined,
    };
  } catch (error) {
    console.error("Get public profile error:", error);
    throw error;
  }
};

// Update user profile
export const updateProfileService = async (
  userId: number,
  updateData: UpdateProfileDTO
): Promise<UserProfile> => {
  try {
    // Validate phone number if provided
    if (updateData.phone) {
      const existingUser = await prisma.user.findFirst({
        where: {
          phone: updateData.phone,
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw new Error("Phone number already in use");
      }
    }

    // Validate age if date of birth provided
    if (updateData.dateOfBirth) {
      const age =
        new Date().getFullYear() - updateData.dateOfBirth.getFullYear();
      if (age < 13) {
        throw new Error("Must be at least 13 years old");
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    return getMyProfileService(userId);
  } catch (error) {
    console.error("Update profile error:", error);
    throw error;
  }
};

// Change password
export const changePasswordService = async (
  userId: number,
  passwordData: ChangePasswordDTO
): Promise<void> => {
  try {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      throw new Error("New passwords do not match");
    }

    if (passwordData.newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      passwordData.currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    const hashedNewPassword = await bcrypt.hash(passwordData.newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Change password error:", error);
    throw error;
  }
};

// Deactivate account
export const deactivateAccountService = async (
  userId: number
): Promise<void> => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Also deactivate all user's listings
    await prisma.listing.updateMany({
      where: { userId: userId },
      data: { status: "INACTIVE" as any },
    });
  } catch (error) {
    console.error("Deactivate account error:", error);
    throw error;
  }
};

// Get user's listings for profile
export const getUserListingsForProfileService = async (
  userId: number,
  viewerUserId?: number,
  page = 1,
  limit = 10
) => {
  try {
    const offset = (page - 1) * limit;

    // If viewing own profile, show all listings; if public, show only active
    const statusFilter =
      viewerUserId === userId ? {} : { status: "ACTIVE" as const };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where: {
          userId: userId,
          ...statusFilter,
        },
        select: {
          id: true,
          title: true,
          price: true,
          images: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: { id: true, name: true },
          },
          _count: {
            select: { favorites: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),

      prisma.listing.count({
        where: {
          userId: userId,
          ...statusFilter,
        },
      }),
    ]);

    return {
      listings: listings.map((listing) => ({
        ...listing,
        images: listing.images.slice(0, 1), // Only first image for profile view
        favoriteCount: listing._count.favorites,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Get user listings for profile error:", error);
    throw error;
  }
};
