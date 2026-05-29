import React, { useState } from 'react';
import { CircleDollarSign, Plus, CheckCircle2, TicketCheck, XCircle, Search, HelpCircle, FileSpreadsheet, Trash2 } from 'lucide-react';
import { Expense, Property } from '../types';

interface ExpenseManagerProps {
  expenses: Expense[];
  properties: Property[];
  onAdd: (ex: Expense) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function ExpenseManager({ expenses, properties, onAdd, onDelete }: ExpenseManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  
  // Form Fields
  const [codigoPropiedad, setCodigoPropiedad] = useState('GENERAL');
  const [tipoGasto, setTipoGasto] = useState<'Impuesto' | 'Servicio Público' | 'Seguro de Arrendamiento' | 'Reparación/Mantenimiento' | 'Otro'>('Servicio Público');
  const [monto, setMonto] = useState<number>(0);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [concepto, setConcepto] = useState('');
  const [pagado, setPagado] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatterCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (monto <= 0 || !concepto) {
      setError('Por favor complete todos los campos obligatorios.');
      return;
    }

    setLoading(true);
    setError('');

    const newExpense: Expense = {
      codigoPropiedad,
      tipoGasto,
      monto: Number(monto),
      fecha,
      concepto: concepto.trim(),
      pagado
    };

    try {
      await onAdd(newExpense);
      setShowForm(false);
      // Reset form
      setCodigoPropiedad('GENERAL');
      setTipoGasto('Servicio Público');
      setMonto(0);
      setConcepto('');
      setPagado(true);
    } catch (e: any) {
      setError('Error al registrar gasto: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const getExpenseTypeColor = (type: string) => {
    switch (type) {
      case 'Impuesto':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Servicio Público':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Seguro de Arrendamiento':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Reparación/Mantenimiento':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="space-y-6" id="expenses-manager">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 font-sans">Control de Gastos y Facturas</h2>
          <p className="text-gray-500 text-xs mt-1">Registro de aportaciones, impuestos prediales, pólizas de seguros y servicios públicos.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shrink-0"
          >
            <Plus size={14} /> Registrar Gasto
          </button>
        )}
      </div>

      {/* Expense Form */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
            <h3 className="font-semibold text-sm text-gray-950 pb-2 border-b border-gray-100 mb-4">
              Registrar Transacción de Egreso / Gasto Predial
            </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Inmueble Vinculado</label>
                <select
                  value={codigoPropiedad}
                  onChange={(e) => setCodigoPropiedad(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-sans"
                >
                  <option value="GENERAL">GASTO GENERAL (No específico)</option>
                  {properties.map(p => (
                    <option key={p.id || p.codigo} value={p.codigo}>
                      📍 {p.direccion.split(',')[0]} ( {p.municipio || 'Paipa'}, {p.departamento || 'Boyacá'} )
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Rubro de Gasto / Tipo*</label>
                <select
                  value={tipoGasto}
                  onChange={(e) => setTipoGasto(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-sans"
                >
                  <option value="Impuesto">Impuesto Predial / Tasas Estatales</option>
                  <option value="Servicio Público">Servicio Público (Luz, Agua, Gas, Net)</option>
                  <option value="Seguro de Arrendamiento">Seguro de Arrendamiento (Póliza El Libertador, etc.)</option>
                  <option value="Reparación/Mantenimiento">Reparación o Mantenimiento estructural</option>
                  <option value="Otro">Otro Gasto administrativo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Monto Pagado ($ COP)*</label>
                <input
                  type="number"
                  placeholder="Ej: 85000"
                  value={monto || ''}
                  onChange={(e) => setMonto(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 font-mono">Fecha del Gasto*</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">¿Pago Efectuado?*</label>
                <select
                  value={pagado ? 'true' : 'false'}
                  onChange={(e) => setPagado(e.target.value === 'true')}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-sans"
                >
                  <option value="true">Sí, pagado</option>
                  <option value="false">Pendiente / Por Pagar</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Detalle / Concepto del Egreso*</label>
              <input
                type="text"
                placeholder="Ej: Pago acueducto factura periodo Febrero - TAPP"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
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
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Registrando...' : 'Registrar Gasto'}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Expenses History Table view */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-3xs overflow-hidden">
        
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-800">Historial Completo de Egresos</span>
          <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md">
            Suma de egresos totales: {formatterCOP.format(expenses.reduce((sum, e) => sum + e.monto, 0))}
          </span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100/30 border-b border-gray-200 text-gray-600 font-semibold font-sans">
                <th className="p-4">Predio / Origen</th>
                <th className="p-4">Rubro / Tipo</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Detalle Gasto</th>
                <th className="p-4">Monto</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 font-sans">
              {expenses.map((e, idx) => {
                const idKey = e.id || String(idx);
                return (
                  <tr key={idKey} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md text-[10px]">
                        {e.codigoPropiedad}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${getExpenseTypeColor(e.tipoGasto)}`}>
                        {e.tipoGasto}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-gray-500">{e.fecha}</td>
                    <td className="p-4 font-medium text-gray-800">{e.concepto}</td>
                    <td className="p-4 font-bold text-slate-900">{formatterCOP.format(e.monto)}</td>
                    <td className="p-4">
                      {e.pagado ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/55 px-2 py-0.5 rounded-full">
                          Pago conciliado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-800 bg-rose-100/55 px-2 py-0.5 rounded-full">
                          Por pagar
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {confirmingDeleteId === idKey ? (
                        <span className="flex items-center justify-end gap-1">
                          <button
                            onClick={async () => {
                              try {
                                await onDelete(idKey);
                                setConfirmingDeleteId(null);
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="px-2 py-1 text-[10px] bg-rose-600 text-white rounded font-bold transition-colors hover:bg-rose-700"
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setConfirmingDeleteId(null)}
                            className="px-2 py-1 text-[10px] bg-gray-100 text-gray-500 rounded font-semibold transition-colors hover:bg-gray-200"
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmingDeleteId(idKey)}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors font-sans"
                          title="Eliminar gasto"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {expenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-gray-400 font-sans">
                    <FileSpreadsheet size={32} className="mx-auto text-gray-300 mb-2" />
                    <span className="text-xs font-semibold block">Ningún egreso regitrado.</span>
                    <span className="text-[10px] text-gray-400">Los egresos de luz, predial y seguros aparecerán aquí.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
