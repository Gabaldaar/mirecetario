import React from 'react';
import { 
  Search, 
  Mic, 
  Users, 
  Heart, 
  ChefHat, 
  ShoppingBag, 
  ListChecks,
  Volume2,
  Clock,
  HelpCircle,
  X
} from 'lucide-react';

interface GuiaUsoProps {
  onClose: () => void;
}

export const GuiaUso: React.FC<GuiaUsoProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sm:p-6 print:hidden">
      <div className="bg-bg-app border border-border-app w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-app bg-bg-app/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-text-primary font-heading tracking-tight">Guía de Uso</h2>
              <p className="text-xs text-text-secondary font-medium">Aprende a sacarle el máximo provecho a Mi Recetario</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-input-half transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Pilar A: Buscador */}
            <div className="bg-bg-input-half/30 border border-border-app rounded-2xl p-5 hover:border-teal-500/30 transition group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-teal-500/10 rounded-xl text-teal-accent group-hover:scale-110 transition-transform">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-text-primary leading-tight">Buscador de Recetas<br/><span className="text-sm font-medium text-text-secondary">(Texto y Voz)</span></h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">
                Filtra rápidamente entre todas las recetas de la aplicación.
              </p>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-teal-accent font-bold">•</span>
                  <span>Escribe en la barra superior para buscar por título o ingrediente.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-accent font-bold">•</span>
                  <span><strong>Búsqueda por voz:</strong> Toca el icono de <Mic className="w-4 h-4 inline text-teal-accent" /> micrófono para dictar el nombre del plato (ej: "papas fritas") y ver los resultados en tiempo real sin escribir.</span>
                </li>
              </ul>
            </div>

            {/* Pilar B: Porciones y Favoritos */}
            <div className="bg-bg-input-half/30 border border-border-app rounded-2xl p-5 hover:border-amber-500/30 transition group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-text-primary leading-tight">Porciones Dinámicas<br/><span className="text-sm font-medium text-text-secondary">& Favoritos</span></h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">
                Adapta cualquier receta a la cantidad de comensales.
              </p>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>Usa los botones <strong>+ y -</strong> en la vista de receta para recalcular automáticamente todas las cantidades de los ingredientes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>Toca el <Heart className="w-4 h-4 inline text-amber-500" /> <strong>corazón</strong> para guardar tus recetas preferidas y acceder a ellas rápidamente incluso sin conexión a internet.</span>
                </li>
              </ul>
            </div>

            {/* Pilar C: Modo Cocina */}
            <div className="bg-bg-input-half/30 border border-border-app rounded-2xl p-5 md:col-span-2 hover:border-purple-500/30 transition group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                  <ChefHat className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-text-primary">Modo Cocina (Manos Libres)</h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                Al presionar <strong>"Iniciar Modo Cocina"</strong> se abrirá una pantalla gigante de alta legibilidad con el micrófono activo, para que no tengas que ensuciar tu dispositivo mientras cocinas.
              </p>
              
              <div className="bg-bg-app border border-border-app rounded-xl p-4">
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">Comandos de Voz Disponibles</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Volume2 className="w-4 h-4 text-text-primary" />
                      <span className="text-sm font-bold text-text-primary">Navegación</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      <strong>Avanzar:</strong> "Siguiente", "Avanzar", "Dale"<br/>
                      <strong>Retroceder:</strong> "Anterior", "Atrás", "Volver"
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Volume2 className="w-4 h-4 text-text-primary" />
                      <span className="text-sm font-bold text-text-primary">Lectura</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      <strong>Repetir paso:</strong> "Repetir", "Leer", "Cómo"
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-text-primary" />
                      <span className="text-sm font-bold text-text-primary">Temporizadores</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Toca un tiempo resaltado en el texto para activar el cronómetro.<br/>
                      <strong>Control:</strong> "Pausa", "Detener", "Continuar"
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <X className="w-4 h-4 text-text-primary" />
                      <span className="text-sm font-bold text-text-primary">Cerrar</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      <strong>Terminar receta:</strong> "Salir", "Cerrar", "Terminar"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pilar D: Lista de Compras */}
            <div className="bg-bg-input-half/30 border border-border-app rounded-2xl p-5 hover:border-emerald-500/30 transition group md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-text-primary leading-tight">Lista de Compras Integrada</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <p className="text-sm text-text-secondary leading-relaxed">
                  Envía ingredientes enteros de una receta directamente a tu lista con el botón <strong>"Agregar a la Lista"</strong>. Se respetarán las porciones que hayas configurado.
                </p>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>Tacha ingredientes mientras haces las compras.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>Agrega elementos extra de forma manual (ej: "Detergente").</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>Usa el menú colaborativo que se sincroniza con tu cuenta en tiempo real.</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
