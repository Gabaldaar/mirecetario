import React, { useState, useEffect, useMemo } from 'react';
import type { Recipe, Ingredient, Note, MasterIngredient } from '../types';
import { Trash2, Save, X, PlusCircle } from 'lucide-react';
import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';

interface RecipeFormProps {
  recipe?: Recipe;
  allRecipes: Recipe[];
  masterIngredients: MasterIngredient[];
  onSubmit: (recipeData: Omit<Recipe, 'id' | 'createdBy' | 'createdByName' | 'createdAt'>) => void;
  onCancel: () => void;
  onShowEquivalences: () => void;
  onManageIngredients?: () => void;
}

const defaultCategories = [
  'Plato Principal', 
  'Bocaditos/Sandwiches', 
  'Postres/Dulces', 
  'Acompañamientos', 
  'Bebidas con alcohol', 
  'Panificados', 
  'Entradas', 
  'Ensaladas/Guarniciones'
];

const defaultCuisines = [
  'Sin Definir', 
  'Italiana', 
  'Francesa', 
  'Española', 
  'Mejicana', 
  'Internacional'
];

const defaultIngredients = [
  'Sal', 
  'Pimienta Negra', 
  'Aceite', 
  'Aceite de Oliva', 
  'Harina 0000', 
  'Huevos', 
  'Leche', 
  'Azúcar', 
  'Agua', 
  'Manteca',
  'Ajo',
  'Limón',
  'Queso Rallado'
];

const defaultUnits = [
  'Cucharaditas',
  'Cucharadas',
  'Gramos',
  'Kilos',
  'Litros',
  'Tazas',
  'Pizcas',
  'Unidades',
  'Al gusto',
  'Pocillos',
  'Cant. Necesaria',
  'Dientes',
  'Filetes',
  'Gajos'
];

const ingredientCategories = [
  'Varios',
  'Carnes/aves',
  'Verduras/frutas',
  'Lácteos',
  'Pastas/arroces',
  'Especias/condimentos',
  'Conservas',
  'Panes',
  'Galletitas',
  'Aderezos',
  'Aceites/vinagres',
  'Bebidas c/alcohol',
  'Bebidas s/alcohol',
  'Encurtidos',
  'Fiambres',
  'Esencias/aromas',
  'Frutas secas',
  'Reposteria',
  'Pescados/mariscos',
  'Azúcares',
  'Harinas',
  'Mermeladas/dulces',
  'Infusiones',
  'Helados',
  'Gelatinas/extractos',
  'Sopas/caldos',
  'Conservantes/otros',
  'Tapas y Pinchos',
  'Sin definir'
];

