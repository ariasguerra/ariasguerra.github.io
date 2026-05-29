import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Wrench, 
  CalendarClock,
  ArrowDownRight,
  Mail,
  Copy,
  Check
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Property, Tenant, Contract, Receipt, Expense, Incident, Alert } from '../types';

interface DashboardHomeProps {
  properties: Property[];
  tenants: Tenant[];
  contracts: Contract[];
  receipts: Receipt[];
  expenses: Expense[];
  incidents: Incident[];
  onNavigate: (tab: string) => void;
}

export default function DashboardHome({
  properties,
  tenants,
  contracts,
  receipts,
  expenses,
  incidents,
  onNavigate
}: DashboardHomeProps) {

  // Communication & Notification States for WhatsApp & Email
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [selectedAlertForNotify, setSelectedAlertForNotify] = useState<Alert | null>(null);
  const [notifyPhone, setNotifyPhone] = useState('3101234567');
  const [notifyEmail, setNotifyEmail] = useState('arrendador@ejemplo.com');
  const [notifyCopiedSuccess, setNotifyCopiedSuccess] = useState(false);
  const [copiedType, setCopiedType] = useState<'whatsapp' | 'email' | ''>('');

  // 1. Calculate General Statistics
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

  // 2. Generate Real-time Alerts for expirations & re-adjustments (Phase 2 constraint matching)
  const alerts: Alert[] = useMemo(() => {
    const list: Alert[] = [];
    const today = new Date();
    
    // Check contract expirations within 45 days
    contracts.forEach(c => {
      if (c.estado === 'Finalizado') return;
      if (!c.periodoFin || !c.periodoInicio) return;
      
      const endDate = new Date(c.periodoFin);
      if (isNaN(endDate.getTime())) return;
      const timeDiff = endDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      const prop = properties.find(p => p.codigo === c.codigoPropiedad);
      const tenant = tenants.find(t => t.documento === c.tenantDocumento);
      const descName = tenant ? tenant.nombre : `Doc: ${c.tenantDocumento}`;
      const address = prop ? prop.direccion.split(',')[0] : `Inmueble: ${c.codigoPropiedad}`;
      const phone = tenant?.telefono || '3101234567';
      const email = tenant?.email || 'arrendador@ejemplo.com';

      if (daysDiff < 0) {
        list.push({
          tipo: 'vencimiento',
          titulo: 'Contrato Vencido ⚠️',
          descripcion: `Contrato de ${descName} en ${address} venció el ${c.periodoFin}. Requiere una firma de prórroga o entrega de llaves formal.`,
          fecha: c.periodoFin,
          nivel: 'urgente',
          objetoId: c.id,
          tenantName: descName,
          phone,
          email,
          propertyName: address,
          montoCanon: c.montoCanon,
          contract: c
        });
      } else if (daysDiff <= 45) {
        list.push({
          tipo: 'vencimiento',
          titulo: `Vencimiento Cercano (${daysDiff} días)`,
          descripcion: `Contrato de ${descName} en ${address} finaliza en ${daysDiff} días (${c.periodoFin}).`,
          fecha: c.periodoFin,
          nivel: daysDiff <= 15 ? 'urgente' : 'advertencia',
          objetoId: c.id,
          tenantName: descName,
          phone,
          email,
          propertyName: address,
          montoCanon: c.montoCanon,
          contract: c
        });
      }
      // NEW: CRITICAL 3-MONTH EXPIRATION LEGAL WINDOW (Ley 820 of 2003 - pre-notice required between 90 and 110 days)
      else if (daysDiff >= 90 && daysDiff <= 110) {
        list.push({
          tipo: 'vencimiento',
          titulo: 'Preaviso No Prórroga (De ley 3 Meses)',
          descripcion: `Ventana límite legal para el contrato de ${descName}. Expira en ${daysDiff} días. Debe notificar por escrito la NO renovación al inquilino con 3 meses de anticipación.`,
          fecha: c.periodoFin,
          nivel: 'urgente',
          objetoId: c.id,
          tenantName: descName,
          phone,
          email,
          propertyName: address,
          montoCanon: c.montoCanon,
          contract: c
        });
      }

      // Check Rent Re-adjustment warning (if the contract has been running for almost a year or is active)
      const startDate = new Date(c.periodoInicio);
      if (isNaN(startDate.getTime())) return;
      const monthsActive = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth());
      if (monthsActive > 0 && monthsActive % 12 === 11) {
        list.push({
          tipo: 'reajuste',
          titulo: 'Alerta Incremento Anual (1 Mes)',
          descripcion: `Se acerca el aniversario de contrato de ${descName} en ${address}. La ley colombiana exige notificar el aumento del canon indexado al IPC 30 días antes del cobro.`,
          fecha: 'Próxima facturación',
          nivel: 'advertencia',
          objetoId: c.id,
          tenantName: descName,
          phone,
          email,
          propertyName: address,
          montoCanon: c.montoCanon,
          contract: c
        });
      }

      // NEW: Monthly rent payment collection reminder (first 10 days of the month)
      if (today.getDate() <= 10 && c.estado === 'Vigente') {
        list.push({
          tipo: 'impago',
          titulo: 'Recordatorio Mensual de Pago (Canon)',
          descripcion: `Primeros días del mes en curso. Genere un cobro preventivo a ${descName} (${address}) por el valor de ${formatterCOP.format(c.montoCanon)}.`,
          fecha: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-05`,
          nivel: 'info',
          objetoId: c.id,
          tenantName: descName,
          phone,
          email,
          propertyName: address,
          montoCanon: c.montoCanon,
          contract: c
        });
      }
    });

    // Check high priority open incidents
    incidents.forEach(inc => {
      if (inc.estado !== 'Resuelto' && inc.prioridad === 'Alta') {
        const prop = properties.find(p => p.codigo === inc.codigoPropiedad);
        const address = prop ? prop.direccion.split(',')[0] : `Inmueble: ${inc.codigoPropiedad}`;
        list.push({
          tipo: 'mantenimiento',
          titulo: 'Reparación Urgente',
          descripcion: `Incidente reportado en ${address}: ${inc.descripcion}`,
          fecha: inc.fechaReporte,
          nivel: 'urgente',
          objetoId: inc.id,
          propertyName: address
        });
      }
    });

    return list;
  }, [contracts, properties, tenants, incidents]);

  // 3. Format Chart Data: Income vs Expenses by month
  const chartData = useMemo(() => {
    // Collect last 5 months
    const months = ['01', '02', '03', '04', '05', '06'];
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'];
    
    return months.map((m, idx) => {
      const year = '2026'; // Year of seed data
      const monthStr = `${year}-${m}`;
      
      const monthlyIncome = receipts
        .filter(r => r.fechaPago && r.fechaPago.startsWith(monthStr))
        .reduce((sum, r) => sum + r.montoPagado, 0);
        
      const monthlyExpense = expenses
        .filter(e => e.fecha && e.fecha.startsWith(monthStr))
        .reduce((sum, e) => sum + e.monto, 0);
        
      return {
        name: monthNames[idx],
        Ingresos: monthlyIncome,
        Egresos: monthlyExpense,
        Balance: monthlyIncome - monthlyExpense
      };
    });
  }, [receipts, expenses]);

  // Pie chart data for expenses
  const pieData = useMemo(() => {
    const categories: { [key: string]: number } = {
      'Impuesto': 0,
      'Servicio Público': 0,
      'Seguro de Arrendamiento': 0,
      'Reparación/Mantenimiento': 0,
      'Otro': 0
    };
    expenses.forEach(e => {
      if (categories[e.tipoGasto] !== undefined) {
        categories[e.tipoGasto] += e.monto;
      } else {
        categories['Otro'] += e.monto;
      }
    });

    return Object.keys(categories)
      .map(name => ({ name, value: categories[name] }))
      .filter(item => item.value > 0);
  }, [expenses]);

  const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#6b7280'];

  const formatterCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });

  // Helper to open the notification modal
  const handleOpenNotifyModal = (al: Alert) => {
    setSelectedAlertForNotify(al);
    setNotifyPhone(al.phone || '3101234567');
    setNotifyEmail(al.email || 'arrendador@ejemplo.com');
    setShowNotifyModal(true);
  };

  // Memoized templates based on selected alert
  const notifyTemplates = useMemo(() => {
    if (!selectedAlertForNotify) return { subject: '', body: '', whatsappText: '' };
    
    const al = selectedAlertForNotify;
    const name = al.tenantName || 'Estimado Arrendatario';
    const address = al.propertyName || 'el inmueble arrendado';
    const dateFin = al.contract?.periodoFin || 'la fecha pactada';
    const rentAmount = al.montoCanon ? formatterCOP.format(al.montoCanon) : 'el canon mensual';
    
    // Colombian typical IPC calculation details (defaults to 5.5% if not present)
    const defaultIPC = 5.5;
    const multiplier = al.contract?.reajusteAnualPercent !== undefined && al.contract.reajusteAnualPercent > 0
      ? al.contract.reajusteAnualPercent
      : defaultIPC;
    const calculatedIncrease = al.contract?.montoCanon 
      ? Math.round(al.contract.montoCanon * (multiplier / 100))
      : 0;
    const newRent = al.contract?.montoCanon
      ? Math.round(al.contract.montoCanon + calculatedIncrease)
      : 0;

    let subject = '';
    let body = '';
    let whatsappText = '';

    if (al.titulo.includes('No Prórroga') || al.titulo.includes('No Renovación')) {
      subject = `Notificación Oficial de No Prórroga de Contrato de Arrendamiento - ${address}`;
      body = `Tunja / Paipa, Boyacá\n\nSeñor(a):\n${name}\nInmueble: ${address}\n\nAsunto: NOTIFICACIÓN DE NO RENOVACIÓN DE CONTRATO DE ARRENDAMIENTO (LEY 820 DE 2003)\n\nRespetado(a) arrendatario(a),\n\nDe manera formal y de acuerdo con lo establecido en el Artículo 22 (Numeral 8) de la Ley 820 de 2003 y con la anticipación legal obligatoria de tres (3) meses, le notifico por medio de este escrito mi decisión unilateral de NO RENOVAR ni prorrogar el contrato de arrendamiento celebrado sobre el inmueble ubicado en la dirección ${address}.\n\nPor consiguiente, el contrato finalizará formalmente el día ${dateFin}, fecha en la cual procederemos con la entrega física del inmueble mediante el acta de liquidación de mutuo acuerdo.\n\nLe ruego coordinar oportunamente para la desocupación pacífica y resolver cualquier concepto económico pendiente.\n\nAtentamente,\n\nPropietario / Arrendador\nContacto de Arrendamiento`;
      
      whatsappText = `*Estimado(a) ${name},*\n\nLe saluda cordialmente el Arrendador.\n\nDe conformidad con la *Ley 820 de 2003 (Artículo 22, Numeral 8)* y con la anticipación de ley de *tres (3) meses*, le informo formalmente que *NO* se renovará el contrato de arrendamiento del inmueble en *${address}*, cuya fecha de terminación es el próximo *${dateFin}*.\n\nLe agradezco coordinar con anticipación para realizar la entrega a conformidad física y formal.\n\nAtentamente,\n*El Arrendador*`;
    } 
    else if (al.tipo === 'reajuste' || al.titulo.includes('Incremento') || al.titulo.includes('IPC')) {
      subject = `Notificación de Reajuste Anual del Canon de Arrendamiento - ${address}`;
      body = `Señor(a):\n${name}\nInmueble: ${address}\n\nAsunto: COMUNICACIÓN DE REAJUSTE ANUAL DE CANON DE ARRENDAMIENTO (LEY 820 DE 2003)\n\nRespetado(a) arrendatario(a),\n\nDe conformidad con los términos fijados en nuestro contrato y en estricto cumplimiento del Artículo 20 de la Ley 820 de 2003 de Colombia, le comunico formalmente por medio de este escrito el ajuste en el valor del canon mensual de arrendamiento.\n\nEl porcentaje de incremento aplicado en este aniversario corresponde al ${multiplier}% (asociado a la variación anual del IPC de Colombia o al pacto legítimo de partes):\n\n- Canon Mensual Anterior: ${rentAmount}\n- Ajuste Aplicado: ${multiplier}%\n- Monto de Reajuste: ${formatterCOP.format(calculatedIncrease)}\n- NUEVO CANON MENSUAL: ${formatterCOP.format(newRent)}\n\nEste reajuste rige a partir de su próxima mensualidad de arrendamiento. Le agradezco efectuar sus consignaciones correspondientes por este nuevo valor.\n\nAtentamente,\n\nPropietario / Arrendador`;
      
      whatsappText = `*Estimado(a) ${name},*\n\nLe saluda el Arrendador.\n\nDe acuerdo con la *Ley 820 de 2003 (Artículo 20)*, le informo el aumento del valor mensual de su arrendamiento para el inmueble en *${address}* por reajuste anual de ley:\n\n- Canon Anterior: *${rentAmount}*\n- Ajuste aplicado (*IPC*): *${multiplier}%*\n- *NUEVO CANON MENSUAL: ${formatterCOP.format(newRent)}*\n\nEste nuevo monto rige formalmente a partir de la próxima facturación mensual.\n\nAtentamente,\n*El Arrendador*`;
    } 
    else if (al.tipo === 'impago' || al.titulo.includes('Recordatorio') || al.titulo.includes('Pago')) {
      subject = `Recordatorio Oportuno del Canon de Arrendamiento - ${address}`;
      body = `Cordial saludo, estimado(a) ${name},\n\nEspero que se encuentre excelente.\n\nLe escribo amablemente para recordarle que nos encontramos en el periodo acordado para realizar la cancelación mensual del canon de arrendamiento del inmueble en ${address}.\n\nCanon de Arrendamiento: ${rentAmount}\n\nLe sugiero realizar la transferencia a la cuenta habitual y remitir el respectivo comprobante a mi correo o WhatsApp para poder generarle formalmente su Recibo de Facturación y cargarlo en custodia.\n\nMuchas gracias por su habitual compromiso y puntualidad.\n\nAtentamente,\n\nPropietario / Arrendador`;
      
      whatsappText = `*Hola ${name},* espero te encuentres muy bien.\n\nTe escribo amistosamente para recordarte que nos encontramos en los días hábiles para el pago regular del arrendamiento en *${address}* por valor de *${rentAmount}*.\n\nPor favor, envíame tu soporte de consignación en cuanto lo realices para expedirte el Recibo de Pago Oficial hoy mismo. ¡Muchísimas gracias por tu puntualidad! 😊`;
    } 
    else {
      subject = `Aviso Administrativo Importante de Arrendamiento - ${address}`;
      body = `Estimado(a) ${name},\n\nLe escribo en calidad de arrendador del predio en ${address} para lo siguiente:\n\nDetalle del aviso: ${al.descripcion}\n\nAgradezco de antemano su atención o contacto directo para coordinar al respecto.\n\nAtentamente,\n\nPropietario / Arrendador`;
      
      whatsappText = `*Estimado(a) ${name},*\n\nLe escribo respecto al inmueble en *${address}* para coordinar el siguiente asunto:\n\n_${al.descripcion}_\n\nAgradezco me confirme cuando pueda leer este aviso para coordinar. Un saludo.\n\n*El Arrendador*`;
    }

    return { subject, body, whatsappText };
  }, [selectedAlertForNotify, formatterCOP]);

  const handleCopyNotifyMsg = (type: 'whatsapp' | 'email') => {
    const text = type === 'whatsapp' ? notifyTemplates.whatsappText : notifyTemplates.body;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setNotifyCopiedSuccess(true);
    setTimeout(() => {
      setNotifyCopiedSuccess(false);
      setCopiedType('');
    }, 3000);
  };

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 font-sans">Panel de Control General</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestión inteligente de inmuebles, cánones de arrendamiento y finanzas.
          </p>
        </div>
        <div className="flex gap-2 text-xs font-mono bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600">
          <span className="text-emerald-500">● Sistema Activo</span>
          <span className="text-gray-300">|</span>
          <span>Fecha: 25 May, 2026</span>
        </div>
      </div>



      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Occupancy Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs hover:shadow-xs transition-shadow flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Ocupación Inmuebles</span>
            <span className="text-3xl font-bold text-gray-950 block">{stats.occupancyRate}%</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">
                {properties.filter(p => p.estado === 'Arrendado').length} Alquilados
              </span>
              <span className="text-xs text-gray-400">{properties.filter(p => p.estado === 'Disponible').length} Libres</span>
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Building2 size={22} />
          </div>
        </div>

        {/* Total Collections Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs hover:shadow-xs transition-shadow flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Recaudo Canónes (Ingresos)</span>
            <span className="text-3xl font-bold text-gray-950 block">{formatterCOP.format(stats.totalIncomes)}</span>
            <div className="flex items-center gap-1.5 mt-1 text-emerald-600">
              <TrendingUp size={14} />
              <span className="text-xs font-medium">Historial completo</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign size={22} />
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs hover:shadow-xs transition-shadow flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Gasto de Mantenimiento / Impuestos</span>
            <span className="text-3xl font-bold text-gray-950 block">{formatterCOP.format(stats.totalOutcomes)}</span>
            <div className="flex items-center gap-1.5 mt-1 text-red-600">
              <ArrowDownRight size={14} />
              <span className="text-xs font-medium">{expenses.length} Transacciones</span>
            </div>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ArrowDownRight size={22} />
          </div>
        </div>

        {/* Incidents Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs hover:shadow-xs transition-shadow flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Tickets Activos</span>
            <span className="text-3xl font-bold text-gray-950 block">{stats.openTickets}</span>
            <div className="flex items-center gap-1.5 mt-1 text-amber-600">
              <Wrench size={14} />
              <span className="text-xs font-medium">Reparaciones en cola</span>
            </div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle size={22} />
          </div>
        </div>

      </div>

      {/* Main Stats Graphs & Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Financial Flow Chart */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Flujo Financiero Mensual (2026)</h3>
              <p className="text-xs text-gray-500">Comparativa de recaudos de cánones frente a egresos pagados</p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
              Utilidad Neta: {formatterCOP.format(stats.netProfit)}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                <Tooltip 
                  formatter={(value) => [formatterCOP.format(Number(value)), '']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }} 
                />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic Alerts Sidebar */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex flex-col h-full space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-950 text-sm flex items-center gap-1.5">
                <CalendarClock className="text-indigo-600" size={16} />
                Alertas Automáticas
              </h3>
              <p className="text-xs text-gray-500">Vencimientos y reajustes sugeridos</p>
            </div>
            <span className="text-xs text-gray-500 font-mono font-medium bg-gray-50 px-2 py-0.5 rounded-sm">
              {alerts.length}
            </span>
          </div>

          {/* Alert Cards Container */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-64 lg:max-h-none">
            {alerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-8">
                <FileText size={32} strokeWidth={1.5} className="mb-2 text-gray-300" />
                <span className="text-xs">Sin alertas vigentes</span>
                <span className="text-[10px] text-gray-400 mt-1">Todos los inmuebles al día</span>
              </div>
            ) : (
              alerts.map((al, idx) => (
                <div 
                  key={idx} 
                  className={`p-3.5 rounded-xl border text-xs flex gap-3 ${
                    al.nivel === 'urgente' 
                      ? 'bg-rose-50 border-rose-100' 
                      : al.nivel === 'advertencia' 
                      ? 'bg-amber-50 border-amber-100' 
                      : 'bg-indigo-50 border-indigo-100'
                  }`}
                >
                  <div className="mt-0.5">
                    {al.tipo === 'vencimiento' && <CalendarClock size={16} className={al.nivel === 'urgente' ? 'text-rose-600' : 'text-amber-600'} />}
                    {al.tipo === 'reajuste' && <TrendingUp size={16} className="text-indigo-600" />}
                    {al.tipo === 'mantenimiento' && <Wrench size={16} className="text-rose-600" />}
                  </div>
                  <div className="space-y-1">
                    <span className={`font-semibold block ${
                      al.nivel === 'urgente' 
                        ? 'text-rose-900' 
                        : al.nivel === 'advertencia' 
                        ? 'text-amber-950' 
                        : 'text-indigo-900'
                    }`}>
                      {al.titulo}
                    </span>
                    <p className="text-gray-600 leading-normal text-[11px]">
                      {al.descripcion}
                    </p>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[10px] text-gray-400 block">Vence/Aplica: {al.fecha}</span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => onNavigate('contracts')} 
                          className="text-[10px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                        >
                          Gestionar
                        </button>
                        {(al.phone || al.email || al.tipo === 'impago' || al.tipo === 'reajuste') && (
                          <button 
                            onClick={() => handleOpenNotifyModal(al)} 
                            className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer flex items-center gap-0.5"
                          >
                            <span>•</span> Notificar 📲
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Expense Pie Analysis and Quick shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Outcomes breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Distribución de Gastos (Egresos)</h3>
            <p className="text-xs text-gray-500">Separado por conceptos de impuestos, seguros, servicios y reparaciones</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-44 w-1/2 min-w-[150px]">
              {pieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-xs text-gray-400">
                  Sin egresos registrados
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatterCOP.format(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex-1 w-full space-y-2">
              {pieData.length === 0 ? null : (
                pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-gray-600 font-medium">{entry.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{formatterCOP.format(entry.value)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Real Estate Admin Shortcuts / Quick Actions */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Accesos Rápidos</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Herramientas directas para la administración diaria del portafolio inmobiliario y generación de comprobantes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-5 border-t border-gray-100 mt-6">
            <button 
              onClick={() => onNavigate('receipts')} 
              className="px-4 py-2.5 text-xs font-semibold text-center text-white bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-xl font-sans cursor-pointer"
            >
              Emitir Recibo
            </button>
            <button 
              onClick={() => onNavigate('liquidations')} 
              className="px-4 py-2.5 text-xs font-semibold text-center text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors rounded-xl font-sans cursor-pointer"
            >
              Acta de Liquidación
            </button>
          </div>
        </div>

      </div>



      {/* DETAILED COMMUNICATIONS & LEGAL NOTICE DISPATCHER (WhatsApp & Email) */}
      {showNotifyModal && selectedAlertForNotify && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
            
            {/* Header */}
            <div className="pb-3 border-b border-gray-100 mb-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl">📲</span>
                <div>
                  <h3 className="font-bold text-sm text-gray-950">Centro de Mensajería & Notificaciones Legales</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Plantillas redactadas conforme a la Regulación Inmobiliaria Colombiana (Ley 820 de 2003)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNotifyModal(false);
                  setSelectedAlertForNotify(null);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 px-2 py-1 rounded cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            {/* Recipients Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150 mb-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Celular / WhatsApp Destinatario</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs">📞</span>
                  <input
                    type="text"
                    placeholder="Ej: 3101234567"
                    value={notifyPhone}
                    onChange={(e) => setNotifyPhone(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-900 font-semibold focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <span className="text-[9px] text-gray-400 block mt-0.5">Se abrirá chat directo en WhatsApp.</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Correo Electrónico Destinatario</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs">📧</span>
                  <input
                    type="email"
                    placeholder="Ej: inquilino@gmail.com"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-900 font-semibold focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <span className="text-[9px] text-gray-400 block mt-0.5">Utilizado para generar la carta formal de preaviso.</span>
              </div>
            </div>

            {/* Templates grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* WhatsApp Block */}
              <div className="space-y-2 border border-emerald-100 rounded-xl p-4 bg-emerald-50/10 flex flex-col h-full">
                <div className="flex justify-between items-center pb-2 border-b border-emerald-50">
                  <span className="font-bold text-xs text-emerald-800 flex items-center gap-1">
                    <span className="text-emerald-500">🟢</span> Canal WhatsApp (Directo y Amigable)
                  </span>
                  <button
                    onClick={() => handleCopyNotifyMsg('whatsapp')}
                    className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded-md cursor-pointer inline-flex items-center gap-1"
                  >
                    <Copy size={10} /> Copiar Mensaje
                  </button>
                </div>
                
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-400 mb-1">Mensaje listo para enviar:</label>
                  <pre className="w-full text-[11px] h-52 p-3 font-mono bg-slate-50 border border-slate-200 rounded-lg overflow-y-auto whitespace-pre-wrap text-emerald-950 scrollbar-thin">
                    {notifyTemplates.whatsappText}
                  </pre>
                </div>

                <div className="pt-2">
                  <a
                    href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(notifyPhone.replace(/\D/g, ''))}&text=${encodeURIComponent(notifyTemplates.whatsappText)}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all text-center cursor-pointer"
                  >
                    📲 Abrir WhatsApp Web
                  </a>
                </div>
              </div>

              {/* Email Block */}
              <div className="space-y-2 border border-indigo-100 rounded-xl p-4 bg-indigo-50/10 flex flex-col h-full">
                <div className="flex justify-between items-center pb-2 border-b border-indigo-50">
                  <span className="font-bold text-xs text-indigo-800 flex items-center gap-1">
                    <span className="text-indigo-400">🔵</span> Carta Formal de Ley (Email / PDF)
                  </span>
                  <button
                    onClick={() => handleCopyNotifyMsg('email')}
                    className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-2.5 py-1 rounded-md cursor-pointer inline-flex items-center gap-1"
                  >
                    <Copy size={10} /> Copiar Carta
                  </button>
                </div>

                <div className="flex-1">
                  <label className="block text-[10px] text-slate-400 mb-1">Asunto: <span className="font-semibold text-slate-700">{notifyTemplates.subject}</span></label>
                  <pre className="w-full text-[10px] h-44 p-3 font-mono bg-slate-50 border border-slate-200 rounded-lg overflow-y-auto whitespace-pre text-indigo-950 scrollbar-thin">
                    {notifyTemplates.body}
                  </pre>
                </div>

                <div className="pt-2">
                  <a
                    href={`mailto:${encodeURIComponent(notifyEmail)}?subject=${encodeURIComponent(notifyTemplates.subject)}&body=${encodeURIComponent(notifyTemplates.body)}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all text-center cursor-pointer"
                  >
                    📧 Redactar en mi Email
                  </a>
                </div>
              </div>

            </div>

            {/* Copy Feedback status */}
            {notifyCopiedSuccess && (
              <div className="p-2 sm:p-2.5 rounded-lg text-center text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center gap-1.5 mt-4">
                <Check size={14} className="text-emerald-500" /> ¡Texto de {copiedType === 'whatsapp' ? 'WhatsApp' : 'Correo'} copiado al portapapeles con éxito!
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
