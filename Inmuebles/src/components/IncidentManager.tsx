import React, { useState } from 'react';
import { Wrench, Plus, CheckCircle2, AlertTriangle, AlertCircle, Search, HelpCircle, ShieldAlert, Trash2 } from 'lucide-react';
import { Incident, Property } from '../types';

interface IncidentManagerProps {
  incidents: Incident[];
  properties: Property[];
  onAdd: (inc: Incident) => Promise<void>;
  onUpdate: (id: string, inc: Partial<Incident>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function IncidentManager({ incidents, properties, onAdd, onUpdate, onDelete }: IncidentManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Form Fields
  const [codigoPropiedad, setCodigoPropiedad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<'Alta' | 'Media' | 'Baja'>('Media');
  const [estado, setEstado] = useState<'Abierto' | 'En Proceso' | 'Resuelto'>('Abierto');
  const [fechaReporte, setFechaReporte] = useState(new Date().toISOString().split('T')[0]);
  const [montoEstimado, setMontoEstimado] = useState<number>(0);

  const formatterCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoPropiedad || !descripcion) {
      setError('Por favor complete todos los campos obligatorios.');
      return;
    }

    setLoading(true);
    setError('');

    const newIncident: Incident = {
      codigoPropiedad,
      descripcion: descripcion.trim(),
      prioridad,
      estado,
      fechaReporte,
      montoEstimado: Number(montoEstimado) || 0
    };

    try {
      await onAdd(newIncident);
      setShowForm(false);
      // Reset form
      setCodigoPropiedad('');
      setDescripcion('');
      setPrioridad('Media');
      setEstado('Abierto');
      setMontoEstimado(0);
    } catch (e: any) {
      setError('Error al registrar ticket de mantenimiento: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const handleStateChange = async (id: string, newStatus: 'Abierto' | 'En Proceso' | 'Resuelto') => {
    try {
      await onUpdate(id, { estado: newStatus });
    } catch (e) {
      alert("Error al actualizar estado del incidente en Firebase: " + String(e));
    }
  };

  const getPriorityBadge = (prio: 'Alta' | 'Media' | 'Baja') => {
    switch (prio) {
      case 'Alta':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle size={10} /> Alta Prioridad
          </span>
        );
      case 'Media':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle size={10} /> Media
          </span>
        );
      case 'Baja':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Baja
          </span>
        );
    }
  };