export const RecipeForm: React.FC<RecipeFormProps> = ({ 
  recipe, 
  allRecipes, 
  masterIngredients, 
  onSubmit, 
  onCancel, 
  onShowEquivalences,
  onManageIngredients 
}) => {
  const [name, setName] = useState('');
  const [preparation, setPreparation] = useState('');
  const [servings, setServings] = useState<number>(4);
  const [servingType, setServingType] = useState('Porciones');
  const [category, setCategory] = useState('Plato Principal');
  const [cuisine, setCuisine] = useState('Sin Definir');
  const [difficulty, setDifficulty] = useState('Fácil');
  const [suggestion, setSuggestion] = useState('');
  
  // Listas Dinámicas
  const [ingredients, setIngredients] = useState<(Omit<Ingredient, 'id'> & { category?: string })[]>([]);
  const [notes, setNotes] = useState<Omit<Note, 'id'>[]>([]);

  // Estados de Autocompletado y Foco
  const [categoryFocused, setCategoryFocused] = useState(false);
  const [cuisineFocused, setCuisineFocused] = useState(false);
  const [focusedIngIndex, setFocusedIngIndex] = useState<number | null>(null);
  const [focusedUnitIndex, setFocusedUnitIndex] = useState<number | null>(null);

  // Estados para saber si el usuario modificó el texto desde el foco
  const [isCategoryModified, setIsCategoryModified] = useState(false);
  const [isCuisineModified, setIsCuisineModified] = useState(false);
  const [isIngModified, setIsIngModified] = useState(false);
  const [isUnitModified, setIsUnitModified] = useState(false);

  // Obtener sugerencias únicas del recetario cargado combinando los defaults
  const categoriesSuggestions = useMemo(() => {
    const unique = new Set([...defaultCategories, ...allRecipes.map(r => r.category).filter(Boolean)]);
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [allRecipes]);

  const cuisinesSuggestions = useMemo(() => {
    const unique = new Set([...defaultCuisines, ...allRecipes.map(r => r.cuisine).filter(Boolean)]);
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [allRecipes]);

  // Obtener sugerencias únicas del recetario cargado combinando los defaults y la colección Firestore
  const ingredientsSuggestions = useMemo(() => {
    const set = new Set<string>();
    masterIngredients.forEach(mi => {
      if (mi.name) set.add(mi.name.trim());
    });
    defaultIngredients.forEach(name => set.add(name.trim()));
    allRecipes.forEach(r => {
      r.ingredients.forEach(ing => {
        if (ing.name) set.add(ing.name.trim());
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [masterIngredients, allRecipes]);

  const unitsSuggestions = useMemo(() => {
    const set = new Set(defaultUnits);
    allRecipes.forEach(r => {
      r.ingredients.forEach(ing => {
        if (ing.unit) set.add(ing.unit.trim());
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRecipes]);

  // Si estamos en modo edición, rellenar datos
  useEffect(() => {
    if (recipe) {
      setName(recipe.name || '');
      setPreparation(recipe.preparation || '');
      setServings(recipe.servings || 4);
      setServingType(recipe.servingType || 'Porciones');
      setCategory(recipe.category || 'Plato Principal');
      setCuisine(recipe.cuisine || 'Sin Definir');
      setDifficulty(recipe.difficulty || 'Fácil');
      setSuggestion(recipe.suggestion || '');
      setIngredients(recipe.ingredients.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        observation: i.observation
      })));
      setNotes(recipe.notes.map(n => ({
        title: n.title,
        content: n.content
      })));
    } else {
      setIngredients([{ name: '', quantity: 0, unit: 'Gramos', observation: '', category: 'Varios' }]);
    }
  }, [recipe]);

  // Manejar ingredientes
  const addIngredient = () => {
    setIngredients(prev => [...prev, { name: '', quantity: 0, unit: 'Gramos', observation: '', category: 'Varios' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateIngredient = (index: number, key: keyof (Omit<Ingredient, 'id'> & { category?: string }), value: any) => {
    setIngredients(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  // Manejar notas
  const addNote = () => {
    setNotes(prev => [...prev, { title: '', content: '' }]);
  };

  const removeNote = (index: number) => {
    setNotes(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateNote = (index: number, key: keyof Omit<Note, 'id'>, value: string) => {
    setNotes(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Identificar ingredientes válidos y limpiarlos
    const validIngredients = ingredients
      .filter(ing => ing.name.trim().length > 0)
      .map((ing, idx) => ({
        name: ing.name.trim(),
        quantity: ing.quantity,
        unit: ing.unit,
        observation: ing.observation,
        id: `ing_${Date.now()}_${idx}`
      }));

    // Registrar ingredientes nuevos en la lista master
    const newIngredients = ingredients.filter(ing => {
      const nameClean = ing.name.toLowerCase().trim();
      const exists = masterIngredients.some(mi => mi.name.toLowerCase().trim() === nameClean);
      return nameClean.length > 0 && !exists;
    });

    for (const ing of newIngredients) {
      try {
        const newId = `ing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const docRef = doc(db, 'ingredients', newId);
        await setDoc(docRef, {
          id: newId,
          name: ing.name.trim(),
          category: ing.category || 'Varios'
        });
      } catch (err) {
        console.error("Error al registrar ingrediente nuevo:", err);
      }
    }

    const validNotes = notes
      .filter(n => n.title.trim().length > 0 && n.content.trim().length > 0)
      .map((n, idx) => ({
        ...n,
        id: `note_${Date.now()}_${idx}`
      }));

    onSubmit({
      name: name.trim(),
      preparation: preparation.trim(),
      servings: Number(servings),
      servingType,
      category: category.trim(),
      cuisine: cuisine.trim(),
      difficulty,
      suggestion: suggestion.trim(),
      ingredients: validIngredients,
      notes: validNotes
    });
  };

  // Filtrado condicional: si no se ha modificado, mostrar lista completa
  const filteredCategories = useMemo(() => {
    if (!isCategoryModified) return categoriesSuggestions;
    return categoriesSuggestions.filter(cat => 
      cat.toLowerCase().includes(category.toLowerCase())
    );
  }, [categoriesSuggestions, category, isCategoryModified]);

  const filteredCuisines = useMemo(() => {
    if (!isCuisineModified) return cuisinesSuggestions;
    return cuisinesSuggestions.filter(c => 
      c.toLowerCase().includes(cuisine.toLowerCase())
    );
  }, [cuisinesSuggestions, cuisine, isCuisineModified]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-text-primary">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary font-heading">
          {recipe ? 'Editar Receta' : 'Nueva Receta'}
        </h1>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition cursor-pointer"
        >
          <X className="w-4 h-4" /> Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-bg-card border border-border-app p-6 md:p-8 rounded-3xl backdrop-blur-md">
        
        {/* Sección 1: Información Básica */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-teal-accent uppercase tracking-widest border-b border-border-app pb-2">Información Básica</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Nombre */}
            <div className="md:col-span-8">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Nombre de la Receta</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Tarta de Manzanas Deliciosa"
                className="block w-full px-4 py-2.5 border border-border-app rounded-xl bg-bg-input text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-teal-accent/20 text-sm"
              />
            </div>

            {/* Categoría con Buscador/Autocomplete */}
            <div className="md:col-span-4 relative">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Categoría / Tipo de plato</label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setIsCategoryModified(true);
                }}
                onFocus={() => {
                  setCategoryFocused(true);
                  setIsCategoryModified(false); // Al hacer foco, mostramos todas
                }}
                onBlur={() => setTimeout(() => setCategoryFocused(false), 200)}
                placeholder="Buscar o escribir categoría..."
                className="block w-full px-4 py-2.5 border border-border-app rounded-xl bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-accent/20 text-sm placeholder-text-secondary/50"
              />
              {categoryFocused && filteredCategories.length > 0 && (
                <div className="absolute z-20 w-full bg-bg-input border border-border-app rounded-xl max-h-48 overflow-y-auto mt-1 shadow-2xl">
                  {filteredCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onMouseDown={() => setCategory(cat)}
                      className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-teal-accent hover:text-bg-app transition font-medium"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Porciones cantidad */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Cantidad Rinde</label>
              <input
                type="number"
                min="1"
                required
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="block w-full px-4 py-2.5 border border-border-app rounded-xl bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-accent/20 text-sm"
              />
            </div>

            {/* Tipo Rendimiento */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Tipo de Rendimiento</label>
              <select
                value={servingType}
                onChange={(e) => setServingType(e.target.value)}
                className="block w-full px-4 py-2.5 border border-border-app rounded-xl bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-accent/20 text-sm cursor-pointer"
              >
                <option value="Porciones">Porciones</option>
                <option value="Unidades">Unidades</option>
                <option value="Kilos">Kilos</option>
                <option value="Litros">Litros</option>
              </select>
            </div>

            {/* Cocina / Origen con Autocomplete */}
            <div className="relative">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Cocina / Origen</label>
              <input
                type="text"
                value={cuisine}
                onChange={(e) => {
                  setCuisine(e.target.value);
                  setIsCuisineModified(true);
                }}
                onFocus={() => {
                  setCuisineFocused(true);
                  setIsCuisineModified(false); // Al hacer foco, mostramos todas
                }}
                onBlur={() => setTimeout(() => setCuisineFocused(false), 200)}
                placeholder="Ej. Italiana, Española"
                className="block w-full px-4 py-2.5 border border-border-app rounded-xl bg-bg-input text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-teal-accent/20 text-sm"
              />
              {cuisineFocused && filteredCuisines.length > 0 && (
                <div className="absolute z-20 w-full bg-bg-input border border-border-app rounded-xl max-h-48 overflow-y-auto mt-1 shadow-2xl">
                  {filteredCuisines.map(c => (
                    <button
                      key={c}
                      type="button"
                      onMouseDown={() => setCuisine(c)}
                      className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-teal-accent hover:text-bg-app transition font-medium"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dificultad */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Dificultad</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="block w-full px-4 py-2.5 border border-border-app rounded-xl bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-accent/20 text-sm cursor-pointer"
              >
                <option value="Muy fácil">Muy fácil</option>
                <option value="Fácil">Fácil</option>
                <option value="Intermedia">Intermedia</option>
                <option value="Difícil">Difícil</option>
              </select>
            </div>
          </div>

          {/* Sugerencias o Tips rápidos */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Sugerencia corta</label>
            <input
              type="text"
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="Ej. Acompañar con helado de vainilla para un mejor sabor."
              className="block w-full px-4 py-2.5 border border-border-app rounded-xl bg-bg-input text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-teal-accent/20 text-sm"
            />
          </div>
        </div>

        {/* Sección 2: Ingredientes Dinámicos */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-border-app pb-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h2 className="text-sm font-bold text-teal-accent uppercase tracking-widest">Ingredientes</h2>
              <button
                type="button"
                onClick={onShowEquivalences}
                className="text-[11px] font-semibold text-text-secondary hover:text-teal-accent transition cursor-pointer"
              >
                ¿Cuánto es una taza? (Equivalencias)
              </button>
              {onManageIngredients && (
                <button
                  type="button"
                  onClick={onManageIngredients}
                  className="text-[11px] font-semibold text-text-secondary hover:text-teal-accent transition cursor-pointer border-l border-border-app pl-4"
                >
                  Administrar Ingredientes Globales
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={addIngredient}
              className="flex items-center gap-1 text-xs text-teal-accent hover:opacity-85 font-semibold cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Agregar Ingrediente
            </button>
          </div>

          <div className="space-y-3">
            {ingredients.length === 0 && (
              <div className="text-center py-4 text-xs text-text-secondary/60">Agrega al menos un ingrediente.</div>
            )}
            
            {ingredients.map((ing, idx) => {
              // Filtrar ingredientes condicionalmente para esta fila
              const filteredIngredientsList = !isIngModified 
                ? ingredientsSuggestions 
                : ingredientsSuggestions.filter(name => name.toLowerCase().includes(ing.name.toLowerCase()));

              // Filtrar unidades condicionalmente para esta fila
              const filteredUnitsList = !isUnitModified 
                ? unitsSuggestions 
                : unitsSuggestions.filter(u => u.toLowerCase().includes(ing.unit.toLowerCase()));

              const nameClean = ing.name.toLowerCase().trim();
              const masterMatch = masterIngredients.find(mi => mi.name.toLowerCase().trim() === nameClean);
              const isNew = nameClean.length > 0 && !masterMatch;

              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-bg-input-half/20 p-3 rounded-xl border border-border-app">
                  {/* Nombre de Ingrediente */}
                  <div className="col-span-12 sm:col-span-5 relative">
                    <input
                      type="text"
                      required
                      value={ing.name}
                      onChange={(e) => {
                        updateIngredient(idx, 'name', e.target.value);
                        setIsIngModified(true);
                      }}
                      onFocus={() => {
                        setFocusedIngIndex(idx);
                        setIsIngModified(false); // Mostramos todos al hacer foco
                      }}
                      onBlur={() => setTimeout(() => setFocusedIngIndex(null), 200)}
                      placeholder="Nombre del ingrediente"
                      className="block w-full px-3 py-2 border border-border-app rounded-lg bg-bg-input text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-teal-accent/30"
                    />
                    {focusedIngIndex === idx && filteredIngredientsList.length > 0 && (
                      <div className="absolute z-20 w-full bg-bg-input border border-border-app rounded-xl max-h-40 overflow-y-auto mt-1 shadow-2xl">
                        {filteredIngredientsList.map(name => (
                          <button
                            key={name}
                            type="button"
                            onMouseDown={() => updateIngredient(idx, 'name', name)}
                            className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-teal-accent hover:text-bg-app transition font-medium"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                    {isNew && (
                      <div className="mt-1.5 flex items-center gap-1.5 bg-bg-input-half/50 p-1.5 rounded-lg border border-border-app/60">
                        <span className="text-[9px] text-purple-accent font-bold uppercase tracking-wider">Categoría:</span>
                        <select
                          value={ing.category || 'Varios'}
                          onChange={(e) => updateIngredient(idx, 'category', e.target.value)}
                          className="bg-bg-input border border-border-app text-text-primary text-[10px] rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                        >
                          {ingredientCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Cantidad */}
                  <div className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={ing.quantity || ''}
                      onChange={(e) => updateIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="Cant. (0 = Al gusto)"
                      className="block w-full px-3 py-2 border border-border-app rounded-lg bg-bg-input text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-teal-accent/30"
                    />
                  </div>

                  {/* Unidad */}
                  <div className="col-span-4 sm:col-span-2 relative">
                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) => {
                        updateIngredient(idx, 'unit', e.target.value);
                        setIsUnitModified(true);
                      }}
                      onFocus={() => {
                        setFocusedUnitIndex(idx);
                        setIsUnitModified(false); // Mostramos todas al hacer foco
                      }}
                      onBlur={() => setTimeout(() => setFocusedUnitIndex(null), 200)}
                      placeholder="Ej. Gramos, Cucharadas"
                      className="block w-full px-3 py-2 border border-border-app rounded-lg bg-bg-input text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-teal-accent/30"
                    />
                    {focusedUnitIndex === idx && filteredUnitsList.length > 0 && (
                      <div className="absolute z-20 w-full bg-bg-input border border-border-app rounded-xl max-h-40 overflow-y-auto mt-1 shadow-2xl">
                        {filteredUnitsList.map(u => (
                          <button
                            key={u}
                            type="button"
                            onMouseDown={() => updateIngredient(idx, 'unit', u)}
                            className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-teal-accent hover:text-bg-app transition font-medium"
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Observación */}
                  <div className="col-span-3 sm:col-span-2">
                    <input
                      type="text"
                      value={ing.observation}
                      onChange={(e) => updateIngredient(idx, 'observation', e.target.value)}
                      placeholder="Obs (ej. picado)"
                      className="block w-full px-3 py-2 border border-border-app rounded-lg bg-bg-input text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-teal-accent/30"
                    />
                  </div>

                  {/* Borrar */}
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeIngredient(idx)}
                      className="text-text-secondary/60 hover:text-rose-accent transition cursor-pointer"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sección 3: Preparación */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-teal-accent uppercase tracking-widest border-b border-border-app pb-2">Preparación / Instrucciones</h2>
          <div>
            <textarea
              required
              rows={6}
              value={preparation}
              onChange={(e) => setPreparation(e.target.value)}
              placeholder="1- Ponga los ingredientes secos...&#10;2- Agregue los líquidos y amase...&#10;3- Hornee por 30 minutos a 180°C."
              className="block w-full px-4 py-3 border border-border-app rounded-xl bg-bg-input text-text-primary placeholder-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-teal-accent/20 text-sm leading-relaxed"
            ></textarea>
          </div>
        </div>

        {/* Sección 4: Consejos / Tips adicionales (Notas) */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-border-app pb-2">
            <h2 className="text-sm font-bold text-teal-accent uppercase tracking-widest">Tips / Notas Adicionales</h2>
            <button
              type="button"
              onClick={addNote}
              className="flex items-center gap-1 text-xs text-teal-accent hover:opacity-85 font-semibold cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Agregar Tip
            </button>
          </div>

          <div className="space-y-3">
            {notes.map((note, idx) => (
              <div key={idx} className="flex gap-2 items-start bg-bg-input-half/20 p-3 rounded-xl border border-border-app">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    required
                    value={note.title}
                    onChange={(e) => updateNote(idx, 'title', e.target.value)}
                    placeholder="Título del tip (ej. ¿Cómo dorar parejo?)"
                    className="block w-full px-3 py-2 border border-border-app rounded-lg bg-bg-input text-text-primary text-xs focus:outline-none"
                  />
                  <textarea
                    required
                    rows={2}
                    value={note.content}
                    onChange={(e) => updateNote(idx, 'content', e.target.value)}
                    placeholder="Detalle o descripción del consejo..."
                    className="block w-full px-3 py-2 border border-border-app rounded-lg bg-bg-input text-text-primary text-xs focus:outline-none"
                  ></textarea>
                </div>
                <button
                  type="button"
                  onClick={() => removeNote(idx)}
                  className="text-text-secondary/60 hover:text-rose-accent transition cursor-pointer mt-1"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="pt-4 border-t border-border-app flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-border-app text-text-secondary hover:bg-bg-input-half hover:text-text-primary transition cursor-pointer text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-accent text-bg-app hover:opacity-90 transition cursor-pointer text-sm font-bold shadow-lg shadow-teal-500/10"
          >
            <Save className="w-4.5 h-4.5" />
            <span>Guardar Receta</span>
          </button>
        </div>

      </form>
    </div>
  );
};
export default RecipeForm;
