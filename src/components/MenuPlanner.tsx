import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Recipe, MasterIngredient, MenuItem, Ingredient, IngredientOverride } from '../types';
import { consolidateIngredients } from '../utils/unitConverter';
import { 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Share2, 
  PlusCircle, 
  X,
  Search,
  Check,
  Pencil,
  RotateCcw,
  PlusIcon,
  Printer
} from 'lucide-react';

interface MenuPlannerProps {
  menuItems: MenuItem[];
  checkedIngredients: string[];
  customIngredients: Ingredient[];
  overrides: Record<string, IngredientOverride>;
  recipes: Recipe[];
  masterIngredients: MasterIngredient[];
  onUpdateMenu: (
    items: MenuItem[], 
    checked?: string[], 
    custom?: Ingredient[], 
    overrides?: Record<string, IngredientOverride>
  ) => void;
  onRecipeClick: (recipe: Recipe) => void;
  showAlert?: (title: string, message: string) => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
  showToast?: (message: string) => void;
}

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

export const MenuPlanner: React.FC<MenuPlannerProps> = ({
  menuItems,
  checkedIngredients,
  customIngredients = [],
  overrides = {},
  recipes,
  masterIngredients,
  onUpdateMenu,
  onRecipeClick,
  showAlert,
  showConfirm,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);

  // Estados de edición inline
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);

  // Estados para nuevo ingrediente suelto
  const [customName, setCustomName] = useState('');
  const [customQuantity, setCustomQuantity] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState('Unidades');
  const [nameFocused, setNameFocused] = useState(false);

  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Cerrar autocompletado al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setNameFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Crear mapa de categorías de ingredientes
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    masterIngredients.forEach(ing => {
      if (ing.name) {
        map[ing.name.toLowerCase().trim()] = ing.category;
      }
    });
    return map;
  }, [masterIngredients]);

  // Recetas sugerizadas para agregar
  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes.slice(0, 10);
    return recipes.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 8);
  }, [recipes, searchQuery]);

  // Agregar receta a la planificación
  const handleAddRecipe = (recipe: Recipe) => {
    const exists = menuItems.find(item => item.recipeId === recipe.id);
    let updated: MenuItem[];
    if (exists) {
      updated = menuItems.map(item => 
        item.recipeId === recipe.id 
          ? { ...item, servings: item.servings + 2 }
          : item
       );
    } else {
      updated = [...menuItems, {
        recipeId: recipe.id,
        recipeName: recipe.name,
        servings: recipe.servings || 4
      }];
    }
    // Al cambiar las recetas o porciones, los overrides se limpian por diseño
    onUpdateMenu(updated, checkedIngredients, customIngredients, {});
    setSearchQuery('');
    setShowRecipeSelector(false);
  };

  // Modificar porciones
  const handleUpdateServings = (recipeId: string, delta: number) => {
    const updated = menuItems.map(item => {
      if (item.recipeId === recipeId) {
        const newServings = Math.max(1, item.servings + delta);
        return { ...item, servings: newServings };
      }
      return item;
    });
    // Al modificar porciones limpiamos overrides
    onUpdateMenu(updated, checkedIngredients, customIngredients, {});
  };

  // Quitar receta del listado
  const handleRemoveRecipe = (recipeId: string) => {
    const updated = menuItems.filter(item => item.recipeId !== recipeId);
    // Al quitar receta limpiamos overrides
    onUpdateMenu(updated, checkedIngredients, customIngredients, {});
  };

  // Limpiar toda la planificación
  const handleClearMenu = () => {
    const clear = () => {
      onUpdateMenu([], [], [], {});
    };
    if (showConfirm) {
      showConfirm(
        'Limpiar Lista de compras',
        '¿Estás seguro de que deseas limpiar todas las recetas, ingredientes manuales y modificaciones?',
        clear,
        true
      );
    } else if (window.confirm('¿Estás seguro de que deseas limpiar todo?')) {
      clear();
    }
  };

  // Calcular lista consolidada (Recetas + Sueltos)
  const consolidatedIngredientsList = useMemo(() => {
    const allScaledAndManual: { name: string; quantity: number; unit: string; observation?: string }[] = [];

    // 1. Recetas escaladas por sus porciones
    menuItems.forEach(item => {
      const recipe = recipes.find(r => r.id === item.recipeId);
      if (!recipe) return;

      const defaultServings = recipe.servings || 4;
      const factor = item.servings / defaultServings;

      recipe.ingredients.forEach(ing => {
        allScaledAndManual.push({
          name: ing.name,
          quantity: ing.quantity * factor,
          unit: ing.unit,
          observation: ing.observation
        });
      });
    });

    // 2. Ingredientes sueltos añadidos manualmente (sin escalar)
    customIngredients.forEach(ing => {
      allScaledAndManual.push({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        observation: ing.observation || 'Agregado manualmente'
      });
    });

    // 3. Consolidar usando el motor común
    return consolidateIngredients(allScaledAndManual, categoryMap);
  }, [menuItems, customIngredients, recipes, categoryMap]);

  // Separar ingredientes consolidados en Activos y Eliminados (según overrides)
  const { activeIngredients, deletedIngredients } = useMemo(() => {
    const active: typeof consolidatedIngredientsList = [];
    const deleted: typeof consolidatedIngredientsList = [];

    consolidatedIngredientsList.forEach(ing => {
      const key = `${ing.name.toLowerCase()}::${ing.unit.toLowerCase()}`;
      const override = overrides[key];

      if (override) {
        if (override.isDeleted) {
          deleted.push(ing);
        } else {
          active.push({
            ...ing,
            quantity: override.quantity
          });
        }
      } else {
        active.push(ing);
      }
    });

    return { activeIngredients: active, deletedIngredients: deleted };
  }, [consolidatedIngredientsList, overrides]);

  // Agrupar activos por categoría
  const shoppingList = useMemo(() => {
    const grouped: Record<string, typeof activeIngredients> = {};
    activeIngredients.forEach(ing => {
      const cat = ing.category || 'Varios';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(ing);
    });
    return grouped;
  }, [activeIngredients]);

  // Alternar tachado (checked)
  const handleToggleIngredient = (ingName: string, ingUnit: string) => {
    const key = `${ingName.toLowerCase()}::${ingUnit.toLowerCase()}`;
    const exists = checkedIngredients.includes(key);
    let updated: string[];
    if (exists) {
      updated = checkedIngredients.filter(k => k !== key);
    } else {
      updated = [...checkedIngredients, key];
    }
    onUpdateMenu(menuItems, updated, customIngredients, overrides);
  };

  // Agregar ingrediente suelto/manual
  const handleAddCustomIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newIng: Ingredient = {
      id: `cust_${Date.now()}`,
      name: customName.trim(),
      quantity: Number(customQuantity) || 0,
      unit: customUnit,
      observation: 'Agregado manualmente'
    };

    const updatedCustom = [...customIngredients, newIng];

    // Limpiar formulario local
    setCustomName('');
    setCustomQuantity(1);
    setCustomUnit('Unidades');
    setNameFocused(false);

    onUpdateMenu(menuItems, checkedIngredients, updatedCustom, overrides);

    if (showToast) {
      showToast(`"${newIng.name}" agregado a la lista.`);
    }
  };

  // Eliminar ingrediente (usando overrides para ocultar, y removiendo de customIngredients si era únicamente manual)
  const handleDeleteIngredient = (ingName: string, ingUnit: string) => {
    const key = `${ingName.toLowerCase()}::${ingUnit.toLowerCase()}`;
    
    // Si estaba en customIngredients, lo quitamos de ahí
    const updatedCustom = customIngredients.filter(
      c => !(c.name.toLowerCase() === ingName.toLowerCase() && c.unit.toLowerCase() === ingUnit.toLowerCase())
    );

    // Creamos override de eliminación
    const updatedOverrides = {
      ...overrides,
      [key]: { quantity: 0, isDeleted: true }
    };

    // Des-tachamos si estaba tachado
    const updatedChecked = checkedIngredients.filter(k => k !== key);

    onUpdateMenu(menuItems, updatedChecked, updatedCustom, updatedOverrides);

    if (showToast) {
      showToast(`"${ingName}" quitado de la lista.`);
    }
  };

  // Restaurar ingrediente oculto/eliminado
  const handleRestoreIngredient = (ingName: string, ingUnit: string) => {
    const key = `${ingName.toLowerCase()}::${ingUnit.toLowerCase()}`;

    // Si era manual únicamente, al haberlo borrado de customIngredients en handleDeleteIngredient,
    // restaurarlo requiere volver a agregarlo a customIngredients.
    // Para identificar si era manual: miramos si estaba en customIngredients original.
    // Pero para simplificar y no perder manuales, en el menú anterior handleDeleteIngredient los sacaba.
    // Vamos a ver si el ingrediente que restauramos tiene "Agregado manualmente" en observaciones
    const originalIng = consolidatedIngredientsList.find(
      i => i.name.toLowerCase() === ingName.toLowerCase() && i.unit.toLowerCase() === ingUnit.toLowerCase()
    );

    let updatedCustom = [...customIngredients];
    const isManual = originalIng?.observations.includes('Agregado manualmente');

    if (isManual) {
      const existsInCustom = customIngredients.some(
        c => c.name.toLowerCase() === ingName.toLowerCase() && c.unit.toLowerCase() === ingUnit.toLowerCase()
      );
      if (!existsInCustom && originalIng) {
        updatedCustom.push({
          id: `cust_${Date.now()}`,
          name: originalIng.name,
          quantity: originalIng.quantity,
          unit: originalIng.unit,
          observation: 'Agregado manualmente'
        });
      }
    }

    const updatedOverrides = { ...overrides };
    delete updatedOverrides[key];

    // Des-tachamos si estaba tachado
    const updatedChecked = checkedIngredients.filter(k => k !== key);

    onUpdateMenu(menuItems, updatedChecked, updatedCustom, updatedOverrides);

    if (showToast) {
      showToast(`"${ingName}" restaurado.`);
    }
  };

  // Guardar edición de cantidad inline
  const handleSaveEdit = (ingName: string, ingUnit: string) => {
    const key = `${ingName.toLowerCase()}::${ingUnit.toLowerCase()}`;
    
    // Si era manual y no receta, actualizamos customIngredients directamente para persistencia limpia,
    // y si es consolidado de recetas, usamos overrides. Para ser 100% consistentes y permitir reset de porciones,
    // usamos overrides en todos los casos de edición.
    const updatedOverrides = {
      ...overrides,
      [key]: { quantity: Number(editQuantity) || 0, isDeleted: false }
    };

    onUpdateMenu(menuItems, checkedIngredients, customIngredients, updatedOverrides);
    setEditingKey(null);

    if (showToast) {
      showToast(`Cantidad actualizada para "${ingName}".`);
    }
  };

  // Iniciar edición inline
  const startEditing = (ingName: string, ingUnit: string, currentQty: number) => {
    const key = `${ingName.toLowerCase()}::${ingUnit.toLowerCase()}`;
    setEditingKey(key);
    setEditQuantity(currentQty);
  };

  // Sugerencias de ingredientes manuales
  const customIngredientSuggestions = useMemo(() => {
    if (!customName.trim()) return [];
    
    const names = new Set<string>();
    masterIngredients.forEach(mi => { if (mi.name) names.add(mi.name.trim()); });
    recipes.forEach(r => r.ingredients.forEach(i => { if (i.name) names.add(i.name.trim()); }));
    
    return Array.from(names)
      .filter(n => n.toLowerCase().includes(customName.toLowerCase()) && n.toLowerCase() !== customName.toLowerCase())
      .sort()
      .slice(0, 5);
  }, [customName, masterIngredients, recipes]);

  // Copiar lista de compras al portapapeles
  const handleShareList = () => {
    let text = `📋 *MI LISTA DE COMPRAS - MI RECETARIO*\n\n`;

    Object.keys(shoppingList).sort().forEach(category => {
      text += `🔹 *${category.toUpperCase()}*\n`;
      shoppingList[category].forEach(ing => {
        const key = `${ing.name.toLowerCase()}::${ing.unit.toLowerCase()}`;
        const isChecked = checkedIngredients.includes(key);
        const prefix = isChecked ? '✅ ~~' : '⬜ ';
        const suffix = isChecked ? '~~' : '';
        const obs = ing.observations.length > 0 ? ` (${ing.observations.join(', ')})` : '';
        const qty = ing.quantity > 0 ? `${ing.quantity} ${ing.unit} - ` : '';
        text += `${prefix}${qty}${ing.name}${obs}${suffix}\n`;
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text)
      .then(() => {
        if (showToast) {
          showToast('¡Lista copiada al portapapeles!');
        } else if (showAlert) {
          showAlert('Compartir Lista', '¡Lista de compras copiada al portapapeles!');
        } else {
          alert('¡Lista de compras copiada al portapapeles!');
        }
      })
      .catch(err => console.error('Error al copiar la lista:', err));
  };

  const handlePrintShoppingList = () => {
    const originalTitle = document.title;
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    document.title = `Lista_De_Compras_${dd}.${mm}.${yyyy}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto print:space-y-0 print:max-w-full">
      
      {/* SECCIÓN 1: MENÚ / PLANIFICACIÓN */}
      <div className="bg-bg-card border border-border-app rounded-3xl p-6 backdrop-blur-md space-y-6 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-app pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-accent/10 border border-teal-accent/25 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-teal-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary font-heading">Menú de Recetas</h2>
              <p className="text-xs text-text-secondary">Agrega recetas y regula sus porciones para calcular tu lista de compras.</p>
            </div>
          </div>
          
          {(menuItems.length > 0 || customIngredients.length > 0) && (
            <button
              onClick={handleClearMenu}
              className="text-xs font-semibold text-rose-accent hover:opacity-85 transition cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpiar Todo
            </button>
          )}
        </div>

        {/* Listado de Recetas */}
        {menuItems.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border-app rounded-2xl bg-bg-input-half/20 space-y-4">
            <ShoppingBag className="w-10 h-10 text-text-secondary/70 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-text-secondary">No hay recetas agregadas</h3>
              <p className="text-xs text-text-secondary/80">Comienza agregando recetas para generar los ingredientes.</p>
            </div>
            <button
              onClick={() => setShowRecipeSelector(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-accent text-bg-app hover:opacity-95 transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Agregar Receta
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {menuItems.map(item => {
                const recipe = recipes.find(r => r.id === item.recipeId);
                return (
                  <div 
                    key={item.recipeId} 
                    className="flex justify-between items-center bg-bg-input-half/35 border border-border-app p-4 rounded-2xl transition hover:border-border-light"
                  >
                    <div 
                      className="cursor-pointer space-y-1 pr-3" 
                      onClick={() => recipe && onRecipeClick(recipe)}
                    >
                      <h4 className="text-sm font-bold text-text-primary hover:text-teal-accent transition leading-snug font-heading line-clamp-1">{item.recipeName}</h4>
                      <p className="text-[10px] text-purple-accent font-semibold uppercase tracking-wider">{recipe?.category || 'Receta'}</p>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0">
                      {/* Controles de Porciones */}
                      <div className="flex items-center gap-2 bg-bg-input border border-border-app px-2 py-1 rounded-xl">
                        <button
                          onClick={() => handleUpdateServings(item.recipeId, -1)}
                          className="w-6 h-6 flex items-center justify-center text-text-secondary hover:text-text-primary rounded transition cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-teal-accent min-w-5 text-center">{item.servings}</span>
                        <button
                          onClick={() => handleUpdateServings(item.recipeId, 1)}
                          className="w-6 h-6 flex items-center justify-center text-text-secondary hover:text-text-primary rounded transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quitar */}
                      <button
                        onClick={() => handleRemoveRecipe(item.recipeId)}
                        className="text-text-secondary hover:text-rose-accent p-1 transition cursor-pointer"
                        title="Quitar de la lista"
                      >
                        <X className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botón rápido para sumar más */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowRecipeSelector(true)}
                className="text-xs font-bold text-teal-accent hover:opacity-85 transition flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Agregar otra receta
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN 2: LISTA DE COMPRAS */}
      {(menuItems.length > 0 || customIngredients.length > 0) && (
        <div className="bg-bg-card border border-border-app rounded-3xl p-6 backdrop-blur-md space-y-6 print:bg-white print:border-none print:shadow-none print:p-0 print:text-black">
          <div className="flex justify-between items-center border-b border-border-app pb-4 print:border-black/20 print:mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-accent/10 border border-purple-accent/25 flex items-center justify-center print:hidden">
                <ShoppingBag className="w-5 h-5 text-purple-accent" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary font-heading print:text-black print:text-lg">Lista de Compras</h2>
                <p className="text-xs text-text-secondary print:hidden">Consolidada por categorías. Puedes editar cantidades o tachar lo que ya tienes.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handleShareList}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-accent/15 border border-purple-accent/25 text-purple-accent hover:opacity-90 transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-purple-500/5"
              >
                <Share2 className="w-3.5 h-3.5" /> Compartir Lista
              </button>

              <button
                onClick={handlePrintShoppingList}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-accent/15 border border-teal-accent/25 text-teal-accent hover:opacity-90 transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-teal-500/5"
              >
                <Printer className="w-3.5 h-3.5" /> Guardar PDF
              </button>
            </div>
          </div>

          {/* Listado agrupado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:block">
            {Object.keys(shoppingList).length === 0 ? (
              <div className="text-text-secondary text-xs py-4 col-span-2 text-center print:text-black">No hay ingredientes en la lista activa.</div>
            ) : (
              Object.keys(shoppingList).sort().map(category => (
                <div key={category} className="bg-bg-input-half/50 border border-border-app p-5 rounded-2xl space-y-3 flex flex-col justify-between print:bg-white print:border-none print:shadow-none print:p-0 print:mb-3">
                  <div>
                    <h3 className="text-xs font-extrabold text-teal-accent uppercase tracking-widest border-b border-border-app/40 pb-2 mb-3 print:text-black print:border-black/10 print:text-xs print:pb-0.5 print:mb-1.5">{category}</h3>
                    <ul className="space-y-3 print:space-y-0.5">
                      {shoppingList[category].map(ing => {
                        const key = `${ing.name.toLowerCase()}::${ing.unit.toLowerCase()}`;
                        const isChecked = checkedIngredients.includes(key);
                        const isEditingThis = editingKey === key;

                        return (
                          <li 
                            key={key} 
                            className="group flex items-center justify-between text-xs text-text-primary py-1 border-b border-border-app/20 last:border-b-0 print:text-black print:border-black/5 print:py-0.5 print:text-[11px]"
                          >
                            <div 
                              onClick={() => !isEditingThis && handleToggleIngredient(ing.name, ing.unit)}
                              className="flex items-start gap-3 flex-1 cursor-pointer select-none"
                            >
                              <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition print:hidden ${
                                isChecked 
                                  ? 'bg-teal-accent border-teal-accent text-bg-app' 
                                  : 'border-border-light bg-bg-input'
                              }`}>
                                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                              
                              <div className={isChecked ? 'line-through text-text-secondary/60 transition-all print:text-black/50' : 'transition-all print:text-black'}>
                                {isEditingThis ? (
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <input 
                                      type="number"
                                      step="any"
                                      autoFocus
                                      value={editQuantity}
                                      onChange={e => setEditQuantity(Number(e.target.value))}
                                      className="w-16 px-2 py-0.5 border border-teal-accent rounded bg-bg-input text-text-primary text-xs focus:outline-none"
                                    />
                                    <span className="font-bold text-teal-accent">{ing.unit}</span>
                                    <button 
                                      onClick={() => handleSaveEdit(ing.name, ing.unit)}
                                      className="p-1 text-emerald-400 hover:text-emerald-300 rounded cursor-pointer"
                                      title="Guardar"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => setEditingKey(null)}
                                      className="p-1 text-rose-accent hover:text-rose-400 rounded cursor-pointer"
                                      title="Cancelar"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="font-bold text-teal-accent font-mono pr-1 print:text-black">
                                      {ing.quantity > 0 ? `${ing.quantity} ${ing.unit}` : 'Al gusto'}
                                    </span>
                                    <span className="font-medium text-text-primary print:text-black">{ing.name}</span>
                                    {ing.observations.length > 0 && (
                                      <span className="text-[10px] text-text-secondary/60 italic font-light block print:text-black/60 print:italic">
                                        (Uso: {ing.observations.join(', ')})
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Controles del ingrediente (Pencil y Trash) */}
                            {!isEditingThis && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 print:hidden">
                                <button
                                  onClick={() => startEditing(ing.name, ing.unit, ing.quantity)}
                                  className="p-1 text-text-secondary hover:text-teal-accent transition cursor-pointer"
                                  title="Editar cantidad"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteIngredient(ing.name, ing.unit)}
                                  className="p-1 text-text-secondary hover:text-rose-accent transition cursor-pointer"
                                  title="Quitar ingrediente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* AGREGAR INGREDIENTE SUELTO COMPACTO */}
          <div className="border-t border-border-app pt-6 mt-6 print:hidden">
            <form onSubmit={handleAddCustomIngredient} className="bg-bg-input-half/25 border border-border-app rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-teal-accent uppercase tracking-wider">Agregar ingrediente suelto</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Nombre */}
                <div className="sm:col-span-6 relative" ref={autocompleteRef}>
                  <label className="block text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-1.5">Nombre</label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => {
                      setCustomName(e.target.value);
                      setNameFocused(true);
                    }}
                    onFocus={() => setNameFocused(true)}
                    placeholder="Ej. Servilletas, Cerveza..."
                    className="block w-full px-3 py-2 border border-border-app rounded-xl bg-bg-input text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-teal-accent/30 text-xs"
                  />
                  {nameFocused && customIngredientSuggestions.length > 0 && (
                    <div className="absolute z-30 w-full bg-bg-input border border-border-app rounded-xl max-h-32 overflow-y-auto mt-1 shadow-2xl">
                      {customIngredientSuggestions.map(suggestion => (
                        <button
                          key={suggestion}
                          type="button"
                          onMouseDown={() => {
                            setCustomName(suggestion);
                            setNameFocused(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-teal-accent hover:text-bg-app transition font-medium"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cantidad */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-1.5">Cantidad</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={customQuantity}
                    onChange={(e) => setCustomQuantity(Number(e.target.value))}
                    className="block w-full px-3 py-2 border border-border-app rounded-xl bg-bg-input text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-teal-accent/30"
                  />
                </div>

                {/* Unidad */}
                <div className="sm:col-span-3">
                  <label className="block text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-1.5">Unidad</label>
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="block w-full px-3 py-2 border border-border-app rounded-xl bg-bg-input text-text-primary text-xs focus:outline-none cursor-pointer"
                  >
                    {defaultUnits.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                {/* Botón */}
                <div className="sm:col-span-1">
                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-teal-accent text-bg-app hover:opacity-90 transition font-bold flex items-center justify-center cursor-pointer shadow-lg shadow-teal-500/10 text-xs"
                    title="Agregar ingrediente"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* SECCIÓN 3: INGREDIENTES OCULTADOS / ELIMINADOS */}
          {deletedIngredients.length > 0 && (
            <div className="border-t border-border-app/40 pt-6 mt-6 space-y-3 print:hidden">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest">Ingredientes Ocultados / Eliminados ({deletedIngredients.length})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {deletedIngredients.map(ing => {
                  const key = `${ing.name.toLowerCase()}::${ing.unit.toLowerCase()}`;
                  return (
                    <div 
                      key={key} 
                      className="flex justify-between items-center bg-bg-input-half/20 border border-border-app/40 px-4 py-2.5 rounded-xl text-xs text-text-secondary/60"
                    >
                      <span className="line-through">
                        {ing.quantity > 0 ? `${ing.quantity} ${ing.unit} - ` : ''} {ing.name}
                      </span>
                      <button
                        onClick={() => handleRestoreIngredient(ing.name, ing.unit)}
                        className="p-1 hover:text-teal-accent transition cursor-pointer flex items-center gap-1 text-[10px] font-bold text-text-secondary/70"
                        title="Restaurar en la lista"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SELECTOR MODAL DE RECETAS */}
      {showRecipeSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-bg-card border border-border-app rounded-3xl p-6 w-full max-w-lg flex flex-col max-h-[80vh] shadow-2xl relative text-text-primary">
            <div className="flex justify-between items-center border-b border-border-app pb-4 mb-4">
              <h3 className="text-lg font-bold text-text-primary font-heading">Agregar Receta</h3>
              <button
                onClick={() => setShowRecipeSelector(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-bg-input-half text-text-secondary hover:text-text-primary hover:bg-bg-card transition border border-border-app/55 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input de Búsqueda */}
            <div className="relative mb-4">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar receta..."
                className="block w-full pl-9 pr-3 py-2 border border-border-app rounded-xl bg-bg-input text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-teal-accent/30 text-sm"
              />
            </div>

            {/* Listado filtrado */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredRecipes.length === 0 ? (
                <div className="text-center py-6 text-text-secondary text-xs">No se encontraron recetas.</div>
              ) : (
                filteredRecipes.map(recipe => (
                  <div 
                    key={recipe.id}
                    onClick={() => handleAddRecipe(recipe)}
                    className="flex justify-between items-center p-3 rounded-xl bg-bg-input-half/30 border border-border-app hover:border-teal-accent/40 cursor-pointer transition"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-text-primary">{recipe.name}</h4>
                      <p className="text-[10px] text-text-secondary">{recipe.category} • Rinde: {recipe.servings} {recipe.servingType}</p>
                    </div>
                    <span className="text-[10px] bg-teal-accent/10 text-teal-accent border border-teal-accent/25 px-2 py-0.5 rounded-full font-bold">Agregar</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default MenuPlanner;
