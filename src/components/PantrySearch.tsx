import React, { useState, useMemo } from 'react';
import type { Recipe } from '../types';
import { Search, ShoppingBag, Check, Plus, AlertCircle, Sparkles } from 'lucide-react';

interface PantrySearchProps {
  recipes: Recipe[];
  onRecipeClick: (recipe: Recipe) => void;
}

export const PantrySearch: React.FC<PantrySearchProps> = ({ recipes, onRecipeClick }) => {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Extraer ingredientes únicos de todas las recetas
  const allIngredients = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach(recipe => {
      recipe.ingredients.forEach(ing => {
        if (ing.name && ing.name.trim().length > 0) {
          set.add(ing.name.trim());
        }
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [recipes]);

  // Filtrar ingredientes según el input de búsqueda
  const filteredIngredients = useMemo(() => {
    return allIngredients.filter(ing => 
      ing.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allIngredients, searchTerm]);

  const toggleIngredient = (name: string) => {
    setSelectedIngredients(prev => 
      prev.includes(name) 
        ? prev.filter(i => i !== name) 
        : [...prev, name]
    );
  };

  const clearSelection = () => {
    setSelectedIngredients([]);
  };

  // 2. Lógica de cruce de ingredientes
  const searchResults = useMemo(() => {
    if (selectedIngredients.length === 0) return { ready: [], almost: [], partial: [] };

    const ready: { recipe: Recipe; matchPercentage: number; missingCount: number }[] = [];
    const almost: { recipe: Recipe; matchPercentage: number; missingIngredients: string[] }[] = [];
    const partial: { recipe: Recipe; matchPercentage: number; matchedIngredients: string[]; missingCount: number }[] = [];

    recipes.forEach(recipe => {
      if (recipe.ingredients.length === 0) return;

      const recipeIngNames = recipe.ingredients.map(i => i.name.toLowerCase().trim());
      const selectedLower = selectedIngredients.map(i => i.toLowerCase().trim());

      // Contar cuántos ingredientes de la receta tiene el usuario
      const matched = recipeIngNames.filter(name => 
        selectedLower.some(sel => name.includes(sel) || sel.includes(name))
      );

      const matchPercentage = Math.round((matched.length / recipeIngNames.length) * 100);
      const missingIngredients = recipe.ingredients
        .filter(i => !selectedLower.some(sel => i.name.toLowerCase().includes(sel) || sel.includes(i.name.toLowerCase())))
        .map(i => i.name);

      if (missingIngredients.length === 0) {
        ready.push({ recipe, matchPercentage, missingCount: 0 });
      } else if (missingIngredients.length <= 2 && matchPercentage >= 50) {
        almost.push({ recipe, matchPercentage, missingIngredients });
      } else if (matched.length > 0) {
        partial.push({ recipe, matchPercentage, matchedIngredients: matched, missingCount: missingIngredients.length });
      }
    });

    // Ordenar resultados
    ready.sort((a, b) => b.matchPercentage - a.matchPercentage);
    almost.sort((a, b) => a.missingIngredients.length - b.missingIngredients.length);
    partial.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return { ready, almost, partial };
  }, [recipes, selectedIngredients]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-accent to-purple-accent font-heading">
          Buscador por Despensa
        </h1>
        <p className="text-sm text-text-secondary">
          Marca los ingredientes que tienes en casa y descubre qué recetas deliciosas puedes cocinar ahora mismo o con muy pocas compras.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Lado Izquierdo: Selección de Ingredientes (5 cols) */}
        <div className="md:col-span-5 bg-bg-card border border-border-app p-5 rounded-2xl backdrop-blur-md space-y-4 text-text-primary">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-text-primary font-heading">¿Qué hay en tu alacena?</h2>
            {selectedIngredients.length > 0 && (
              <button 
                onClick={clearSelection}
                className="text-xs text-rose-accent hover:opacity-80 font-semibold cursor-pointer transition"
              >
                Limpiar todo ({selectedIngredients.length})
              </button>
            )}
          </div>

          {/* Input de Búsqueda de ingrediente */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar ingrediente (ej. Sal, Aceite)..."
              className="block w-full pl-9 pr-3 py-2 border border-border-app rounded-xl bg-bg-input-half text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-teal-accent/30 text-sm"
            />
          </div>

          {/* Tags seleccionados */}
          {selectedIngredients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-3 bg-bg-input border border-border-app rounded-xl max-h-32 overflow-y-auto">
              {selectedIngredients.map(ing => (
                <button
                  key={ing}
                  onClick={() => toggleIngredient(ing)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-teal-accent/15 text-teal-accent text-xs font-semibold rounded-lg border border-teal-accent/25 hover:opacity-85 transition cursor-pointer"
                >
                  <span>{ing}</span>
                  <Check className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}

          {/* Lista de ingredientes disponibles */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-2">
              Ingredientes Disponibles
            </span>
            <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
              {filteredIngredients.length === 0 ? (
                <div className="col-span-2 text-xs text-text-secondary text-center py-4">
                  No se encontraron ingredientes.
                </div>
              ) : (
                filteredIngredients.map(ing => {
                  const isSelected = selectedIngredients.includes(ing);
                  return (
                    <button
                      key={ing}
                      onClick={() => toggleIngredient(ing)}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-left border transition cursor-pointer ${
                        isSelected
                          ? 'bg-teal-accent/15 text-teal-accent border-teal-accent/30'
                          : 'bg-bg-input-half/40 text-text-secondary border-border-app/80 hover:bg-bg-card hover:text-text-primary'
                      }`}
                    >
                      <span className="truncate mr-1">{ing}</span>
                      {isSelected ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Plus className="w-3.5 h-3.5 text-text-secondary/60 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Lado Derecho: Recetas sugeridas (7 cols) */}
        <div className="md:col-span-7 space-y-6">
          {selectedIngredients.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-10 border border-dashed border-border-app rounded-3xl space-y-3 bg-bg-card shadow-sm">
              <ShoppingBag className="w-12 h-12 text-text-secondary/55 animate-pulse" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-text-primary">Selecciona ingredientes</h3>
                <p className="text-xs text-text-secondary">Agrega los ingredientes de la izquierda para analizar recetas.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Sección 1: Preparables ya */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-teal-accent uppercase tracking-widest flex items-center gap-1.5 font-heading">
                  <Sparkles className="w-4 h-4 fill-current" />
                  Listas para Cocinar ({searchResults.ready.length})
                </h3>
                {searchResults.ready.length === 0 ? (
                  <p className="text-xs text-text-secondary italic pl-1">Ninguna receta coincide al 100% con tu selección.</p>
                ) : (
                  <div className="space-y-2">
                    {searchResults.ready.map(({ recipe }) => (
                      <div
                        key={recipe.id}
                        onClick={() => onRecipeClick(recipe)}
                        className="bg-bg-card border border-border-app hover:border-teal-accent/35 p-4 rounded-xl flex justify-between items-center transition cursor-pointer group shadow-sm hover:shadow-md"
                      >
                        <div>
                          <h4 className="text-sm font-bold text-text-primary group-hover:text-teal-accent transition-colors leading-snug">
                            {recipe.name}
                          </h4>
                          <span className="text-[10px] text-text-secondary font-semibold uppercase">{recipe.category}</span>
                        </div>
                        <span className="px-2.5 py-1 bg-teal-accent/15 border border-teal-accent/25 text-teal-accent text-xs font-bold rounded-md font-mono shrink-0">
                          100% Coincide
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sección 2: Casi listos */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-purple-accent uppercase tracking-widest flex items-center gap-1.5 font-heading">
                  <AlertCircle className="w-4 h-4" />
                  Te falta muy poco ({searchResults.almost.length})
                </h3>
                {searchResults.almost.length === 0 ? (
                  <p className="text-xs text-text-secondary italic pl-1">No hay recetas que falten solo por 1 o 2 ingredientes.</p>
                ) : (
                  <div className="space-y-2.5">
                    {searchResults.almost.map(({ recipe, missingIngredients }) => (
                      <div
                        key={recipe.id}
                        onClick={() => onRecipeClick(recipe)}
                        className="bg-bg-card border border-border-app hover:border-purple-accent/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition cursor-pointer group shadow-sm hover:shadow-md"
                      >
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-text-primary group-hover:text-purple-accent transition-colors leading-snug">
                            {recipe.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-secondary">
                            <span>Faltan:</span>
                            {missingIngredients.map((ing) => (
                              <span 
                                key={ing} 
                                className="text-rose-accent bg-rose-accent/10 px-1.5 py-0.5 rounded border border-rose-accent/25 font-semibold text-[10px]"
                              >
                                {ing}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-purple-accent/15 border border-purple-accent/25 text-purple-accent text-xs font-bold rounded-md font-mono shrink-0 self-start sm:self-center">
                          Faltan {missingIngredients.length}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sección 3: Otras recetas con estos ingredientes */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5 border-t border-border-app pt-6 font-heading">
                  <ShoppingBag className="w-4 h-4 text-text-secondary/70" />
                  Otras recetas con estos ingredientes ({searchResults.partial.length})
                </h3>
                {searchResults.partial.length === 0 ? (
                  <p className="text-xs text-text-secondary italic pl-1">No hay más recetas que contengan los ingredientes seleccionados.</p>
                ) : (
                  <div className="space-y-2.5">
                    {searchResults.partial.map(({ recipe, matchPercentage, missingCount }) => (
                      <div
                        key={recipe.id}
                        onClick={() => onRecipeClick(recipe)}
                        className="bg-bg-card border border-border-app hover:border-border-light p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition cursor-pointer group shadow-sm hover:shadow-md"
                      >
                        <div>
                          <h4 className="text-sm font-bold text-text-primary group-hover:text-teal-accent transition-colors leading-snug">
                            {recipe.name}
                          </h4>
                          <span className="text-[10px] text-text-secondary font-semibold uppercase">{recipe.category}</span>
                        </div>
                        <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                          <span className="text-[11px] text-text-secondary">
                            Faltan {missingCount} ing.
                          </span>
                          <span className="px-2.5 py-1 bg-bg-input-half border border-border-app/85 text-text-secondary text-xs font-semibold rounded font-mono">
                            {matchPercentage}% Coincide
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default PantrySearch;
