import React, { useState, useMemo } from 'react';
import { FileSignature, Plus, Search, Printer, Receipt, ShieldX, DollarSign, Calendar, ArrowLeft, CheckCircle2, FileText, Download } from 'lucide-react';
import { Contract, Property, Tenant } from '../types';

interface Liquidation {
  id: string;
  contractId: string;
  codigoPropiedad: string;
  nombreArrendatario: string;
  documentoArrendatario: string;
  fechaLiquidacion: string;
  depositoOriginal: number;
  descuentoDanios: number;
  descuentoServicios: number;
  descuentoArrendamientos: number;
  montoNetoDevuelto: number;
  detalleDanios: string;
  nombreQuienLiquida: string;
}

interface LiquidationManagerProps {
  contracts: Contract[];
  properties: Property[];
  tenants: Tenant[];
}

export default function LiquidationManager({ contracts, properties, tenants }: LiquidationManagerProps) {
  // Store liquidations in LocalStorage to enable subsequent consultation as requested
  const [liquidations, setLiquidations] = useState<Liquidation[]>(() => {
    const local = localStorage.getItem('local_liquidations');
    if (local) return JSON.parse(local);
    
    // Initial mock seed liquidation to populate the consulting list nicely
    const mockList: Liquidation[] = [];
    localStorage.setItem('local_liquidations', JSON.stringify(mockList));
    return mockList;
  });

  const [showForm, setShowForm] = useState(false);
  const [selectedLiq, setSelectedLiq] = useState<Liquidation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form Fields
  const [contractId, setContractId] = useState('');
  const [fechaLiquidacion, setFechaLiquidacion] = useState(new Date().toISOString().split('T')[0]);
  const [descuentoDanios, setDescuentoDanios] = useState<number>(0);
  const [descuentoServicios, setDescuentoServicios] = useState<number>(0);
  const [descuentoArrendamientos, setDescuentoArrendamientos] = useState<number>(0);
  const [detalleDanios, setDetalleDanios] = useState('');
  
  // Derived fields
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatterCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });

  const handleContractSelect = (cId: string) => {
    setContractId(cId);
    if (!cId) {
      setSelectedContract(null);
      return;
    }
    const c = contracts.find(con => con.id === cId);
    if (c) {
      setSelectedContract(c);
      setError('');
    }
  };

  // Compute live calculations
  const liquidationCalculations = useMemo(() => {
    if (!selectedContract) return { originalDeposit: 0, net: 0 };
    const originalDeposit = selectedContract.fianzaDeposito || 0;
    const net = originalDeposit - (descuentoDanios + descuentoServicios + descuentoArrendamientos);
    return { originalDeposit, net };
  }, [selectedContract, descuentoDanios, descuentoServicios, descuentoArrendamientos]);

  // Form submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractId || !selectedContract) {
      setError('Por favor elija un contrato de arrendamiento activo.');
      return;
    }

    const t = tenants.find(ten => ten.documento === selectedContract.tenantDocumento);
    const tenantName = t ? t.nombre : 'Arrendatario';

    const newLiq: Liquidation = {
      id: `LIQ-2026-0` + (liquidations.length + 1),
      contractId,
      codigoPropiedad: selectedContract.codigoPropiedad,
      nombreArrendatario: tenantName,
      documentoArrendatario: selectedContract.tenantDocumento,
      fechaLiquidacion,
      depositoOriginal: liquidationCalculations.originalDeposit,
      descuentoDanios,
      descuentoServicios,
      descuentoArrendamientos,
      montoNetoDevuelto: liquidationCalculations.net,
      detalleDanios: detalleDanios.trim() || 'Ningún daño reportado.',
      nombreQuienLiquida: 'Manuel Antonio Arias Guerra'
    };

    const updated = [newLiq, ...liquidations];
    setLiquidations(updated);
    localStorage.setItem('local_liquidations', JSON.stringify(updated));

    setSuccess('Acta de liquidación final registrada correctamente.');
    setSelectedLiq(newLiq);
    
    // Reset draft fields
    setTimeout(() => {
      setShowForm(false);
      setContractId('');
      setSelectedContract(null);
      setDescuentoDanios(0);
      setDescuentoServicios(0);
      setDescuentoArrendamientos(0);
      setDetalleDanios('');
      setSuccess('');
    }, 1000);
  };

  const filteredLiquidations = useMemo(() => {
    return liquidations.filter(l => 
      l.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.nombreArrendatario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.codigoPropiedad.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [liquidations, searchTerm]);

  return (
    <div className="space-y-6" id="liquidation-manager">

      {/* RENDER DYNAMIC PRINTABLE ACTA TEMPLATE */}
      {selectedLiq ? (
        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-gray-200 shadow-md max-w-4xl mx-auto space-y-6" id="printable-liquidation-card">
          
          <div className="flex justify-between items-center pb-4 border-b border-gray-100 no-print">
            <button
              onClick={() => setSelectedLiq(null)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors bg-white font-semibold"
            >
              <ArrowLeft size={14} /> Volver al Historial
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-colors font-semibold shadow-xs"
            >
              <Printer size={14} /> Imprimir Acta Final
            </button>
          </div>

          {/* PRINTABLE LEGAL DOCUMENT STRUCTURE */}
          <div className="p-8 sm:p-12 border border-slate-400 rounded-3xl bg-white relative font-sans space-y-8 text-xs text-gray-800 leading-relaxed">
            
            {/* Header Title */}
            <div className="text-center space-y-2 border-b border-slate-300 pb-6">
              <h1 className="text-sm font-bold tracking-widest text-slate-900 uppercase">ACTA DE LIQUIDACIÓN FINAL DE ARRENDAMIENTO</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">REINTEGRO DE FIANZA DE GARANTÍA Y ENTREGA DE LLAVES</p>
              <span className="text-[9px] font-mono bg-slate-100 px-2.5 py-1 rounded-sm text-slate-800 inline-block mt-2">
                RECONOCIMIENTO CONTRACTUAL COD: {selectedLiq.id}
              </span>
            </div>

            {/* General Clauses preamble */}
            <div className="space-y-3 font-sans text-justify">
              <p>
                En Tunja / Paipa, Boyacá, a los <strong>{new Date(selectedLiq.fechaLiquidacion).getDate()}</strong> días del mes de <strong>{new Date(selectedLiq.fechaLiquidacion).toLocaleDateString('es-CO', { month: 'long' })}</strong> de <strong>{new Date(selectedLiq.fechaLiquidacion).getFullYear()}</strong>, comparecen por una parte como ARRENDADOR lícito del predio, <strong>Manuel Antonio Arias Guerra</strong>, identificado con la C.C. {selectedLiq.id.startsWith('LIQ') ? '1.057.736.060' : 'Por Establecer'}, y de otra parte como ARRENDATARIO, el ciudadano <strong>{selectedLiq.nombreArrendatario}</strong> con Documento/Cédula número <strong>{selectedLiq.documentoArrendatario}</strong>.
              </p>
              <p>
                Las partes voluntariamente declaran que el Contrato de Arrendamiento civil sobre el inmueble unitario identificado internamente con el código de predio <strong>{selectedLiq.codigoPropiedad}</strong> ha finalizado satisfactoriamente, procediendo el Arrendador a recibir en conformidad física las llaves y posesión del inmueble arrendado y a realizar la correspondiente liquidación económica de cuentas y conceptos adeudados por el Arrendatario.
              </p>
            </div>

            {/* Financial balance computations */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-950 text-xs border-b border-slate-300 pb-1.5 uppercase font-sans">VALORACIÓN Y AUDITORÍA DE CONCEPTOS Y DEUDAS</h3>
              
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex justify-between items-center p-3 bg-slate-50 font-semibold text-slate-900">
                  <span>(-) Depósito de Fianza Constituido (Prohibido por Ley 820 de 2003)</span>
                  <span>{selectedLiq.depositoOriginal > 0 ? formatterCOP.format(selectedLiq.depositoOriginal) : 'No aplica (COP $0)'}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 text-red-700">
                  <span>Descuento por Daños e Imperfecciones Físicas</span>
                  <span>- {formatterCOP.format(selectedLiq.descuentoDanios)}</span>
                </div>

                <div className="flex justify-between items-center p-3 text-red-700">
                  <span>Descuento por Facturas de Servicios Públicos en mora</span>
                  <span>- {formatterCOP.format(selectedLiq.descuentoServicios)}</span>
                </div>

                <div className="flex justify-between items-center p-3 text-red-700">
                  <span>Descuento de Cánones / Días Prorrateados pendientes</span>
                  <span>- {formatterCOP.format(selectedLiq.descuentoArrendamientos)}</span>
                </div>

                <div className="flex justify-between items-center p-3 font-bold text-slate-950 bg-slate-100 text-xs uppercase">
                  <span>(=) Saldo Final {selectedLiq.montoNetoDevuelto >= 0 ? 'A Reintegrar (Favor Arrendatario)' : 'A Cobrar (Mora Arrendatario)'}</span>
                  <span className={selectedLiq.montoNetoDevuelto >= 0 ? 'text-emerald-700 font-extrabold' : 'text-rose-700 font-extrabold'}>
                    {formatterCOP.format(selectedLiq.montoNetoDevuelto)}
                  </span>
                </div>
              </div>
            </div>

            {/* Damage Details */}
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Especificaciones Detalladas del Desgaste/Daño</span>
              <p className="italic text-gray-700 leading-relaxed font-sans">{selectedLiq.detalleDanios}</p>
            </div>

            {/* Closing statements declarations */}
            <div className="text-justify font-sans text-[11px] text-gray-500 leading-relaxed border-t border-slate-200 pt-4">
              <p>
                Habiéndose liquidado las cuentas y canceladas las deudas mutuas derivadas de la relación contractual, las partes declaran haber finiquitado todo asunto pecuniario u obligación legal referida al mencionado contrato, quedando recíprocamente paz y salvo de modo absoluto por cualquier concepto y renunciando a posteriores reclamaciones. En constancia de mutuo acuerdo y lícita aceptación, firman este acta fin.
              </p>
            </div>

            {/* Signatures columns */}
            <div className="grid grid-cols-2 gap-12 pt-16">
              <div className="text-center space-y-1.5 flex flex-col justify-end items-center">
                <div className="border-t border-slate-300 w-full max-w-xs mt-10" />
                <span className="font-bold text-slate-900 block">{selectedLiq.nombreQuienLiquida}</span>
                <span className="text-[10px] text-gray-400 block uppercase">EL ARRENDADOR (Propietario)</span>
                <span className="text-[9px] font-mono text-gray-400 block">C.C. 1.057.736.060</span>
              </div>

              <div className="text-center space-y-1.5 flex flex-col justify-end items-center">
                <div className="border-t border-slate-300 w-full max-w-xs mt-10" />
                <span className="font-bold text-slate-900 block">{selectedLiq.nombreArrendatario}</span>
                <span className="text-[10px] text-gray-400 block uppercase">EL ARRENDATARIO (Inquilino)</span>
                <span className="text-[9px] font-mono text-gray-400 block">Documento: {selectedLiq.documentoArrendatario}</span>
              </div>
            </div>

          </div>

        </div>
      ) : (
        <>
          {/* Header Panel */}
          <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-gray-900 font-sans">Actas de Liquidación Final</h2>
              <p className="text-gray-500 text-xs mt-1">Check-out de inquilinos, devolución negociada de deudas de fianza y firmas de paz y salvo.</p>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shrink-0 font-sans"
              >
                <Plus size={14} /> Liquidar Contrato
              </button>
            )}
          </div>

          {/* New liquidation draft builder */}
          {showForm && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
                <h3 className="font-semibold text-sm text-gray-950 pb-2 border-b border-gray-100 mb-4">
                  Redactar Liquidación y Paz y Salvo Final
                </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3.5 rounded-xl text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="p-3.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-2">
                    <CheckCircle2 size={14} /> {success}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Elegir Contrato a Liquidar*</label>
                    <select
                      value={contractId}
                      onChange={(e) => handleContractSelect(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-sans"
                      required
                    >
                      <option value="">-- Seleccione Contrato Firmado --</option>
                      {contracts.map(c => {
                        const t = tenants.find(ten => ten.documento === c.tenantDocumento);
                        return (
                          <option key={c.id} value={c.id}>
                            [{c.codigoPropiedad}] {t?.nombre || c.tenantDocumento}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 font-mono">Fecha de Desocupación / Liquidación*</label>
                    <input
                      type="date"
                      value={fechaLiquidacion}
                      onChange={(e) => setFechaLiquidacion(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                {/* original fianza indicator */}
                {selectedContract && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1 bg-indigo-50/10">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-700">Regulación Inmobiliaria Colombiana (Ley 820/2003)</span>
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-semibold font-mono">
                        Predio: {selectedContract.codigoPropiedad}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-normal">
                      En Colombia, está prohibido pactar depósitos en efectivo en contratos de vivienda urbana. Por consiguiente, la fianza está establecida en <strong>COP $0</strong> y los conceptos que registre a continuación se consolidarán como una deuda o saldo a pagar por el inquilino.
                    </p>
                  </div>
                )}

                {/* Subtraction adjustments fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cobro Reparaciones / Daños ($ COP)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={descuentoDanios || ''}
                      onChange={(e) => setDescuentoDanios(Number(e.target.value))}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-semibold text-rose-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Mora de Servicios Públicos ($ COP)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={descuentoServicios || ''}
                      onChange={(e) => setDescuentoServicios(Number(e.target.value))}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-semibold text-rose-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cánones Prorrateados Mora ($ COP)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={descuentoArrendamientos || ''}
                      onChange={(e) => setDescuentoArrendamientos(Number(e.target.value))}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-semibold text-rose-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Anotaciones / Justificación de Daños o Descuentos</label>
                  <textarea
                    rows={2}
                    placeholder="Escriba aquí los detalles (Ej: Retención de $150.000 para reparar abolladura de puerta y resane de muros alcoba secundaria)"
                    value={detalleDanios}
                    onChange={(e) => setDetalleDanios(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-sans"
                  />
                </div>

                {/* live dynamic returned balance sum banner */}
                {selectedContract && (
                  <div className="p-4 rounded-xl border flex items-center justify-between text-xs bg-gray-50 border-gray-200">
                    <span className="font-semibold text-gray-700">
                      {liquidationCalculations.originalDeposit > 0 
                        ? 'Saldo Neto Estimado a Reintegrar:' 
                        : 'Monto Neto Total Pendiente por pagar (Inquilino):'}
                    </span>
                    <span className={`text-md font-extrabold ${liquidationCalculations.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatterCOP.format(Math.abs(liquidationCalculations.net))}
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); handleContractSelect(''); }}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors font-sans"
                  >
                    Generar Paz y Salvo
                  </button>
                </div>
              </form>
              </div>
            </div>
          )}

          {/* Historical Consultation Listing for subsequent lookups */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-3xs overflow-hidden font-sans">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
                <input
                  type="text"
                  placeholder="Consultar acta por ID o arrendatario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs pl-9 pr-4 py-2 w-full border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-sans"
                />
              </div>
            </div>

            {/* List Table of Liquidations */}
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100/40 border-b border-gray-200 text-gray-500 font-semibold font-sans">
                    <th className="p-4">Código Acta</th>
                    <th className="p-4">Arrendatario</th>
                    <th className="p-4">Predio</th>
                    <th className="p-4">Fecha Check-Out</th>
                    <th className="p-4">Fianza Custodiada</th>
                    <th className="p-4">Descuento Daños / Servicios</th>
                    <th className="p-4">Neto Reintegrado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredLiquidations.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-gray-900">{l.id}</td>
                      <td className="p-4 font-semibold text-gray-950">{l.nombreArrendatario}</td>
                      <td className="p-4">
                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-gray-800">
                          {l.codigoPropiedad}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-gray-500">{l.fechaLiquidacion}</td>
                      <td className="p-4 font-bold text-slate-800">{formatterCOP.format(l.depositoOriginal)}</td>
                      <td className="p-4 text-rose-700 font-medium">
                        -{formatterCOP.format(l.descuentoDanios + l.descuentoServicios + l.descuentoArrendamientos)}
                      </td>
                      <td className="p-4 font-extrabold text-indigo-950 bg-slate-50/50">
                        {formatterCOP.format(l.montoNetoDevuelto)}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedLiq(l)}
                          className="px-2.5 py-1.5 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-semibold rounded-lg transition-colors flex items-center gap-1 ml-auto"
                        >
                          <FileText size={12} /> Ver Acta Legal
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredLiquidations.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-gray-400">
                        <ShieldX size={32} className="mx-auto text-gray-200 mb-2" />
                        <span className="font-semibold block">Actas no encontradas</span>
                        <span className="text-[10px] text-gray-400">Los reintegros liquidados aparecerán registrados aquí.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
