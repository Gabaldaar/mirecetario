import React, { useState } from 'react';
import type { MasterIngredient } from '../types';
import { db } from '../firebase/config';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { X, Search, PlusCircle, Trash2, Edit2, Check, AlertCircle } from 'lucide-react';

interface IngredientsManagerModalProps {
  onClose: () => void;
  masterIngredients: MasterIngredient[];
  showAlert?: (title: string, message: string) => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

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

export const IngredientsManagerModal: React.FC<IngredientsManagerModalProps> = ({
  onClose,
  masterIngredients,
  showAlert,
  showConfirm
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Varios');
  
  // Para edición inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingCategory, setEditingCategory] = useState('');

  // Filtrar ingredientes de forma segura evitando fallos por datos corruptos o incompletos
  const filteredIngredients = (masterIngredients || []).filter(ing => 
    ing && 
    typeof ing.name === 'string' && 
    typeof ing.category === 'string' && (
      ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ing.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Agregar ingrediente nuevo
  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const nameClean = newName.trim();
    // Verificar si ya existe un ingrediente con ese nombre de forma segura
    const exists = (masterIngredients || []).some(mi => 
      mi && 
      typeof mi.name === 'string' && 
      mi.name.toLowerCase() === nameClean.toLowerCase()
    );
    if (exists) {
      if (showAlert) {
        showAlert('Ingrediente Duplicado', `El ingrediente "${nameClean}" ya está registrado.`);
      } else {
        alert(`El ingrediente "${nameClean}" ya está registrado.`);
      }
      return;
    }

    try {
      const newId = `ing_${Date.now()}`;
      await setDoc(doc(db, 'ingredients', newId), {
        id: newId,
        name: nameClean,
        category: newCategory
      });
      setNewName('');
      setNewCategory('Varios');
    } catch (err) {
      console.error("Error al guardar ingrediente:", err);
    }
  };

  // Guardar edición
  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await setDoc(doc(db, 'ingredients', id), {
        id,
        name: editingName.trim(),
        category: editingCategory
      });
      setEditingId(null);
    } catch (err) {
      console.error("Error al actualizar ingrediente:", err);
    }
  };

  // Iniciar edición inline
  const handleStartEdit = (ing: MasterIngredient) => {
    setEditingId(ing.id);
    setEditingName(ing.name || '');
    setEditingCategory(ing.category || 'Varios');
  };

  // Eliminar ingrediente
  const handleDeleteIngredient = async (id: string, name: string) => {
    const performDelete = async () => {
      try {
        await deleteDoc(doc(db, 'ingredients', id));
      } catch (err) {
        console.error("Error al eliminar ingrediente:", err);
      }
    };

    if (showConfirm) {
      showConfirm(
        'Eliminar Ingrediente',
        `¿Estás seguro de que deseas eliminar "${name}" del listado de ingredientes maestros?`,
        performDelete,
        true // Es una acción destructiva
      );
    } else if (window.confirm(`¿Estás seguro de que deseas eliminar "${name}" del listado de ingredientes maestros?`)) {
      await performDelete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-bg-card border border-border-app rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative text-text-primary">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-border-app pb-4 mb-4">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-teal-accent" />
            <h2 className="text-xl font-bold font-heading text-text-primary">Administrar Ingredientes</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-bg-input-half text-text-secondary hover:text-text-primary hover:bg-bg-card border border-border-app/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sección Agregar Nuevo Ingrediente */}
        <form onSubmit={handleAddIngredient} className="bg-bg-input-half border border-border-app p-4 rounded-2xl mb-4 space-y-3">
          <h3 className="text-xs font-bold text-teal-accent uppercase tracking-wider">Registrar Nuevo Ingrediente</h3>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6">
              <label className="block text-[10px] text-text-secondary uppercase tracking-wider mb-1">Nombre</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej. Chocolate Amargo"
                className="block w-full px-3 py-2 border border-border-app rounded-xl bg-bg-input text-text-primary text-xs focus:outline-none"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-[10px] text-text-secondary uppercase tracking-wider mb-1">Categoría</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="block w-full px-3 py-2 border border-border-app rounded-xl bg-bg-input text-text-primary text-xs focus:outline-none cursor-pointer"
              >
                {ingredientCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full py-2 bg-teal-accent text-bg-app hover:opacity-90 font-bold rounded-xl text-xs transition cursor-pointer flex justify-center items-center gap-1"
              >
                Agregar
              </button>
            </div>
          </div>
        </form>

        {/* Buscador */}
        <div className="relative mb-4">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar ingrediente por nombre o categoría..."
            className="block w-full pl-9 pr-3 py-2 border border-border-app rounded-xl bg-bg-input text-text-primary placeholder-text-secondary/50 focus:outline-none text-xs"
          />
        </div>

        {/* Lista de Ingredientes */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {filteredIngredients.length === 0 ? (
            <div className="text-center py-8 text-text-secondary text-xs">
              No se encontraron ingredientes para "{searchTerm}".
            </div>
          ) : (
            filteredIngredients.map(ing => (
              <div 
                key={ing.id}
                className="flex items-center justify-between p-3 rounded-xl bg-bg-input-half/50 border border-border-app/40"
              >
                {editingId === ing.id ? (
                  /* Modo Edición Inline */
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 mr-2">
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full px-2 py-1 border border-border-app rounded bg-bg-input text-text-primary text-xs focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <select
                        value={editingCategory}
                        onChange={(e) => setEditingCategory(e.target.value)}
                        className="w-full px-2 py-1 border border-border-app rounded bg-bg-input text-text-primary text-xs focus:outline-none cursor-pointer"
                      >
                        {ingredientCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  /* Modo Visualización */
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">{ing.name}</h4>
                    <span className="text-[9px] bg-purple-accent/15 text-purple-accent border border-purple-accent/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {ing.category}
                    </span>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex items-center gap-2 shrink-0">
                  {editingId === ing.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(ing.id)}
                        className="p-1.5 rounded-lg bg-teal-accent/20 text-teal-accent hover:bg-teal-accent/35 transition cursor-pointer"
                        title="Guardar Cambios"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg bg-bg-input border border-border-app text-text-secondary hover:text-text-primary transition cursor-pointer"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStartEdit(ing)}
                        className="p-1.5 rounded-lg bg-bg-input border border-border-app text-text-secondary hover:text-teal-accent transition cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteIngredient(ing.id, ing.name)}
                        className="p-1.5 rounded-lg bg-rose-accent/10 border border-rose-accent/25 text-rose-accent hover:bg-rose-accent/20 transition cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info explicativa */}
        <div className="border-t border-border-app pt-3 mt-3 flex items-center gap-1.5 text-[9px] text-text-secondary">
          <AlertCircle className="w-3.5 h-3.5 text-teal-accent shrink-0" />
          <span>Las modificaciones y eliminaciones afectarán las sugerencias de autocompletado y el agrupamiento de listas de compras de forma global.</span>
        </div>

      </div>
    </div>
  );
};
export default IngredientsManagerModal;
