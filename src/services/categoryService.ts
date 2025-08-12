import prisma from "../config/db.js";
import type {
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategoryResponse,
  CategoryTreeResponse,
} from "../types/category.js";

// Create a new category
export const createCategory = async (
  categoryData: CreateCategoryDTO
): Promise<CategoryResponse> => {
  try {
    // Check if slug already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug: categoryData.slug },
    });

    if (existingCategory) {
      throw new Error("Category with this slug already exists");
    }

    // If parentId is provided, verify parent exists
    if (categoryData.parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: categoryData.parentId },
      });

      if (!parentCategory) {
        throw new Error("Parent category not found");
      }
    }

    const category = await prisma.category.create({
      data: categoryData,
      include: {
        parent: true,
        _count: {
          select: { listings: true },
        },
      },
    });

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon || undefined,
      parentId: category.parentId || undefined,
      parent: category.parent
        ? {
            id: category.parent.id,
            name: category.parent.name,
            slug: category.parent.slug,
          }
        : undefined,
      listingCount: category._count.listings,
    };
  } catch (error) {
    console.error("Create category error:", error);
    throw error;
  }
};

// Get all categories (flat list)
export const getAllCategories = async (): Promise<CategoryResponse[]> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: true,
        _count: {
          select: { listings: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon || undefined,
      parentId: category.parentId || undefined,
      parent: category.parent
        ? {
            id: category.parent.id,
            name: category.parent.name,
            slug: category.parent.slug,
          }
        : undefined,
      listingCount: category._count.listings,
    }));
  } catch (error) {
    console.error("Get all categories error:", error);
    throw error;
  }
};

// Get category tree (hierarchical structure)
export const getCategoryTree = async (): Promise<CategoryTreeResponse[]> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        children: {
          include: {
            children: true, // Support up to 3 levels deep
            _count: {
              select: { listings: true },
            },
          },
        },
        _count: {
          select: { listings: true },
        },
      },
      where: { parentId: null }, // Only root categories
      orderBy: { name: "asc" },
    });

    const buildTree = (cats: any[]): CategoryTreeResponse[] => {
      return cats.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon || undefined, // Fixed: Convert null to undefined
        listingCount: cat._count.listings,
        children: cat.children ? buildTree(cat.children) : [],
      }));
    };

    return buildTree(categories);
  } catch (error) {
    console.error("Get category tree error:", error);
    throw error;
  }
};

// Get single category with children
export const getCategoryById = async (
  id: number
): Promise<CategoryResponse> => {
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          include: {
            _count: {
              select: { listings: true },
            },
          },
        },
        _count: {
          select: { listings: true },
        },
      },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon || undefined,
      parentId: category.parentId || undefined,
      parent: category.parent
        ? {
            id: category.parent.id,
            name: category.parent.name,
            slug: category.parent.slug,
          }
        : undefined,
      children: category.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        icon: child.icon || undefined,
        parentId: child.parentId || undefined,
        listingCount: child._count.listings,
      })),
      listingCount: category._count.listings,
    };
  } catch (error) {
    console.error("Get category by ID error:", error);
    throw error;
  }
};

// Get category by slug
export const getCategoryBySlug = async (
  slug: string
): Promise<CategoryResponse> => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: {
          include: {
            _count: {
              select: { listings: true },
            },
          },
        },
        _count: {
          select: { listings: true },
        },
      },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon || undefined,
      parentId: category.parentId || undefined,
      parent: category.parent
        ? {
            id: category.parent.id,
            name: category.parent.name,
            slug: category.parent.slug,
          }
        : undefined,
      children: category.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        icon: child.icon || undefined,
        parentId: child.parentId || undefined,
        listingCount: child._count.listings,
      })),
      listingCount: category._count.listings,
    };
  } catch (error) {
    console.error("Get category by slug error:", error);
    throw error;
  }
};

// Update category
export const updateCategory = async (
  id: number,
  updateData: UpdateCategoryDTO
): Promise<CategoryResponse> => {
  try {
    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new Error("Category not found");
    }

    // If updating slug, check it's unique
    if (updateData.slug && updateData.slug !== existingCategory.slug) {
      const slugExists = await prisma.category.findUnique({
        where: { slug: updateData.slug },
      });

      if (slugExists) {
        throw new Error("Category with this slug already exists");
      }
    }

    // If updating parentId, verify parent exists and prevent circular reference
    if (updateData.parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: updateData.parentId },
      });

      if (!parentCategory) {
        throw new Error("Parent category not found");
      }

      // Prevent circular reference (category can't be parent of itself)
      if (updateData.parentId === id) {
        throw new Error("Category cannot be its own parent");
      }

      // Prevent making a category child of its own descendant
      // This would require recursive checking in a real app
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        _count: {
          select: { listings: true },
        },
      },
    });

    return {
      id: updatedCategory.id,
      name: updatedCategory.name,
      slug: updatedCategory.slug,
      icon: updatedCategory.icon || undefined,
      parentId: updatedCategory.parentId || undefined,
      parent: updatedCategory.parent
        ? {
            id: updatedCategory.parent.id,
            name: updatedCategory.parent.name,
            slug: updatedCategory.parent.slug,
          }
        : undefined,
      listingCount: updatedCategory._count.listings,
    };
  } catch (error) {
    console.error("Update category error:", error);
    throw error;
  }
};

// Delete category
export const deleteCategory = async (
  id: number
): Promise<{ message: string }> => {
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        _count: {
          select: { listings: true },
        },
      },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    // Check if category has listings
    if (category._count.listings > 0) {
      throw new Error("Cannot delete category with existing listings");
    }

    // Check if category has children
    if (category.children.length > 0) {
      throw new Error("Cannot delete category with subcategories");
    }

    await prisma.category.delete({
      where: { id },
    });

    return { message: "Category deleted successfully" };
  } catch (error) {
    console.error("Delete category error:", error);
    throw error;
  }
};

// Get root categories only (for main navigation)
export const getRootCategories = async (): Promise<CategoryResponse[]> => {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        _count: {
          select: { listings: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon || undefined,
      parentId: category.parentId || undefined,
      listingCount: category._count.listings,
    }));
  } catch (error) {
    console.error("Get root categories error:", error);
    throw error;
  }
};

// Search categories by name
export const searchCategories = async (
  query: string
): Promise<CategoryResponse[]> => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      include: {
        parent: true,
        _count: {
          select: { listings: true },
        },
      },
      orderBy: { name: "asc" },
      take: 20, // Limit results
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon || undefined,
      parentId: category.parentId || undefined,
      parent: category.parent
        ? {
            id: category.parent.id,
            name: category.parent.name,
            slug: category.parent.slug,
          }
        : undefined,
      listingCount: category._count.listings,
    }));
  } catch (error) {
    console.error("Search categories error:", error);
    throw error;
  }
};
