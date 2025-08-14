export interface CreateListingDTO {
  title: string;
  price: number;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  categoryId: number;
  images: string[];
}

export interface ListingSearchQuery {
  search?: string;
  categoryId?: number;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sortBy?: "price" | "createdAt" | "views";
  sortOrder?: "asc" | "desc";
}

export interface ListingResponse {
  id: number;
  title: string;
  price: number;
  description: string;
  images: string[];
  location: string;
  status: string;
  views: number;
  createdAt: Date;
  user: {
    id: number;
    name: string;
    avatar?: string;
    phone?: string;
  };
  category: {
    id: number;
    name: string;
    slug: string;
  };
  isFavorited?: boolean;
}
