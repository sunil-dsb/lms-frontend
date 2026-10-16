import type { Category, Subcategory } from "@/lib/types";

export type { Category, Subcategory };

export interface SubcategoryInput {
  nameEn: string;
  nameEs: string;
}

export interface CreateCategoryInput {
  nameEn: string;
  nameEs: string;
  /** `'general'` means the procedure applies at every station (no choice
   *  shown in the wizard's Access step). `'station-tied'` means the
   *  category lives under "By station" on the categories page and the
   *  wizard pre-fills its station from `?station=`. */
  kind: "general" | "station-tied";
  icon?: string;
  sortOrder?: number;
  subcategories?: SubcategoryInput[];
}

export interface UpdateCategoryInput {
  nameEn?: string;
  nameEs?: string;
  kind?: "general" | "station-tied";
  icon?: string;
  sortOrder?: number;
  isArchived?: boolean;
  subcategories?: SubcategoryInput[];
}
