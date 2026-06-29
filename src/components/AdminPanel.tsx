import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import type { AppUser, Recipe } from '../types';
import { Users, Loader2, ExternalLink, BarChart2, Activity, PieChart } from 'lucide-react';

interface AdminPanelProps {
  recipes: Recipe[];
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ recipes }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('lastLoginAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: AppUser[] = [];
      snapshot.forEach((doc) => {
        items.push({ uid: doc.id, ...doc.data() } as AppUser);
      });
      setUsers(items);
      setLoading(false);
    }, (error) => {
      console.error("Error cargando usuarios:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-teal-accent" />
        <p className="animate-pulse">Cargando panel de administrador...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      
      {/* Tarjetas de Enlaces Externos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="https://console.firebase.google.com/project/mirecetario-1a58d/overview" target="_blank" rel="noopener noreferrer" className="bg-bg-card border border-border-app p-4 rounded-2xl shadow-sm hover:border-teal-500/50 hover:shadow-md transition-all group flex items-start justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-500/5 border border-slate-500/10 rounded-xl text-slate-400 group-hover:bg-teal-500/10 group-hover:border-teal-500/20 group-hover:text-teal-accent transition">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-sm group-hover:text-teal-accent transition">Consola Firebase</h3>
              <p className="text-xs text-text-secondary mt-0.5">Métricas técnicas</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-text-secondary group-hover:text-teal-accent transition" />
        </a>

        <a href="https://console.firebase.google.com/project/mirecetario-1a58d/analytics/debugview" target="_blank" rel="noopener noreferrer" className="bg-bg-card border border-border-app p-4 rounded-2xl shadow-sm hover:border-teal-500/50 hover:shadow-md transition-all group flex items-start justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-500/5 border border-slate-500/10 rounded-xl text-slate-400 group-hover:bg-teal-500/10 group-hover:border-teal-500/20 group-hover:text-teal-accent transition">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-sm group-hover:text-teal-accent transition">Debug View</h3>
              <p className="text-xs text-text-secondary mt-0.5">Eventos en vivo</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-text-secondary group-hover:text-teal-accent transition" />
        </a>

        <a href="https://console.firebase.google.com/project/mirecetario-1a58d/analytics" target="_blank" rel="noopener noreferrer" className="bg-bg-card border border-border-app p-4 rounded-2xl shadow-sm hover:border-teal-500/50 hover:shadow-md transition-all group flex items-start justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-500/5 border border-slate-500/10 rounded-xl text-slate-400 group-hover:bg-teal-500/10 group-hover:border-teal-500/20 group-hover:text-teal-accent transition">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-sm group-hover:text-teal-accent transition">Google Analytics</h3>
              <p className="text-xs text-text-secondary mt-0.5">Reportes de uso</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-text-secondary group-hover:text-teal-accent transition" />
        </a>
      </div>

      {/* Header Panel */}
      <div className="bg-bg-card p-6 rounded-2xl shadow-sm border border-border-app flex items-center justify-between mt-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary font-heading flex items-center gap-2 uppercase tracking-wide">
            <Users className="w-5 h-5 text-teal-accent" />
            Detalle de Organizaciones
          </h2>
          <p className="text-text-secondary text-sm mt-1">
            Estadísticas de uso y actividad por cada usuario.
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-teal-accent">{users.length}</p>
          <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Total Usuarios</p>
        </div>
      </div>

      {/* Lista de Usuarios */}
      <div className="bg-bg-card rounded-2xl shadow-sm border border-border-app overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-input-half/50 text-xs uppercase tracking-wider text-text-secondary border-b border-border-app/50">
                <th className="p-4 font-bold text-text-primary">Dueño / Usuario</th>
                <th className="p-4 font-bold text-center text-text-primary" title="Recetas Creadas">Creadas</th>
                <th className="p-4 font-bold text-center text-text-primary" title="Recetas Abiertas (Vistas)">Abiertas</th>
                <th className="p-4 font-bold text-right text-text-primary">Última Actividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-app/30 text-sm">
              {users.map((user) => {
                const dateObj = new Date(user.lastLoginAt);
                const formattedDate = !isNaN(dateObj.getTime()) 
                  ? dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Fecha desconocida';

                const recipesCreatedCount = recipes.filter(r => r.createdBy === user.uid).length;
                const recipesOpenedCount = user.openedRecipesCount || 0;

                return (
                  <tr key={user.uid} className="hover:bg-bg-input/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName || 'Usuario'} className="w-10 h-10 rounded-full border-2 border-border-app/50" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-500/10 border-2 border-slate-500/20 text-slate-400 flex items-center justify-center font-bold text-lg">
                            {(user.displayName || user.email || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-text-primary">{user.displayName || 'Sin nombre'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <svg className="w-3 h-3 text-text-secondary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <span className="text-xs text-text-secondary">{user.email || 'Sin correo'}</span>
                          </div>
                          <p className="text-[9px] text-text-secondary/50 font-mono mt-0.5 tracking-tighter">{user.uid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/10 text-teal-accent font-black text-sm">
                        {recipesCreatedCount}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-500/10 text-rose-accent font-black text-sm">
                        {recipesOpenedCount}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-xs font-medium text-text-secondary">
                        {formattedDate}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-text-secondary italic">
                    No hay usuarios registrados aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
