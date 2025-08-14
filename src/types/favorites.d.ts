export interface FavoriteResponse {
  id: number;
  userId: number;
  listingId: number;
  listing: {
    id: number;
    title: string;
    price: number;
    images: string[];
    location: string;
    status: string;
    createdAt: Date;
    user: {
      id: number;
      name: string;
    };
    category: {
      id: number;
      name: string;
      slug: string;
    };
  };
  createdAt: Date;
}
