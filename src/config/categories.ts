// DATA_MODEL.md reference data. Pending PRD OQ-7.

export const CATEGORIES = [
  "Food & Drink",
  "Fashion & Beauty",
  "Tech & Apps",
  "Fitness & Health",
  "Travel & Hospitality",
  "Home & Living",
  "Finance",
  "Education",
  "Entertainment",
  "Gaming",
  "Local Business",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
