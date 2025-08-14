import prisma from "../config/db.js";
import type {
  CreateListingDTO,
  ListingSearchQuery,
  ListingResponse,
} from "../types/listing.js";

export const createListing = async (
  userId: number,
  listingData: CreateListingDTO
): Promise<ListingResponse> => {
  try {
    if (!listingData.title || !listingData.price || !listingData.description) {
      throw new Error("Title, price, and description are required");
    }

    if (!listingData.images || listingData.images.length === 0) {
      throw new Error("At least one image is required");
    }

    if (!listingData.categoryId) {
      throw new Error("Category is required");
    }

    const category = await prisma.category.findUnique({
      where: { id: listingData.categoryId },
    });

    if (!category) {
      throw new Error("Invalid category selected");
    }

    const listing = await prisma.listing.create({
      data: {
        title: listingData.title,
        price: listingData.price,
        description: listingData.description,
        location: listingData.location,
        latitude:
          listingData.latitude !== undefined ? listingData.latitude : null,
        longitude:
          listingData.longitude !== undefined ? listingData.longitude : null,
        categoryId: listingData.categoryId,
        images: listingData.images,
        userId,
        status: "ACTIVE",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return formatListingResponse(listing);
  } catch (error) {
    console.error("Create listing error:", error);
    throw error;
  }
};

export const getListings = async (
  query: ListingSearchQuery,
  userId?: number
): Promise<{
  listings: ListingResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> => {
  try {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      status: "ACTIVE",
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.location) {
      where.location = { contains: query.location, mode: "insensitive" };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }

    let orderBy: any = { createdAt: "desc" };

    if (query.sortBy) {
      const sortOrder = query.sortOrder || "desc";
      orderBy = { [query.sortBy]: sortOrder };
    }

    const total = await prisma.listing.count({ where });

    const listings = await prisma.listing.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        favorites: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : false,
      },
    });

    const formattedListings = listings.map((listing) => ({
      ...formatListingResponse(listing),
      isFavorited: userId ? listing.favorites.length > 0 : false,
    }));

    return {
      listings: formattedListings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Get listings error:", error);
    throw error;
  }
};

export const getListingById = async (
  listingId: number,
  userId?: number
): Promise<ListingResponse> => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        favorites: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : false,
      },
    });

    if (!listing) {
      throw new Error("Listing not found");
    }

    const response = formatListingResponse(listing);
    if (userId) {
      response.isFavorited = listing.favorites.length > 0;
    }

    return response;
  } catch (error) {
    console.error("Get listing by ID error:", error);
    throw error;
  }
};

export const updateListing = async (
  listingId: number,
  userId: number,
  updateData: Partial<CreateListingDTO>,
  isAdmin: boolean = false
): Promise<ListingResponse> => {
  try {
    const existingListing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!existingListing) {
      throw new Error("Listing not found");
    }

    if (!isAdmin && existingListing.userId !== userId) {
      throw new Error("You can only update your own listings");
    }

    if (updateData.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: updateData.categoryId },
      });
      if (!category) {
        throw new Error("Invalid category selected");
      }
    }

    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return formatListingResponse(updatedListing);
  } catch (error) {
    console.error("Update listing error:", error);
    throw error;
  }
};

export const deleteListing = async (
  listingId: number,
  userId: number,
  isAdmin: boolean = false
): Promise<{ message: string }> => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new Error("Listing not found");
    }

    if (!isAdmin && listing.userId !== userId) {
      throw new Error("You can only delete your own listings");
    }

    await prisma.listing.delete({
      where: { id: listingId },
    });

    return { message: "Listing deleted successfully" };
  } catch (error) {
    console.error("Delete listing error:", error);
    throw error;
  }
};

export const incrementListingViews = async (
  listingId: number
): Promise<void> => {
  try {
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        views: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    console.error("Increment views error:", error);
  }
};

export const updateListingStatus = async (
  listingId: number,
  status: string,
  userId: number,
  isAdmin: boolean = false
): Promise<ListingResponse> => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new Error("Listing not found");
    }

    if (status === "BANNED" && !isAdmin) {
      throw new Error("Only administrators can ban listings");
    }

    if (!isAdmin && listing.userId !== userId) {
      throw new Error("You can only update your own listings");
    }

    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: { status: status as import("@prisma/client").ListingStatus },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return formatListingResponse(updatedListing);
  } catch (error) {
    console.error("Update listing status error:", error);
    throw error;
  }
};

export const getRelatedListings = async (
  listingId: number,
  categoryId: number,
  limit: number = 4
): Promise<ListingResponse[]> => {
  try {
    const listings = await prisma.listing.findMany({
      where: {
        categoryId,
        status: "ACTIVE",
        id: { not: listingId },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return listings.map(formatListingResponse);
  } catch (error) {
    console.error("Get related listings error:", error);
    return [];
  }
};

const formatListingResponse = (listing: any): ListingResponse => {
  return {
    id: listing.id,
    title: listing.title,
    price: listing.price,
    description: listing.description,
    images: listing.images || [],
    location: listing.location,
    status: listing.status,
    views: listing.views || 0,
    createdAt: listing.createdAt,
    user: {
      id: listing.user.id,
      name: listing.user.name,
      avatar: listing.user.avatar || undefined,
      phone: listing.user.phone || undefined,
    },
    category: {
      id: listing.category.id,
      name: listing.category.name,
      slug: listing.category.slug,
    },
  };
};
export const getUserListings = async (
  userId: number,
  query: ListingSearchQuery
): Promise<{
  listings: ListingResponse[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  try {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      userId: userId,
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    let orderBy: any = { createdAt: "desc" };
    if (query.sortBy) {
      const sortOrder = query.sortOrder || "desc";
      orderBy = { [query.sortBy]: sortOrder };
    }

    const total = await prisma.listing.count({ where });

    const listings = await prisma.listing.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return {
      listings: listings.map(formatListingResponse),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Get user listings error:", error);
    throw error;
  }
};
