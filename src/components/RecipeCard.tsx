import React from 'react';
import type { Recipe } from '../types';
import { Heart, ChefHat, ShoppingBag } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite: boolean;
  onToggleFavorite: (recipeId: string, recipeName: string, e: React.MouseEvent) => void;
  onClick: () => void;
  onAddToMenu: (recipe: Recipe) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ 
  recipe, 
  isFavorite, 
  onToggleFavorite, 
  onClick,
  onAddToMenu
}) => {
  // Traducir dificultad a colores consistentes y contrastados usando variables CSS de tema
  const getDifficultyColor = (difficulty: string) => {
    const d = difficulty.toLowerCase();
    if (d.includes('muy fácil') || d.includes('muy facil')) return 'bg-emerald-500/10 text-diff-easy-text border-emerald-500/20';
    if (d.includes('fácil') || d.includes('facil')) return 'bg-teal-500/10 text-teal-accent border-teal-500/20';
    if (d.includes('intermedia') || d.includes('medio')) return 'bg-amber-500/10 text-diff-medium-text border-amber-500/20';
    if (d.includes('difícil') || d.includes('dificil')) return 'bg-rose-500/10 text-diff-hard-text border-rose-500/20';
    return 'bg-slate-500/10 text-text-secondary border-border-app/40';
  };

  return (
    <div 
      onClick={onClick}
      className="group bg-bg-card border border-border-app shadow-md shadow-black/5 hover:shadow-xl hover:shadow-teal-accent/10 rounded-2xl p-5 hover:border-teal-accent/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden backdrop-blur-sm"
    >
      {/* Elemento de brillo sutil en hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-accent/0 via-purple-accent/0 to-teal-accent/5 group-hover:from-teal-accent/2 group-hover:to-purple-accent/2 transition-all duration-300 pointer-events-none"></div>

      <div>
        {/* Fila superior con Categoría, Agregar al Menú y Favorito */}
        <div className="flex justify-between items-start gap-2 mb-3">
          <span className="text-[10px] font-bold tracking-wider text-purple-accent uppercase bg-purple-accent/15 border border-purple-accent/25 px-2.5 py-0.5 rounded-full">
            {recipe.category}
          </span>
          <div className="flex items-center gap-1.5">
            {/* Botón rápido para planificar / agregar al menú semanal */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToMenu(recipe);
              }}
              title="Agregar a Lista de compras"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-bg-input-half text-text-secondary border border-border-app hover:text-teal-accent hover:border-teal-accent/35 hover:bg-bg-card transition-all cursor-pointer relative z-10"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>

            {/* Favorito */}
            <button
              onClick={(e) => onToggleFavorite(recipe.id, recipe.name, e)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all border ${
                isFavorite 
                  ? 'bg-rose-accent/15 text-rose-accent border-rose-accent/35 hover:bg-rose-accent/25' 
                  : 'bg-bg-input-half text-text-secondary border-border-app hover:text-rose-accent hover:border-rose-accent/30'
              } cursor-pointer relative z-10`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Nombre de la Receta */}
        <h3 className="text-lg font-bold text-text-primary group-hover:text-teal-accent transition-colors leading-snug line-clamp-2 mb-2 font-heading">
          {recipe.name}
        </h3>

        {/* Sugerencia/Descripción corta */}
        {recipe.suggestion && (
          <p className="text-xs text-text-secondary line-clamp-2 mb-4 italic font-light">
            "{recipe.suggestion}"
          </p>
        )}
      </div>

      {/* Footer con Metadatos */}
      <div className="space-y-3 mt-auto pt-4 border-t border-border-app/40">
        <div className="flex flex-wrap gap-2">
          {/* Badge Dificultad */}
          <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-md ${getDifficultyColor(recipe.difficulty)}`}>
            {recipe.difficulty}
          </span>

          {/* Badge Cocina */}
          {recipe.cuisine && recipe.cuisine !== 'Sin Definir' && (
            <span className="text-[10px] font-semibold bg-bg-input-half border border-border-app/60 text-text-secondary px-2 py-0.5 rounded-md">
              {recipe.cuisine}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-text-secondary">
          <div className="flex items-center gap-1">
            <ChefHat className="w-3.5 h-3.5 text-teal-accent/80" />
            <span>Por: <strong className="text-text-secondary">{recipe.createdByName || 'Administrador'}</strong></span>
          </div>

          <span className="text-text-secondary font-medium font-mono text-[11px]">
            {recipe.servings} {recipe.servingType}
          </span>
        </div>
      </div>
    </div>
  );
};
export default RecipeCard;
