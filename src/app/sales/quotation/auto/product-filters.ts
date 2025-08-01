import { Product } from "@/types/sales-quotation";

// Define the filtering "recipes" for each section.
// This makes the rules easy to read and update later.
export const FILTER_RULES = {
  packages: [
    { category: "Packages" },
    { category: "Deducted Accessories" },
    { category: "Free Accessories" },
    { category: "Discount", subcategory: "Packages" },
  ],
  additionalItems: [
    { category: "Additional Items", excludeSubcategory: "On-site Services" },
    { category: "Discount", subcategory: "Add-on Items" },
  ],
  services: [{ category: "Additional Items", subcategory: "On-site Services" }],
};

// This function takes a list of all products and a set of rules,
// and returns a new list of only the products that match the rules.
export const getFilteredProducts = (allProducts: Product[], rules: any[]) => {
  if (!allProducts || allProducts.length === 0) {
    return [];
  }

  return allProducts.filter((product) => {
    return rules.some((rule) => {
      // Rule: Check for a category match with an optional exact subcategory match.
      if (rule.subcategory) {
        return (
          product.category === rule.category &&
          product.subcategory === rule.subcategory
        );
      }

      // Rule: Check for a category match with a subcategory to exclude.
      if (rule.excludeSubcategory) {
        return (
          product.category === rule.category &&
          product.subcategory !== rule.excludeSubcategory
        );
      }

      // Rule: Check for just a category match.
      if (product.category === rule.category) {
        return true;
      }

      return false;
    });
  });
};