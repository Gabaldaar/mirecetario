import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import type { AppUser } from '../types';
import { Users, Loader2 } from 'lucide-react';

export const AdminPanel: React.FC = () => {
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
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="bg-bg-card p-6 rounded-2xl shadow-sm border border-border-app flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary font-heading flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-accent" />
            Panel de Administrador
          </h2>
          <p className="text-text-secondary text-sm mt-1">
            Gestión y estadísticas de usuarios registrados
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black text-teal-accent">{users.length}</p>
          <p className="text-xs text-text-secondary uppercase tracking-wider font-bold">Usuarios Totales</p>
        </div>
      </div>

      {/* Lista de Usuarios */}
      <div className="bg-bg-card rounded-2xl shadow-sm border border-border-app overflow-hidden">
        <div className="p-4 border-b border-border-app bg-bg-input/30">
          <h3 className="font-bold text-text-primary">Usuarios Registrados</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-input-half text-xs uppercase tracking-wider text-text-secondary">
                <th className="p-4 font-semibold">Usuario</th>
                <th className="p-4 font-semibold">Correo</th>
                <th className="p-4 font-semibold">Último Acceso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-app/50 text-sm">
              {users.map((user) => {
                const dateObj = new Date(user.lastLoginAt);
                const formattedDate = !isNaN(dateObj.getTime()) 
                  ? dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Fecha desconocida';

                return (
                  <tr key={user.uid} className="hover:bg-bg-input/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName || 'Usuario'} className="w-8 h-8 rounded-full border border-border-app" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-accent flex items-center justify-center font-bold">
                            {(user.displayName || user.email || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-text-primary">{user.displayName || 'Sin nombre'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-text-secondary">
                      {user.email || 'Sin correo'}
                    </td>
                    <td className="p-4 text-text-secondary">
                      {formattedDate}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-text-secondary italic">
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
