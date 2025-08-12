export interface CreateCategoryDTO {
  name: string;
  slug: string;
  icon?: string;
  parentId?: number;
}

export interface UpdateCategoryDTO {
  name?: string;
  slug?: string;
  icon?: string;
  parentId?: number;
}

export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  parentId?: number | null;
  children?: CategoryResponse[];
  parent?: {
    id: number;
    name: string;
    slug: string;
  };
  listingCount?: number;
}

export interface CategoryTreeResponse {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  children: CategoryTreeResponse[];
  listingCount: number;
}
