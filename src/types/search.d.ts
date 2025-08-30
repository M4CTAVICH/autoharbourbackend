export interface SearchParams {
  q?: string;
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  radius?: number;
  sortBy?: "price" | "date" | "popularity" | "distance";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  status?: "ACTIVE" | "INACTIVE" | "PENDING";
  userId?: number;
  hasImages?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SearchResponse {
  success: boolean;
  message: string;
  data: {
    listings: SearchResultListing[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    filters: AppliedFilters;
    suggestions?: string[];
  };
}

export interface SearchResultListing {
  id: number;
  title: string;
  description?: string;
  price: number;
  images: string[];
  location?: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  user: {
    id: number;
    name: string;
    avatar?: string;
    isVerified: boolean;
  };
  category: {
    id: number;
    name: string;
  };
  favoriteCount: number;
  viewCount?: number;
  distance?: number;
  matchScore?: number;
}

export interface AppliedFilters {
  query?: string;
  category?: string;
  location?: string;
  priceRange?: { min?: number; max?: number };
  radius?: number;
  sortBy?: string;
  sortOrder?: string;
  hasImages?: boolean;
  dateRange?: { from?: Date; to?: Date };
}

export interface SearchSuggestion {
  text: string;
  type: "query" | "category" | "location";
  count: number;
}

export interface SavedSearch {
  id: number;
  userId: number;
  name: string;
  searchParams: SearchParams;
  alertEnabled: boolean;
  lastRun?: Date;
  createdAt: Date;
}

export interface LocationData {
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface PopularSearch {
  query: string;
  count: number;
  trend: "up" | "down" | "stable";
}
