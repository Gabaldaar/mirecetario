import React, { useState } from 'react';
import type { Recipe } from '../types';
import { ModoCocina } from './ModoCocina';
import { ArrowLeft, Play, Edit, Trash2, Heart, Plus, Minus, Info, ClipboardList, ShoppingBag, Printer, Activity, Loader2 } from 'lucide-react';
import { getGenerativeModel } from 'firebase/ai';
import { ai, db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

interface RecipeDetailProps {
  recipe: Recipe;
  isFavorite: boolean;
  currentUserUid: string | null;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: (recipeId: string, recipeName: string) => void;
  onShowEquivalences: () => void;
  onAddToMenu: (recipe: Recipe) => void;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({
  recipe,
  isFavorite,
  currentUserUid,
  onBack,
  onEdit,
  onDelete,
  onToggleFavorite,
  onShowEquivalences,
  onAddToMenu,
}) => {
  const [currentServings, setCurrentServings] = useState<number>(recipe.servings || 4);
  const [modoCocinaActive, setModoCocinaActive] = useState(false);
  const [isCalculatingNutrition, setIsCalculatingNutrition] = useState(false);
  const [nutritionError, setNutritionError] = useState('');

  const defaultServings = recipe.servings || 1;
  const scaleFactor = currentServings / defaultServings;

  const increment = () => setCurrentServings(prev => prev + 1);
  const decrement = () => setCurrentServings(prev => (prev > 1 ? prev - 1 : 1));

  const handlePrintRecipe = () => {
    const originalTitle = document.title;
    const cleanName = recipe.name.replace(/\s+/g, '_');
    document.title = cleanName;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  const calculateNutrition = async () => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) return;
    setIsCalculatingNutrition(true);
    setNutritionError('');

    try {
      const model = getGenerativeModel(ai, { 
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        }
      });
      
      const ingredientsText = recipe.ingredients.map(i => `${i.quantity} ${i.unit} de ${i.name}`).join(', ');
      
      const prompt = `
      Eres un nutricionista experto. Analiza la siguiente lista de ingredientes para una receta de ${recipe.servings} porciones.
      Calcula la información nutricional TOTAL APROXIMADA de la receta completa (suma de todos los ingredientes).
      Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura (usa números enteros para los valores):
      {
        "calories": calorias_totales,
        "protein": gramos_proteina_totales,
        "carbs": gramos_carbohidratos_totales,
        "fat": gramos_grasa_totales
      }
      
      Ingredientes:
      ${ingredientsText}
      `;

      const aiResult = await model.generateContent(prompt);
      const responseText = aiResult.response.text();
      const parsed = JSON.parse(responseText);

      const nutritionalInfo = {
        calories: parsed.calories || 0,
        protein: parsed.protein || 0,
        carbs: parsed.carbs || 0,
        fat: parsed.fat || 0
      };

      // Guardar en Firestore
      const recipeRef = doc(db, 'recetas', recipe.id);
      await updateDoc(recipeRef, { nutritionalInfo });
      
      // Actualizar el estado local (asumiendo que recipe es prop inmutable, el componente padre debería refrescarse, pero aquí forzamos la actualización visual mutando o avisando si fuera necesario. Como Firebase real-time usualmente lo maneja, solo esperamos).
      recipe.nutritionalInfo = nutritionalInfo; 

    } catch (err: any) {
      console.error(err);
      setNutritionError(err.message || 'Error al calcular nutrición.');
    } finally {
      setIsCalculatingNutrition(false);
    }
  };

  // Lógica de redondeo y formato de cantidades
  const formatQuantity = (qty: number) => {
    if (!qty || qty === 0) return '';
    const scaled = qty * scaleFactor;
    
    // Redondear a 2 decimales evitando imprecisiones de punto flotante
    const rounded = Math.round(scaled * 100) / 100;
    
    // Opcional: mostrar fracciones culinarias amigables para pequeñas medidas
    if (rounded === 0.5) return '1/2';
    if (rounded === 0.25) return '1/4';
    if (rounded === 0.75) return '3/4';
    if (rounded === 0.33) return '1/3';
    
    return rounded.toString();
  };

  const isOwner = currentUserUid && recipe.createdBy === currentUserUid;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 print:py-0 print:px-0">
      {/* Botón de retroceso */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition mb-6 group cursor-pointer print:hidden"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span>Volver a recetas</span>
      </button>

      {/* Tarjeta principal con detalles */}
      <div className="bg-bg-card border border-border-app rounded-3xl p-6 md:p-10 backdrop-blur-xl shadow-2xl space-y-8 relative overflow-hidden text-text-primary print:bg-white print:border-none print:shadow-none print:p-0 print:text-black">
        
        {/* Fila del Título y Acciones */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-bold tracking-wider text-purple-accent uppercase bg-purple-accent/15 border border-purple-accent/25 px-3 py-1 rounded-full print:text-black print:border-black/20 print:bg-white">
                {recipe.category}
              </span>
              <span className="text-xs font-semibold bg-bg-input-half/50 border border-border-app text-text-secondary px-3 py-1 rounded-full print:text-black print:border-black/20 print:bg-white">
                Dificultad: {recipe.difficulty}
              </span>
              {recipe.cuisine && recipe.cuisine !== 'Sin Definir' && (
                <span className="text-xs font-semibold bg-bg-input-half/50 border border-border-app text-text-secondary px-3 py-1 rounded-full print:text-black print:border-black/20 print:bg-white">
                  Cocina: {recipe.cuisine}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-text-primary tracking-tight font-heading leading-tight pt-1 print:text-black print:text-3xl">
              {recipe.name}
            </h1>
            <p className="text-sm text-text-secondary print:text-black print:font-semibold">
              Creado por: <strong className="text-text-secondary print:text-black">{recipe.createdByName || 'Administrador'}</strong>
            </p>
          </div>

          {/* Botones de acción rápidos */}
          <div className="flex flex-wrap gap-3 items-center print:hidden">
            {/* Favorito */}
            <button
              onClick={() => onToggleFavorite(recipe.id, recipe.name)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition cursor-pointer ${
                isFavorite 
                  ? 'bg-rose-accent/15 text-rose-accent border-rose-accent/35 hover:bg-rose-accent/25' 
                  : 'bg-bg-input-half text-text-secondary border-border-app hover:text-rose-accent hover:border-rose-accent/30'
              }`}
            >
              <Heart className={`w-4.5 h-4.5 ${isFavorite ? 'fill-current' : ''}`} />
              <span>{isFavorite ? 'Favorito' : 'Guardar'}</span>
            </button>

            {/* Planificar Menú */}
            <button
              onClick={() => onAddToMenu(recipe)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-accent/15 border border-purple-accent/25 text-purple-accent hover:opacity-85 text-sm font-bold shadow-lg shadow-purple-500/5 transition cursor-pointer"
            >
              <ShoppingBag className="w-4.5 h-4.5" />
              <span>Agregar a lista de compras</span>
            </button>

            {/* Guardar PDF */}
            <button
              onClick={handlePrintRecipe}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-accent/10 border border-teal-accent/25 text-teal-accent hover:opacity-85 text-sm font-bold shadow-lg transition cursor-pointer"
            >
              <Printer className="w-4.5 h-4.5" />
              <span>Guardar PDF</span>
            </button>

            {/* Iniciar Modo Cocina */}
            <button
              onClick={() => setModoCocinaActive(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-accent text-bg-app hover:opacity-90 text-sm font-bold shadow-lg shadow-teal-500/20 transition cursor-pointer"
            >
              <Play className="w-4.5 h-4.5 fill-current" />
              <span>Modo Cocina</span>
            </button>

            {/* Editar / Eliminar si es dueño */}
            {isOwner && (
              <div className="flex gap-2">
                <button
                  onClick={onEdit}
                  title="Editar Receta"
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-bg-input border border-border-app text-text-secondary hover:bg-bg-card hover:text-text-primary transition cursor-pointer"
                >
                  <Edit className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={onDelete}
                  title="Eliminar Receta"
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-accent/10 border border-rose-accent/25 text-rose-accent hover:bg-rose-accent/20 transition cursor-pointer"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sugerencia */}
        {recipe.suggestion && (
          <div className="bg-purple-accent/10 border border-purple-accent/25 p-5 rounded-2xl flex gap-3 text-text-primary text-sm italic print:bg-white print:border-none print:p-0 print:text-black">
            <Info className="w-5 h-5 text-purple-accent shrink-0 mt-0.5 print:hidden" />
            <span>"{recipe.suggestion}"</span>
          </div>
        )}

        {/* Información Nutricional (IA) */}
        <div className="bg-bg-input-half/50 border border-border-app p-6 rounded-2xl print:bg-white print:border-black/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 print:text-black">
              <Activity className="w-5 h-5 text-purple-accent" />
              Información Nutricional (Total Receta)
            </h2>
            {!recipe.nutritionalInfo && (
              <button
                onClick={calculateNutrition}
                disabled={isCalculatingNutrition}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-accent text-white text-xs font-bold shadow-lg shadow-purple-500/20 hover:opacity-90 transition disabled:opacity-50 cursor-pointer print:hidden"
              >
                {isCalculatingNutrition ? <Loader2 className="w-4 h-4 animate-spin" /> : '✨ Calcular con IA'}
              </button>
            )}
          </div>
          
          {nutritionError && <p className="text-xs text-rose-accent mb-3">{nutritionError}</p>}
          
          {recipe.nutritionalInfo ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-bg-input border border-border-app p-3 rounded-xl text-center print:border-black/20">
                <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold mb-1">Calorías</p>
                <p className="text-2xl font-black text-text-primary print:text-black">{Math.round((recipe.nutritionalInfo.calories || 0) * scaleFactor)} <span className="text-xs font-normal text-text-secondary">kcal</span></p>
              </div>
              <div className="bg-bg-input border border-border-app p-3 rounded-xl text-center print:border-black/20">
                <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold mb-1">Proteínas</p>
                <p className="text-2xl font-black text-text-primary print:text-black">{Math.round((recipe.nutritionalInfo.protein || 0) * scaleFactor)} <span className="text-xs font-normal text-text-secondary">g</span></p>
              </div>
              <div className="bg-bg-input border border-border-app p-3 rounded-xl text-center print:border-black/20">
                <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold mb-1">Carbohidratos</p>
                <p className="text-2xl font-black text-text-primary print:text-black">{Math.round((recipe.nutritionalInfo.carbs || 0) * scaleFactor)} <span className="text-xs font-normal text-text-secondary">g</span></p>
              </div>
              <div className="bg-bg-input border border-border-app p-3 rounded-xl text-center print:border-black/20">
                <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold mb-1">Grasas</p>
                <p className="text-2xl font-black text-text-primary print:text-black">{Math.round((recipe.nutritionalInfo.fat || 0) * scaleFactor)} <span className="text-xs font-normal text-text-secondary">g</span></p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-secondary print:hidden">Haz clic en el botón para calcular automáticamente los valores nutricionales basados en los ingredientes.</p>
          )}
        </div>

        {/* Dos columnas: Ingredientes (Reescalables) y Preparación */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4 print:block">
          
          {/* Ingredientes - 5 Cols */}
          <div className="md:col-span-5 space-y-6 print:w-full print:mb-6">
            <div className="flex items-center justify-between border-b border-border-app pb-3 print:border-black/20">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2 font-heading print:text-black print:text-lg">
                <ClipboardList className="w-5 h-5 text-teal-accent print:hidden" />
                Ingredientes (para {currentServings} {recipe.servingType.toLowerCase()})
              </h2>
              <button
                onClick={onShowEquivalences}
                className="text-xs font-semibold text-teal-accent hover:opacity-80 transition flex items-center gap-1 cursor-pointer print:hidden"
                type="button"
              >
                Ver Equivalencias
              </button>
            </div>

            {/* Controles de Porción interactivos */}
            <div className="bg-bg-input-half border border-border-app p-4 rounded-2xl flex items-center justify-between print:hidden">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Porciones</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={decrement}
                  className="w-8 h-8 flex items-center justify-center bg-bg-input border border-border-app hover:bg-bg-card text-text-primary rounded-lg transition cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-lg font-bold text-teal-accent min-w-8 text-center">{currentServings}</span>
                <button
                  onClick={increment}
                  className="w-8 h-8 flex items-center justify-center bg-bg-input border border-border-app hover:bg-bg-card text-text-primary rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lista de Ingredientes */}
            <ul className="space-y-3 print:space-y-0.5">
              {recipe.ingredients.length === 0 ? (
                <li className="text-xs text-text-secondary print:text-black">No hay ingredientes registrados.</li>
              ) : (
                recipe.ingredients.map(ing => (
                  <li key={ing.id} className="flex justify-between items-baseline text-sm text-text-primary border-b border-border-app/50 pb-2 print:pb-0.5 print:pt-0.5 print:text-xs print:text-black print:border-black/5">
                    <span className="pr-4 print:text-black">
                      {ing.name}{' '}
                      {ing.observation && (
                        <span className="text-[11px] text-text-secondary print:text-black/60">({ing.observation})</span>
                      )}
                    </span>
                    <span className="font-semibold text-teal-accent text-right shrink-0 print:text-black">
                      {ing.quantity > 0 
                        ? `${formatQuantity(ing.quantity)} ${ing.unit}` 
                        : 'Al gusto'
                      }
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Preparación - 7 Cols */}
          <div className="md:col-span-7 space-y-6 print:w-full print:pt-4">
            <h2 className="text-xl font-bold text-text-primary border-b border-border-app pb-3 font-heading print:text-black print:text-lg print:border-black/20">
              Preparación
            </h2>
            <div className="text-text-primary text-sm leading-relaxed whitespace-pre-line bg-bg-input-half/30 p-5 rounded-2xl border border-border-app print:bg-white print:border-none print:p-0 print:text-black">
              {recipe.preparation}
            </div>

            {/* Notas / Consejos */}
            {recipe.notes && recipe.notes.length > 0 && (
              <div className="space-y-4 pt-4 print:pt-2">
                <h3 className="text-base font-bold text-text-primary print:text-black print:text-sm">Tips del Cocinero</h3>
                <div className="space-y-3">
                  {recipe.notes.map(note => (
                    <div 
                      key={note.id} 
                      className="bg-teal-accent/5 border border-teal-accent/20 p-4 rounded-xl space-y-1 print:bg-white print:border-l-4 print:border-black/30 print:rounded-none print:p-2 print:pl-4 print:border-y-0 print:border-r-0"
                    >
                      <h4 className="text-xs font-bold text-teal-accent uppercase tracking-wider print:text-black print:font-bold">{note.title}</h4>
                      <p className="text-xs text-text-secondary leading-normal print:text-black/80">{note.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modo Cocina Modal */}
      {modoCocinaActive && (
        <ModoCocina 
          recipe={recipe} 
          onClose={() => setModoCocinaActive(false)} 
        />
      )}
    </div>
  );
};
export default RecipeDetail;
