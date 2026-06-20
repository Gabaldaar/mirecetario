import React, { useState } from 'react';
import { EQUIVALENCES_DATA } from '../data/equivalences';
import { X, Search, Info } from 'lucide-react';

interface EquivalenciasModalProps {
  onClose: () => void;
}

export const EquivalenciasModal: React.FC<EquivalenciasModalProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar grupos de equivalencia basados en el término de búsqueda
  const filteredData = EQUIVALENCES_DATA.map(group => {
    // Si la medida coincide, mostrar todas las equivalencias
    if (group.measure.toLowerCase().includes(searchTerm.toLowerCase())) {
      return group;
    }
    // De lo contrario, filtrar las equivalencias individuales
    const matchedEquivalences = group.equivalences.filter(eq => 
      eq.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (matchedEquivalences.length > 0) {
      return {
        ...group,
        equivalences: matchedEquivalences
      };
    }
    return null;
  }).filter((group): group is typeof EQUIVALENCES_DATA[0] => group !== null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-bg-card border border-border-app rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative text-text-primary">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-border-app pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-teal-accent" />
            <h2 className="text-xl font-bold text-text-primary font-heading">Tabla de Equivalencias</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-bg-input-half text-text-secondary hover:text-text-primary hover:bg-bg-card border border-border-app/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buscador */}
        <div className="relative mb-5">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary/60">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por medida o ingrediente (ej. taza, azúcar, CC)..."
            className="block w-full pl-9 pr-3 py-2 border border-border-app rounded-xl bg-bg-input text-text-primary placeholder-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-teal-accent/30 text-sm"
          />
        </div>

        {/* Contenido (Tabla/Lista de Equivalencias) */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {filteredData.length === 0 ? (
            <div className="text-center py-10 text-text-secondary text-sm">
              No se encontraron equivalencias para "{searchTerm}".
            </div>
          ) : (
            filteredData.map(group => (
              <div 
                key={group.measure} 
                className="bg-bg-input-half border border-border-app rounded-2xl p-4 space-y-2.5 transition"
              >
                <h3 className="text-sm font-extrabold text-teal-accent uppercase tracking-wider border-b border-border-app/60 pb-1.5">
                  {group.measure} equivale a:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-primary">
                  {group.equivalences.map(eq => (
                    <div 
                      key={eq} 
                      className="flex items-center gap-2 bg-bg-card px-3 py-2 rounded-lg border border-border-light"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-accent shrink-0"></span>
                      <span>{eq}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer explicativo */}
        <div className="border-t border-border-app pt-4 mt-4 text-[10px] text-text-secondary text-center">
          Esta tabla sirve como guía rápida de conversión para repostería y cocina general.
        </div>

      </div>
    </div>
  );
};
export default EquivalenciasModal;
