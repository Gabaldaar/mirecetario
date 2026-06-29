export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  observation: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
}

export interface Recipe {
  id: string;
  name: string;
  preparation: string;
  servings: number;
  servingType: string;
  category: string;
  cuisine: string;
  difficulty: string;
  suggestion: string;
  createdBy: string;
  createdByName: string;
  createdAt: any;
  ingredients: Ingredient[];
  notes: Note[];
}

export interface Favorite {
  id: string; // userId_recipeId
  userId: string;
  recipeId: string;
  recipeName: string;
  createdAt: any;
}

export interface MasterIngredient {
  id: string;
  name: string;
  category: string;
}

export interface MenuItem {
  recipeId: string;
  recipeName: string;
  servings: number;
}

export interface IngredientOverride {
  quantity: number;
  isDeleted?: boolean;
}

export interface CollaborativeMenu {
  id: string; // "collaborative"
  items: MenuItem[];
  checkedIngredients: string[]; // Nombres o IDs combinados de ingredientes tachados
  customIngredients?: Ingredient[]; // Ingredientes sueltos agregados manualmente
  overrides?: Record<string, IngredientOverride>; // Modificaciones manuales de cantidad o eliminación
  updatedAt: string;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  lastLoginAt: string;
}
