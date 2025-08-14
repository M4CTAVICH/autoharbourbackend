import prisma from "../config/db.js";
import type { FavoriteResponse } from "../types/favorites.js";

export const addToFavorites = async (
  userId: number,
  listingId: number
): Promise<{ message: string }> => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new Error("Listing not found");
    }

    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
    });

    if (existingFavorite) {
      throw new Error("Listing already in favorites");
    }

    await prisma.favorite.create({
      data: {
        userId,
        listingId,
      },
    });

    return { message: "Added to favorites successfully" };
  } catch (error) {
    console.error("Add to favorites error:", error);
    throw error;
  }
};

export const removeFromFavorites = async (
  userId: number,
  listingId: number
): Promise<{ message: string }> => {
  try {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
    });

    if (!favorite) {
      throw new Error("Listing not in favorites");
    }

    await prisma.favorite.delete({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
    });

    return { message: "Removed from favorites successfully" };
  } catch (error) {
    console.error("Remove from favorites error:", error);
    throw error;
  }
};

export const getUserFavorites = async (
  userId: number,
  page: number = 1,
  limit: number = 20
): Promise<{
  favorites: FavoriteResponse[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  try {
    const skip = (page - 1) * limit;

    const total = await prisma.favorite.count({
      where: { userId },
    });

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        listing: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
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
        },
      },
    });

    const formattedFavorites: FavoriteResponse[] = favorites.map((fav) => ({
      id: fav.id,
      userId: fav.userId,
      listingId: fav.listingId,
      listing: {
        id: fav.listing.id,
        title: fav.listing.title,
        price: fav.listing.price,
        images: fav.listing.images,
        location: fav.listing.location,
        status: fav.listing.status,
        createdAt: fav.listing.createdAt,
        user: {
          id: fav.listing.user.id,
          name: fav.listing.user.name,
        },
        category: {
          id: fav.listing.category.id,
          name: fav.listing.category.name,
          slug: fav.listing.category.slug,
        },
      },
      createdAt: fav.createdAt,
    }));

    return {
      favorites: formattedFavorites,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Get user favorites error:", error);
    throw error;
  }
};

export const toggleFavorite = async (
  userId: number,
  listingId: number
): Promise<{ message: string; isFavorited: boolean }> => {
  try {
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
    });

    if (existingFavorite) {
      await prisma.favorite.delete({
        where: {
          userId_listingId: {
            userId,
            listingId,
          },
        },
      });
      return { message: "Removed from favorites", isFavorited: false };
    } else {
      await prisma.favorite.create({
        data: {
          userId,
          listingId,
        },
      });
      return { message: "Added to favorites", isFavorited: true };
    }
  } catch (error) {
    console.error("Toggle favorite error:", error);
    throw error;
  }
};
