// Per 100g unless unit specified
export type FoodItem = {
  id: string;
  name: string;
  unit: "g" | "ml" | "piece";
  baseAmount: number; // amount the macros below refer to
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const FOODS: FoodItem[] = [
  { id: "oats", name: "Rolled Oats", unit: "g", baseAmount: 100, calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
  { id: "egg", name: "Egg (large)", unit: "piece", baseAmount: 1, calories: 72, protein: 6.3, carbs: 0.4, fat: 5 },
  { id: "banana", name: "Banana", unit: "piece", baseAmount: 1, calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { id: "apple", name: "Apple", unit: "piece", baseAmount: 1, calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { id: "greek-yogurt", name: "Greek Yogurt", unit: "g", baseAmount: 100, calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  { id: "chicken-breast", name: "Chicken Breast", unit: "g", baseAmount: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: "rice", name: "White Rice (cooked)", unit: "g", baseAmount: 100, calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { id: "brown-rice", name: "Brown Rice (cooked)", unit: "g", baseAmount: 100, calories: 112, protein: 2.6, carbs: 23, fat: 0.9 },
  { id: "salmon", name: "Salmon", unit: "g", baseAmount: 100, calories: 208, protein: 20, carbs: 0, fat: 13 },
  { id: "broccoli", name: "Broccoli", unit: "g", baseAmount: 100, calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { id: "sweet-potato", name: "Sweet Potato", unit: "g", baseAmount: 100, calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { id: "avocado", name: "Avocado", unit: "g", baseAmount: 100, calories: 160, protein: 2, carbs: 9, fat: 15 },
  { id: "almonds", name: "Almonds", unit: "g", baseAmount: 100, calories: 579, protein: 21, carbs: 22, fat: 50 },
  { id: "peanut-butter", name: "Peanut Butter", unit: "g", baseAmount: 100, calories: 588, protein: 25, carbs: 20, fat: 50 },
  { id: "olive-oil", name: "Olive Oil", unit: "ml", baseAmount: 100, calories: 884, protein: 0, carbs: 0, fat: 100 },
  { id: "milk", name: "Whole Milk", unit: "ml", baseAmount: 100, calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  { id: "pasta", name: "Pasta (cooked)", unit: "g", baseAmount: 100, calories: 131, protein: 5, carbs: 25, fat: 1.1 },
  { id: "bread", name: "Whole Wheat Bread", unit: "piece", baseAmount: 1, calories: 80, protein: 4, carbs: 14, fat: 1.1 },
  { id: "tuna", name: "Tuna (canned)", unit: "g", baseAmount: 100, calories: 132, protein: 28, carbs: 0, fat: 1 },
  { id: "tofu", name: "Tofu", unit: "g", baseAmount: 100, calories: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  { id: "blueberries", name: "Blueberries", unit: "g", baseAmount: 100, calories: 57, protein: 0.7, carbs: 14, fat: 0.3 },
  { id: "spinach", name: "Spinach", unit: "g", baseAmount: 100, calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { id: "cheese", name: "Cheddar Cheese", unit: "g", baseAmount: 100, calories: 402, protein: 25, carbs: 1.3, fat: 33 },
  { id: "protein-shake", name: "Protein Shake (scoop)", unit: "piece", baseAmount: 1, calories: 120, protein: 24, carbs: 3, fat: 1.5 },
];
