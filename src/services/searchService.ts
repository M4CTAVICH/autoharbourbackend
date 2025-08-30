import prisma from "../config/db.js";
import type {
  SearchParams,
  SearchResponse,
  SearchResultListing,
  AppliedFilters,
  SearchSuggestion,
  SavedSearch,
  LocationData,
} from "../types/search.js";

export const searchListingsService = async (
  params: SearchParams,
  currentUserId?: number
): Promise<{
  listings: SearchResultListing[];
  total: number;
  filters: AppliedFilters;
}> => {
  try {
    const {
      q = "",
      category,
      location,
      minPrice,
      maxPrice,
      radius = 50,
      sortBy = "date",
      sortOrder = "desc",
      page = 1,
      limit = 20,
      status = "ACTIVE",
      userId,
      hasImages,
      dateFrom,
      dateTo,
    } = params;

    const offset = (page - 1) * Math.min(limit, 50);

    const whereClause: any = {
      status: status,
      ...(userId && { userId }),
      ...(hasImages && { images: { isEmpty: false } }),
      ...(dateFrom && { createdAt: { gte: dateFrom } }),
      ...(dateTo && { createdAt: { lte: dateTo } }),
    };

    if (minPrice !== undefined || maxPrice !== undefined) {
      whereClause.price = {};
      if (minPrice !== undefined) whereClause.price.gte = minPrice;
      if (maxPrice !== undefined) whereClause.price.lte = maxPrice;
    }

    if (category) {
      if (!isNaN(Number(category))) {
        whereClause.categoryId = Number(category);
      } else {
        whereClause.category = {
          name: { contains: category, mode: "insensitive" },
        };
      }
    }

    if (q && q.trim()) {
      const searchTerms = q
        .trim()
        .split(" ")
        .filter((term) => term.length > 0);
      whereClause.OR = [
        {
          title: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          category: {
            name: {
              contains: q,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    if (location && location.trim()) {
      whereClause.location = {
        contains: location,
        mode: "insensitive",
      };
    }

    let orderBy: any = {};
    switch (sortBy) {
      case "price":
        orderBy = { price: sortOrder };
        break;
      case "date":
        orderBy = { createdAt: sortOrder };
        break;
      case "popularity":
        orderBy = { favorites: { _count: sortOrder } };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          images: true,
          location: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              isVerified: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              favorites: true,
            },
          },
        },
        orderBy,
        skip: offset,
        take: Math.min(limit, 50),
      }),

      prisma.listing.count({
        where: whereClause,
      }),
    ]);

    const processedListings: SearchResultListing[] = listings.map(
      (listing) => ({
        id: listing.id,
        title: listing.title,
        description: listing.description || undefined,
        price: listing.price,
        images: listing.images,
        location: listing.location || undefined,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        status: listing.status,
        user: {
          id: listing.user.id,
          name: listing.user.name,
          avatar: listing.user.avatar || undefined,
          isVerified: listing.user.isVerified,
        },
        category: listing.category,
        favoriteCount: listing._count.favorites,
        matchScore: calculateMatchScore(
          listing.title,
          listing.description || "",
          q
        ),
        // Distance calculation would go here (requires geolocation)
      })
    );

    const filters: AppliedFilters = {
      ...(q && { query: q }),
      ...(category && { category }),
      ...(location && { location }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        priceRange: { min: minPrice, max: maxPrice },
      }),
      ...(radius !== 50 && { radius }),
      ...(sortBy !== "date" && { sortBy }),
      ...(sortOrder !== "desc" && { sortOrder }),
      ...(hasImages && { hasImages }),
      ...((dateFrom || dateTo) && {
        dateRange: { from: dateFrom, to: dateTo },
      }),
    };

    return {
      listings: processedListings,
      total,
      filters,
    };
  } catch (error) {
    console.error("Search listings service error:", error);
    throw error;
  }
};

