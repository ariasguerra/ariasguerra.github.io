import React, { useState, useMemo } from 'react';
import { 
  Database, 
  RefreshCw, 
  Trash2, 
  Mail, 
  AlertTriangle, 
  Check, 
  Copy, 
  Send,
  CloudLightning,
  ShieldCheck
} from 'lucide-react';
import { Property, Tenant, Contract, Receipt, Expense, Incident } from '../types';

interface SyncManagerProps {
  properties: Property[];
  tenants: Tenant[];
  contracts: Contract[];
  receipts: Receipt[];
  expenses: Expense[];
  incidents: Incident[];
  onSyncLocalData: () => Promise<void>;
  onWipeDatabase: () => Promise<void>;
  syncingState: 'idle' | 'running' | 'success' | 'failed';
  syncStatusMsg: string;
  isDbConnected: boolean;
}

export default function SyncManager({
  properties,
  tenants,
  contracts,
  receipts,
  expenses,
  incidents,
  onSyncLocalData,
  onWipeDatabase,
  syncingState,
  syncStatusMsg,
  isDbConnected
}: SyncManagerProps) {
  const [recipientEmail, setRecipientEmail] = useState('arias.guerraa@gmail.com');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const formatterCOP = useMemo(() => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    });
  }, []);

  const stats = useMemo(() => {
    const totalProperties = properties.length;
    const occupied = properties.filter(p => p.estado === 'Arrendado').length;
    const occupancyRate = totalProperties ? Math.round((occupied / totalProperties) * 100) : 0;
    
    const totalIncomes = receipts.reduce((sum, r) => sum + r.montoPagado, 0);
    const totalOutcomes = expenses.reduce((sum, e) => sum + e.monto, 0);
    const netProfit = totalIncomes - totalOutcomes;
    
    const openTickets = incidents.filter(i => i.estado !== 'Resuelto').length;
    
    return {
      totalProperties,
      occupancyRate,
      totalIncomes,
      totalOutcomes,
      netProfit,
      openTickets,
      totalTenants: tenants.length
    };
  }, [properties, tenants, receipts, expenses, incidents]);

  const unsyncedCount = useMemo(() => {
    const localProps = properties.filter(p => !p.id || p.id.startsWith('prop_') || p.id.startsWith('prop_seed_')).length;
    const localTenants = tenants.filter(t => !t.id || t.id.startsWith('ten_') || t.id.startsWith('ten_seed_')).length;
    const localContracts = contracts.filter(c => !c.id || c.id.startsWith('con_')).length;
    const localReceipts = receipts.filter(r => !r.id || r.id.startsWith('rec_')).length;
    const localExpenses = expenses.filter(ex => !ex.id || ex.id.startsWith('exp_')).length;
    const localIncidents = incidents.filter(i => !i.id || i.id.startsWith('inc_')).length;
    return localProps + localTenants + localContracts + localReceipts + localExpenses + localIncidents;
  }, [properties, tenants, contracts, receipts, expenses, incidents]);

  const generatedEmailText = useMemo(() => {
    const lines = [
      `============================================================`,
      `REPORTE GENERAL DEL SISTEMA DE ARRENDAMIENTOS - ARIAS GUERRA`,
      `============================================================`,
      `Fecha de Reporte: ${new Date().toLocaleDateString('es-CO')}`,
      `Estado de Conectividad: ${isDbConnected ? 'CONECTADO FIRESTORE CLOUD' : 'MODO LOCAL OFFLINE'}`,
      ``,
      `--- RESUMEN FINANCIERO & METRICAS ---`,
      `- Inmuebles Registrados: ${stats.totalProperties}`,
      `- Tasa de Ocupación: ${stats.occupancyRate}%`,
      `- Arrendatarios Totales: ${stats.totalTenants}`,
      `- Recaudo Total de Cánones (Ingresos): ${formatterCOP.format(stats.totalIncomes)}`,
      `- Egresos Totales (Gasto/Mantenimiento): ${formatterCOP.format(stats.totalOutcomes)}`,
      `- Utilidad Neta Consolidada: ${formatterCOP.format(stats.netProfit)}`,
      `- Tickets de Reparación Activos: ${stats.openTickets}`,
      ``,
      `--- INMUEBLES Y UNIDADES ---`,
    ];

    properties.forEach((p, index) => {
      lines.push(`${index + 1}. Código: ${p.codigo} - Dirección: ${p.direccion} - Estado: ${p.estado} - Tipo: ${p.tipoArrendamiento}`);
      if (p.subPartes && p.subPartes.length > 0) {
        p.subPartes.forEach(sub => {
          lines.push(`   * [Unidad] Código: ${sub.codigo} - Nombre: ${sub.nombre} - Estado: ${sub.estado} - Tipo: ${sub.tipo}`);
        });
      }
    });

    lines.push(``);
    lines.push(`--- ARRENDATARIOS REGISTRADOS ---`);
    tenants.forEach((t) => {
      lines.push(`- Nombre: ${t.nombre} | Identificación: ${t.documento} | Teléfono: ${t.telefono} | Correo: ${t.email}`);
    });

    lines.push(``);
    lines.push(`--- CONTRATOS DE ARRENDAMIENTO ---`);
    contracts.forEach((c) => {
      lines.push(`- Código Inmueble: ${c.codigoPropiedad} | Inquilino Documento: ${c.tenantDocumento} | Canon: ${formatterCOP.format(c.montoCanon)} / mes | Periodo: ${c.periodoInicio} al ${c.periodoFin} | Estado: ${c.estado}`);
    });

    lines.push(``);
    lines.push(`Este informe fue auto-generado lícitamente por el Sistema de Administración Arias Guerra.`);
    lines.push(`Soporte e Infraestructura: ${properties[0]?.id || 'General DB'}`);
    return lines.join('\n');
  }, [properties, tenants, contracts, stats, isDbConnected, formatterCOP]);

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generatedEmailText);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3500);
  };

  const handleOpenEmailClient = () => {
    const subject = encodeURIComponent(`Resumen de Administración - Portafolio Arias Guerra (${new Date().toLocaleDateString()})`);
    const body = encodeURIComponent(generatedEmailText);
    const mailtoUrl = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div className="space-y-6" id="sync-manager-container">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 font-sans">Administración de Base de Datos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Aquí puede forzar la sincronización, limpiar bases de datos o redactar informes de email consolidados de forma lícita.
          </p>
        </div>
        <div className="flex gap-2 text-xs font-mono bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600">
          <span className="text-indigo-600">● Módulo Interno de Control</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Actions and Status Info */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Cloud Info card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <CloudLightning size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Estado de Cloud</h3>
                <p className="text-xs text-gray-400">Firebase Firestore Cloud</p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Estado de conexión:</span>
                <span className={`font-mono font-semibold ${isDbConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isDbConnected ? 'CONECTADO CLOUD' : 'SÓLO LOCAL / OFFLINE'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-sans">Registros Locales pendientes:</span>
                <span className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold ${unsyncedCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {unsyncedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Sync operations */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-sm border border-slate-800 space-y-4">
            <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
              <Database className="text-indigo-400" size={18} />
              Sincronizador
            </h3>

            <p className="text-slate-300 text-xs leading-relaxed">
              Fuerce la sincronización de sus registros de inmuebles, contratos y recibos con su servidor central en Google Firebase.
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={onSyncLocalData}
                disabled={syncingState === 'running'}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700/50 rounded-xl transition-all shadow-md cursor-pointer"
              >
                <RefreshCw size={14} className={syncingState === 'running' ? 'animate-spin' : ''} />
                {syncingState === 'running' ? 'Sincronizando...' : '⚡ Sincronizar mis Inmuebles'}
              </button>

              <button
                onClick={onWipeDatabase}
                disabled={syncingState === 'running'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[11px] font-bold text-rose-300 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/50 disabled:bg-slate-700/50 rounded-xl transition-all cursor-pointer"
                title="Borra todos los datos actuales del servidor y local para empezar completamente limpio"
              >
                <Trash2 size={13} />
                🧹 Restablecer Base de Datos
              </button>
            </div>

            {syncStatusMsg && (
              <div className={`p-3 rounded-xl text-xs font-medium border mt-4 ${
                syncingState === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : syncingState === 'failed' 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
              }`}>
                {syncStatusMsg}
              </div>
            )}

            {unsyncedCount > 0 ? (
              <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl mt-4">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 animate-pulse" />
                <span>
                  Hay <strong>{unsyncedCount} registros</strong> nuevos en tu navegador que no están guardados en la base de datos central de Firestore. Sincroniza ahora para asegurarlos.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl mt-4">
                <Check size={14} className="shrink-0" />
                <span>Todos sus datos locales se encuentran sincronizados correctamente con Firebase.</span>
              </div>
            )}
          </div>

          {/* Legal Guard Status */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-700 font-semibold mb-2">
              <ShieldCheck className="text-emerald-600" size={16} />
              Seguridad de Transmisión
            </div>
            <p className="text-[11px] text-gray-500 leading-normal">
              La conexión opera bajo protocolos TLS y utiliza las reglas de seguridad de Google Cloud Firestore para asegurar que sólo el titular lícito (Manuel Antonio Arias Guerra) pueda leer y escribir.
            </p>
          </div>

        </div>

        {/* Right Side: Detailed Portfolio Report and Personal Emailer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Mail className="text-indigo-600" size={18} />
                  Generador de Informes de Portafolio
                </h3>
                <p className="text-xs text-gray-500">
                  Genere una copia lícita y detallada en texto plano de todo su portafolio para guardar de forma externa o enviar a su correo personal.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5Packed">
                <label className="block text-xs font-semibold text-gray-700">Destinatario del reporte:</label>
                <div className="flex max-w-md gap-2">
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                  />
                  <button
                    onClick={handleOpenEmailClient}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <Send size={12} />
                    Enviar Correo
                  </button>
                </div>
              </div>

              {/* Textarea Report Preview */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-700">Vista preliminar del reporte (en texto plano):</span>
                  <button
                    onClick={handleCopyReport}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border rounded-lg transition-all ${
                      copiedSuccess 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                        : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    <Copy size={11} />
                    {copiedSuccess ? '¡Copiado al Portapapeles!' : 'Copiar Reporte'}
                  </button>
                </div>

                <textarea
                  value={generatedEmailText}
                  readOnly
                  className="w-full h-80 text-[11px] font-mono p-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 focus:outline-hidden resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
