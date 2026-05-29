import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Users, Trash2, Plus, RefreshCw, Mail, ShieldCheck } from 'lucide-react';

interface AuthUser {
  id: string;
  email: string;
}

export default function ConfigManager() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (db) {
        const snap = await getDocs(collection(db, 'authorizedUsers'));
        const list = snap.docs.map(d => ({ id: d.id, email: d.data().email }));
        setUsers(list);
      }
    } catch (e) {
      console.warn('Error fetching authorized users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !db) return;
    setAdding(true);
    try {
      await addDoc(collection(db, 'authorizedUsers'), {
        email: newEmail.toLowerCase()
      });
      setNewEmail('');
      await fetchUsers();
      // Optionally trigger global refresh but the array is fetched on load
      // Realistically they need to reload the page to see changes.
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error(err);
      alert('Error agregando usuario');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    if (!confirm('¿Seguro que desea revocar el acceso a este correo?')) return;
    try {
      await deleteDoc(doc(db, 'authorizedUsers', id));
      await fetchUsers();
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
             <ShieldCheck size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-sans tracking-tight">Acceso y Permisos</h2>
            <p className="text-sm text-slate-500 mt-1">Autoriza correos de Google para que puedan usar el sistema</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Users size={18} className="text-indigo-600" />
            Usuarios Autorizados
          </h3>
          <button 
            onClick={fetchUsers} 
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Recargar usuarios"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        
        <div className="p-6 border-b border-slate-100">
          <form onSubmit={handleAdd} className="flex gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="email" 
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="nuevo.usuario@gmail.com"
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={adding || !newEmail}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl transition-all shadow-sm"
            >
              {adding ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
              Autorizar
            </button>
          </form>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <RefreshCw size={24} className="animate-spin" />
              <p className="text-sm">Cargando permisos...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              No hay usuarios adicionales autorizados.<br/>Los propietarios principales siempre tienen acceso.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {users.map(u => (
                <li key={u.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
                      {u.email.charAt(0)}
                    </div>
                    <span className="font-medium text-slate-700 text-sm">{u.email}</span>
                  </div>
                  <button 
                    onClick={() => handleDelete(u.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Revocar acceso"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