const calculateMatchScore = (
  title: string,
  description: string,
  query: string
): number => {
  if (!query || !query.trim()) return 0;

  const queryLower = query.toLowerCase();
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();

  let score = 0;

  // Exact title match
  if (titleLower.includes(queryLower)) {
    score += 10;
  }

  // Title word matches
  const queryWords = queryLower.split(" ");
  const titleWords = titleLower.split(" ");

  queryWords.forEach((queryWord) => {
    if (titleWords.some((titleWord) => titleWord.includes(queryWord))) {
      score += 3;
    }
    if (descLower.includes(queryWord)) {
      score += 1;
    }
  });

  return Math.min(score, 20); // Cap at 20
};

export const getSearchSuggestionsService = async (
  query: string,
  limit = 10
): Promise<SearchSuggestion[]> => {
  try {
    if (!query || query.length < 2) {
      return [];
    }

    const suggestions: SearchSuggestion[] = [];

    // Get category suggestions
    const categories = await prisma.category.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      select: { name: true, _count: { select: { listings: true } } },
      take: 5,
    });

    categories.forEach((category) => {
      suggestions.push({
        text: category.name,
        type: "category",
        count: category._count.listings,
      });
    });

    const popularTerms = await prisma.listing.groupBy({
      by: ["title"],
      where: {
        title: {
          contains: query,
          mode: "insensitive",
        },
        status: "ACTIVE",
      },
      _count: true,
      orderBy: {
        _count: {
          title: "desc",
        },
      },
      take: 5,
    });

    const titleWords = new Set<string>();
    popularTerms.forEach((term) => {
      const words = term.title.toLowerCase().split(" ");
      words.forEach((word) => {
        if (word.includes(query.toLowerCase()) && word.length > 2) {
          titleWords.add(word);
        }
      });
    });

    Array.from(titleWords)
      .slice(0, 5)
      .forEach((word) => {
        suggestions.push({
          text: word,
          type: "query",
          count: 0,
        });
      });

    return suggestions.sort((a, b) => b.count - a.count).slice(0, limit);
  } catch (error) {
    console.error("Get search suggestion error: ", error);
    throw error;
  }
};

export const saveSearchService = async (
  userId: number,
  name: string,
  searchParams: SearchParams,
  alertEnabled = false
): Promise<SavedSearch> => {
  try {
    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId,
        name,
        searchParams: JSON.stringify(searchParams),
        alertEnabled,
      },
    });
    return {
      id: savedSearch.id,
      userId: savedSearch.userId,
      name: savedSearch.name,
      searchParams: JSON.parse(savedSearch.searchParams),
      alertEnabled: savedSearch.alertEnabled,
      lastRun: savedSearch.lastRun || undefined,
      createdAt: savedSearch.createdAt,
    };
  } catch (error) {
    console.error("Save search service error: ", error);
    throw error;
  }
};

export const getSavedSearchesService = async (
  userId: number
): Promise<SavedSearch[]> => {
  try {
    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return savedSearches.map((search: any) => ({
      id: search.id,
      userId: search.userId,
      name: search.name,
      searchParams: JSON.parse(search.searchParams),
      alertEnabled: search.alertEnabled,
      lastRun: search.lastRun || undefined,
      createdAt: search.createdAt,
    }));
  } catch (error) {
    console.error("Get saved searches service error: ", error);
    throw error;
  }
};

export const getPopularSearchesService = async (limit = 10) => {
  try {
    //next I need to implemet analytic and search logs for now I improvise
    const popularTerms = await prisma.listing.groupBy({
      by: ["title"],
      where: { status: "ACTIVE" },
      _count: true,
      orderBy: { _count: { title: "desc" } },
      take: limit * 2,
    });

    const wordCount = new Map<string, number>();
    popularTerms.forEach((term) => {
      const words = term.title.toLowerCase().split(" ");
      words.forEach((word) => {
        if (word.length > 3) {
          //wordCount.set(word, (wordCount.get(word) || 0) + term._count.title);

          wordCount.set(word, (wordCount.get(word) || 0) + term._count);
        }
      });
    });
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query, count]) => ({
        query,
        count,
        trend: "stable" as const,
      }));
  } catch (error) {
    console.error("Get popular searches error:", error);
    throw error;
  }
};