  const getStatusBadge = (st: 'Abierto' | 'En Proceso' | 'Resuelto') => {
    switch (st) {
      case 'Abierto':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700">
            Abierto
          </span>
        );
      case 'En Proceso':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">
            En Proceso
          </span>
        );
      case 'Resuelto':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800">
            <CheckCircle2 size={10} /> Resuelto
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" id="incident-manager">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 font-sans">Incidencias y Reparaciones</h2>
          <p className="text-gray-500 text-xs mt-1">Control de averías, daños reportados, estado de fontanería/eléctrico y cotizaciones.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shrink-0 font-sans"
          >
            <Plus size={14} /> Reportar Daño
          </button>
        )}
      </div>

      {/* Incident Editor Form */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
            <h3 className="font-semibold text-sm text-gray-950 pb-2 border-b border-gray-100 mb-4">
              Reportar Anomalía / Abrir Ticket de Mantenimiento
            </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Inmueble Afectado*</label>
                <select
                  value={codigoPropiedad}
                  onChange={(e) => setCodigoPropiedad(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-sans"
                  required
                >
                  <option value="">-- Seleccionar Predio --</option>
                  {properties.map(p => (
                    <option key={p.id || p.codigo} value={p.codigo}>
                      📍 {p.direccion.split(',')[0]} ( {p.municipio || 'Paipa'}, {p.departamento || 'Boyacá'} )
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nivel de Urgencia / Prioridad</label>
                <select
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-sans"
                >
                  <option value="Baja">Baja (Asunto menor)</option>
                  <option value="Media">Media (Uso incómodo)</option>
                  <option value="Alta">Alta (Peligro de daños mayores o inhabitable)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Costo Estimado de Reparación (COP)</label>
                <input
                  type="number"
                  placeholder="Ej: 150000"
                  value={montoEstimado || ''}
                  onChange={(e) => setMontoEstimado(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 font-mono">Fecha del Reporte</label>
                <input
                  type="date"
                  value={fechaReporte}
                  onChange={(e) => setFechaReporte(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Estado de Reparación*</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-sans"
                >
                  <option value="Abierto">Abierto (Recibido)</option>
                  <option value="En Proceso">En Diagnóstico / Proceso</option>
                  <option value="Resuelto">Resuelto (Reparado)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción Detallada del Daño*</label>
              <textarea
                rows={3}
                placeholder="Describa el desperfecto (Ej: Tuberia de cobre picada que gotea en el baño de visitas causando humedad)"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-sans"
                required
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 font-sans"
                disabled={loading}
              >
                {loading ? 'Instanciando...' : 'Crear Ficha Daño'}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Incident Tickets dashboard list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {incidents.map((t) => {
          const prop = properties.find(p => p.codigo === t.codigoPropiedad);
          return (
            <div key={t.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-3xs hover:shadow-2xs transition-shadow flex flex-col justify-between">
              
              <div className="space-y-4">
                
                {/* ID and priority header */}
                <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-400 block font-mono">Inmueble Afectado</span>
                    <span className="text-xs font-bold text-gray-900 font-sans">{t.codigoPropiedad}</span>
                  </div>
                  {getPriorityBadge(t.prioridad)}
                </div>

                {/* Details / description of problem */}
                <div className="space-y-1 text-xs">
                  <p className="text-gray-500 text-[10px] font-sans font-semibold uppercase tracking-wider">Descripción del daño</p>
                  <p className="font-semibold text-gray-900 leading-relaxed font-sans min-h-[40px]">
                    {t.descripcion}
                  </p>
                </div>

                {/* Estimation fee info */}
                <div className="flex justify-between items-center text-xs text-gray-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-400 block">Presupuestado</span>
                    <span className="font-bold text-slate-900 block">{formatterCOP.format(t.montoEstimado)}</span>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-bold text-gray-400 block">Reportado el</span>
                    <span className="font-mono text-gray-500 block">{t.fechaReporte}</span>
                  </div>
                </div>

              </div>

              {/* Status footer with actions */}
              <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Estado:</span>
                  {getStatusBadge(t.estado)}
                </div>

                <div className="flex gap-1 items-center">
                  {t.estado !== 'Resuelto' ? (
                    <>
                      {t.estado === 'Abierto' && (
                        <button
                          onClick={() => handleStateChange(t.id!, 'En Proceso')}
                          className="px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                        >
                          Atender
                        </button>
                      )}
                      <button
                        onClick={() => handleStateChange(t.id!, 'Resuelto')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        Cerrar Ticket
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">Solucionado correctamente</span>
                  )}

                  {confirmingDeleteId === t.id ? (
                    <span className="flex items-center gap-1 border border-rose-200 bg-rose-50 p-1 rounded-lg">
                      <button
                        onClick={async () => {
                          try {
                            if (t.id) {
                              await onDelete(t.id);
                            }
                            setConfirmingDeleteId(null);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="px-1.5 py-0.5 text-[9px] bg-rose-600 text-white rounded font-bold"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        className="px-1.5 py-0.5 text-[9px] bg-gray-200 text-gray-600 rounded font-semibold"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        if (t.id) setConfirmingDeleteId(t.id);
                      }}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                      title="Eliminar Reporte"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}

        {incidents.length === 0 && (
          <div className="col-span-full bg-white p-10 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 font-sans">
            <Wrench size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-xs font-medium">No hay reportes de daños pendientes.</p>
            <p className="text-[11px] text-gray-400 mt-1">Sus predios se encuentran en condiciones óptimas de habitabilidad.</p>
          </div>
        )}
      </div>

    </div>
  );
}
