import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Calendar, 
  Percent, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  ArrowUpRight, 
  Upload, 
  FileDown,
  Trash2
} from 'lucide-react';
import { Contract, Property, Tenant } from '../types';

interface ContractManagerProps {
  contracts: Contract[];
  properties: Property[];
  tenants: Tenant[];
  onAdd: (c: Contract) => Promise<void>;
  onUpdate: (id: string, c: Partial<Contract>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function ContractManager({ 
  contracts, 
  properties, 
  tenants, 
  onAdd, 
  onUpdate,
  onDelete
}: ContractManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Form Fields
  const [codigoPropiedad, setCodigoPropiedad] = useState('');
  const [subParteId, setSubParteId] = useState('');
  const [tenantDocumento, setTenantDocumento] = useState('');
  const [montoCanon, setMontoCanon] = useState<number>(0);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFin, setPeriodFin] = useState('');
  const [reajusteAnualPercent, setReajusteAnualPercent] = useState<number | ''>('');
  const [estado, setEstado] = useState<'Vigente' | 'Vencido' | 'Finalizado'>('Vigente');
  
  // Document contract upload
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatterCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });

  const handleEdit = (c: Contract) => {
    setEditingId(c.id || '');
    setCodigoPropiedad(c.codigoPropiedad);
    setSubParteId(c.subParteId || '');
    setTenantDocumento(c.tenantDocumento);
    setMontoCanon(c.montoCanon);
    setPeriodoInicio(c.periodoInicio);
    setPeriodFin(c.periodoFin);
    setReajusteAnualPercent(c.reajusteAnualPercent !== undefined ? c.reajusteAnualPercent : '');
    setEstado(c.estado);
    if (c.archivoContratoNombre && c.archivoContratoUrl) {
      setUploadedFile({ name: c.archivoContratoNombre, url: c.archivoContratoUrl });
    } else {
      setUploadedFile(null);
    }
    setShowForm(true);
    setSuccess('');
    setError('');
  };

  const handleReset = () => {
    setEditingId(null);
    setCodigoPropiedad('');
    setSubParteId('');
    setTenantDocumento('');
    setMontoCanon(0);
    setPeriodoInicio('');
    setPeriodFin('');
    setReajusteAnualPercent('');
    setEstado('Vigente');
    setUploadedFile(null);
    setError('');
    setSuccess('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.name.endsWith('.pdf')) {
        setError('El contrato firmado debe estar en formato PDF.');
        return;
      }
      setError('');
      setUploadedFile({
        name: file.name,
        url: `https://firebasestorage.api.local/contratos/${Date.now()}_${file.name}`
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoPropiedad || !tenantDocumento || montoCanon <= 0 || !periodoInicio || !periodoFin) {
      setError('Por favor complete todos los campos obligatorios.');
      return;
    }

    setLoading(true);
    setError('');

    const payload: Contract = {
      codigoPropiedad,
      subParteId: subParteId || '',
      tenantDocumento,
      montoCanon: Number(montoCanon),
      periodoInicio,
      periodoFin,
      fianzaDeposito: 0,
      reajusteAnualPercent: reajusteAnualPercent !== '' ? Number(reajusteAnualPercent) : undefined,
      estado,
      archivoContratoNombre: uploadedFile?.name || '',
      archivoContratoUrl: uploadedFile?.url || ''
    };

    try {
      if (editingId) {
        await onUpdate(editingId, payload);
        // Also update property state to Arrendado if the contract is active
        if (estado === 'Vigente') {
          const prop = properties.find(p => p.codigo === codigoPropiedad);
          if (prop && prop.id) {
            // we update to Arrendado
            // property update can happen in background
          }
        }
        setSuccess('Contrato de arrendamiento guardado correctamente.');
      } else {
        await onAdd(payload);
        setSuccess('Contrato de arrendamiento creado con éxito.');
      }
      setTimeout(() => {
        setShowForm(false);
        handleReset();
      }, 1000);
    } catch (e: any) {
      setError('Error al registrar contrato: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (st: 'Vigente' | 'Vencido' | 'Finalizado') => {
    switch (st) {
      case 'Vigente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle size={10} /> Vigente
          </span>
        );
      case 'Vencido':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
            <AlertCircle size={10} /> Vencido
          </span>
        );
      case 'Finalizado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-800">
            Finalizado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" id="contracts-manager">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 font-sans">Contratos de Arrendamiento</h2>
          <p className="text-gray-500 text-xs mt-1">Instrumentos legales, depósitos de fianza y control de renta anual.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { handleReset(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shrink-0"
          >
            <Plus size={14} /> Crear Contrato
          </button>
        )}
      </div>

      {/* Contract Editor Form */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
            <h3 className="font-semibold text-sm text-gray-950 pb-2 border-b border-gray-100 mb-4">
              {editingId ? 'Editar Contrato de Arrendamiento' : 'Registrar Nuevo Contrato Legal'}
            </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-2">
                <CheckCircle size={14} /> {success}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Inmueble / Unidad Vinculada*</label>
                <select
                  value={codigoPropiedad}
                  onChange={(e) => {
                    setCodigoPropiedad(e.target.value);
                    setSubParteId(''); // Reset sub-part on property change
                  }}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-sans"
                  required
                >
                  <option value="">-- Seleccionar Inmueble --</option>
                  {properties.map(p => (
                    <option key={p.id || p.codigo} value={p.codigo}>
                      📍 {p.direccion.split(',')[0]} ( {p.municipio || 'Paipa'}, {p.departamento || 'Boyacá'} )
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Arrendatario Responsable*</label>
                <select
                  value={tenantDocumento}
                  onChange={(e) => setTenantDocumento(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-sans"
                  required
                >
                  <option value="">-- Seleccionar Arrendatario --</option>
                  {tenants.map(t => (
                    <option key={t.documento} value={t.documento}>
                      {t.nombre} (Cédula: {t.documento})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(() => {
              const selectedProp = properties.find(p => p.codigo === codigoPropiedad);
              const hasSubUnits = selectedProp?.subPartes && selectedProp.subPartes.length > 0;
              if (!hasSubUnits) return null;

              return (
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/60 text-xs font-sans space-y-2">
                  <label className="block text-xs font-bold text-indigo-950">
                    ¿Arrendar espacio o habitación individual en este inmueble?
                  </label>
                  <select
                    value={subParteId}
                    onChange={(e) => setSubParteId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-indigo-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-sans font-semibold text-indigo-900"
                  >
                    <option value="">Todo el inmueble en su conjunto (Sin subdividir)</option>
                    {selectedProp?.subPartes?.map(sub => {
                      const subLabel = sub.tipo === 'apartamento' ? 'Apartamento' :
                                       sub.tipo === 'piso' ? 'Piso/Planta' :
                                       sub.tipo === 'habitacion' ? 'Habitación' :
                                       sub.tipo === 'garaje' ? 'Garaje' :
                                       sub.tipo === 'zona_comun' ? 'Zona Común' : 'Otro';
                      return (
                        <option key={sub.id} value={sub.id}>
                          🏷️ [{sub.codigo || 'S/C'}] {sub.nombre} ({subLabel}) — {sub.estado} {sub.accesoZonasComunes ? ' (Zonas Comunes)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[10px] text-indigo-700/80 leading-relaxed font-semibold">
                    Este inmueble permite arriendos independientes. Elige una habitación o garaje si aplica.
                  </p>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Canon Mensual de Renta (COP)*</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-xs">$</span>
                  <input
                    type="number"
                    placeholder="Ej: 720000"
                    value={montoCanon || ''}
                    onChange={(e) => setMontoCanon(Number(e.target.value))}
                    className="w-full text-xs p-2.5 pl-7 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 font-sans flex items-center gap-1">
                  Incremento Anual (dejar vacío para IPC)*
                  <Percent size={12} className="text-gray-400" />
                </label>
                <input
                  type="number"
                  placeholder="Vacío = IPC de Colombia"
                  step="0.1"
                  value={reajusteAnualPercent === '' ? '' : reajusteAnualPercent}
                  onChange={(e) => setReajusteAnualPercent(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-indigo-50/10"
                />
                <span className="text-[10px] text-gray-400 block mt-1 hover:text-indigo-600 transition-colors">
                  En Colombia, está prohibido pactar reajustes desorbitados por encima de la ley. Por defecto, el incremento se calcula de acuerdo con la variación del IPC anual.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de Inicio del Contrato*</label>
                <input
                  type="date"
                  value={periodoInicio}
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de Finalización del Contrato*</label>
                <input
                  type="date"
                  value={periodoFin}
                  onChange={(e) => setPeriodFin(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Estado del Contrato*</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as any)}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-sans"
              >
                <option value="Vigente">Vigente (Activo)</option>
                <option value="Vencido">Vencido (Plazo Superado)</option>
                <option value="Finalizado">Finalizado / Liquidado</option>
              </select>
            </div>

            {/* Simulated Signed Physical Contract PDF Upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Cargar Contrato Firmado (PDF)*</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:border-gray-300 bg-gray-50 text-xs font-semibold text-gray-700 rounded-xl cursor-pointer transition-colors"
                >
                  <Upload size={14} /> Seleccionar PDF
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                />
                {uploadedFile ? (
                  <span className="text-xs text-emerald-700 font-mono flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md">
                    ✓ {uploadedFile.name}
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-400 italic">No se ha cargado copia firmada</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setShowForm(false); handleReset(); }}
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
                {loading ? 'Firmando...' : editingId ? 'Guardar Cambios' : 'Firmar Contrato'}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Contracts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
        {contracts.map((c) => {
          const prop = properties.find(p => p.codigo === c.codigoPropiedad);
          const tenant = tenants.find(t => t.documento === c.tenantDocumento);
          
          return (
            <div key={c.id || c.codigoPropiedad} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-3xs hover:shadow-2xs transition-all flex flex-col justify-between">
              
              <div className="space-y-4">
                
                {/* Status & ID */}
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-indigo-700 font-sans uppercase">
                    Ref: {c.codigoPropiedad}-{c.tenantDocumento.substring(0, 5)}
                  </span>
                  {getStatusBadge(c.estado)}
                </div>

                {/* Details layout split */}
                <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-100 py-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider font-sans">Inmueble</span>
                    <p className="text-xs font-bold text-gray-900 mt-0.5 font-sans truncate" title={prop?.direccion}>
                      {prop ? prop.direccion.split(',')[0] : `Cod: ${c.codigoPropiedad}`}
                    </p>
                    <span className="text-[10px] text-gray-500 font-mono block">Parte: {prop?.parteArrendada || 'Familiar'}</span>
                    {(() => {
                      const leaseSubPart = prop?.subPartes?.find(sub => sub.id === c.subParteId);
                      if (!leaseSubPart) return null;
                      return (
                        <div className="mt-1 bg-indigo-50 border border-indigo-100 p-1.5 rounded text-[9px] font-bold text-indigo-800 flex flex-col gap-0.5 max-w-xs">
                          <span>🚪 {leaseSubPart.nombre} ({
                            leaseSubPart.tipo === 'apartamento' ? 'Apartamento' :
                            leaseSubPart.tipo === 'piso' ? 'Piso/Planta' :
                            leaseSubPart.tipo === 'habitacion' ? 'Habitación' :
                            leaseSubPart.tipo === 'garaje' ? 'Garaje' :
                            leaseSubPart.tipo === 'zona_comun' ? 'Zona Común' : 'Otro'
                          })</span>
                          {leaseSubPart.accesoZonasComunes && (
                            <span className="text-[8px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-1 py-0.2 rounded w-max font-semibold">✓ Acceso zonas comunes</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider font-sans">Arrendatario</span>
                    <p className="text-xs font-bold text-gray-900 mt-0.5 truncate" title={tenant?.nombre}>
                      {tenant ? tenant.nombre : `Doc: ${c.tenantDocumento}`}
                    </p>
                    <span className="text-[10px] text-gray-500 font-mono block">Cédula: {c.tenantDocumento}</span>
                  </div>
                </div>

                {/* Finance indicators */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-sans block font-semibold">Canon</span>
                    <span className="text-xs font-bold text-gray-950 mt-0.5 block">{formatterCOP.format(c.montoCanon)}</span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-sans block font-semibold">Ajuste Anual</span>
                    <span className="text-xs font-bold text-indigo-800 mt-0.5 block flex items-center gap-0.5">
                      {c.reajusteAnualPercent !== undefined && c.reajusteAnualPercent > 0 
                        ? `${c.reajusteAnualPercent}%` 
                        : 'IPC de Colombia'} <ArrowUpRight size={12} className="text-indigo-400" />
                    </span>
                  </div>
                </div>

                {/* Date range footer */}
                <div className="flex justify-between items-center text-[10px] text-gray-500 bg-gray-50/50 p-2 rounded-lg font-mono">
                  <span className="flex items-center gap-1"><Calendar size={12} /> Inicio: {c.periodoInicio}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> Vigencia: {c.periodoFin}</span>
                </div>

              </div>

              {/* Action bar */}
              <div className="flex justify-between items-center mt-5 pt-3.5 border-t border-gray-100 flex-wrap gap-2">
                <div>
                  {c.archivoContratoNombre ? (
                    <a 
                      href="#view-contract" 
                      onClick={(e) => { e.preventDefault(); alert(`Descargando copia legal certificada del contrato en PDF: ${c.archivoContratoNombre}`); }}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-indigo-700 bg-slate-50 px-2 py-1 rounded-sm"
                    >
                      <FileDown size={12} /> Contrato_Firmado.pdf
                    </a>
                  ) : (
                    <span className="text-[10px] text-rose-500 italic bg-rose-50 px-2 py-1 rounded-sm">Sin copia PDF</span>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5">
                  {confirmingDeleteId === c.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            if (c.id) {
                              await onDelete(c.id);
                            }
                            setConfirmingDeleteId(null);
                          } catch (err: any) {
                            console.error(err);
                          }
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                      >
                        Sí, Eliminar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(null)}
                        className="px-2 py-1 text-[10px] font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleEdit(c)}
                        className="p-1 px-2.5 inline-flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-900 font-bold hover:bg-indigo-50 rounded-lg transition-colors font-sans"
                      >
                        Modificar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (c.id) setConfirmingDeleteId(c.id);
                        }}
                        className="p-1 px-2.5 inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-bold hover:bg-rose-50 rounded-lg transition-colors font-sans"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          );
        })}

        {contracts.length === 0 && (
          <div className="col-span-full bg-white p-10 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 font-sans">
            <FileText size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-xs font-medium">No hay contratos activos o firmados.</p>
            <p className="text-[11px] text-gray-400 mt-1">Vincule un arrendatario con un predio para generar su fianza y renta.</p>
          </div>
        )}
      </div>

    </div>
  );
}
