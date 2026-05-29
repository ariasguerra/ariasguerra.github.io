import React, { useState, useMemo } from 'react';
import { FileText, Plus, Search, Printer, Receipt as ReceiptIcon, Calendar, CheckCircle2, CircleDollarSign, ArrowLeft, Mail, Share2, Download, Trash2 } from 'lucide-react';
import { Receipt, Contract, Property, Tenant } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ReceiptManagerProps {
  receipts: Receipt[];
  contracts: Contract[];
  properties: Property[];
  tenants: Tenant[];
  onAdd: (r: Receipt) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const numeroALetras = (numero: number): string => {
  const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const decenas = ['diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const centenas = ['ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  
  if (numero === 0) return 'cero';
  if (numero === 10) return 'diez';
  if (numero === 11) return 'once';
  if (numero === 12) return 'doce';
  if (numero === 13) return 'trece';
  if (numero === 14) return 'catorce';
  if (numero === 15) return 'quince';
  if (numero < 20) return 'dieci' + unidades[numero - 10];
  if (numero === 20) return 'veinte';
  if (numero < 30) return 'veinti' + unidades[numero - 20];
  if (numero < 100) {
    const unidad = numero % 10;
    const decena = Math.floor(numero / 10) - 1;
    return decenas[decena] + (unidad ? ' y ' + unidades[unidad] : '');
  }
  if (numero < 1000) {
    const centena = Math.floor(numero / 100);
    const resto = numero % 100;
    return (numero === 100 ? 'cien' : centenas[centena - 1]) + (resto ? ' ' + numeroALetras(resto) : '');
  }
  if (numero < 1000000) {
    const miles = Math.floor(numero / 1000);
    const resto = numero % 1000;
    return (miles === 1 ? 'mil' : numeroALetras(miles) + ' mil') + (resto ? ' ' + numeroALetras(resto) : '');
  }
  // Para millones de pesos
  if (numero < 1000000000) {
    const millones = Math.floor(numero / 1000000);
    const resto = numero % 1000000;
    const millonText = millones === 1 ? 'un millón' : numeroALetras(millones) + ' millones';
    return millonText + (resto ? ' ' + numeroALetras(resto) : '');
  }
  return numero.toString();
};

const formatearFecha = (fechaStr: string): string => {
  if (!fechaStr) return '';
  try {
    const dateObj = new Date(fechaStr + 'T12:00:00');
    const opciones: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return dateObj.toLocaleDateString('es-CO', opciones);
  } catch (e) {
    return fechaStr;
  }
};

export default function ReceiptManager({
  receipts,
  contracts,
  properties,
  tenants,
  onAdd,
  onDelete
}: ReceiptManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Form Fields for new receipt
  const [contractId, setContractId] = useState('');
  const [numeroRecibo, setNumeroRecibo] = useState('');
  const [lugarExpedicion, setLugarExpedicion] = useState('Bogotá D.C.');
  const [fechaExpedicion, setFechaExpedicion] = useState(new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }));
  const [montoPagado, setMontoPagado] = useState<number>(0);
  const [montoEnLetras, setMontoEnLetras] = useState('');
  const [formaPago, setFormaPago] = useState('Consignación bancaria');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [horaPago, setHoraPago] = useState('12:00');
  const [concepto, setConcepto] = useState('Canon de arrendamiento');
  
  // These are derived from selected contract/user manually
  const [nombreArrendatario, setNombreArrendatario] = useState('');
  const [documentoArrendatario, setDocumentoArrendatario] = useState('');
  const [telefonoArrendatario, setTelefonoArrendatario] = useState('');
  const [emailArrendatario, setEmailArrendatario] = useState('');
  const [direccionInmueble, setDireccionInmueble] = useState('');
  const [parteArrendada, setParteArrendada] = useState('');
  const [subParteId, setSubParteId] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFin, setPeriodoFin] = useState('');
  
  const [nombreQuienRecibe, setNombreQuienRecibe] = useState('Arrendador / Administrador');
  const [cedulaQuienRecibe, setCedulaQuienRecibe] = useState('1.057.736.060');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState('');

  const formatterCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });

  // When continuous contract is selected, auto-fill all real estate details instantly
  const handleContractChange = (cId: string) => {
    setContractId(cId);
    if (!cId) return;

    const con = contracts.find(c => c.id === cId);
    if (!con) return;

    const prop = properties.find(p => p.codigo === con.codigoPropiedad);
    const tenant = tenants.find(t => t.documento === con.tenantDocumento);

    if (tenant) {
      setNombreArrendatario(tenant.nombre);
      setDocumentoArrendatario(tenant.documento);
      setTelefonoArrendatario(tenant.telefono);
      setEmailArrendatario(tenant.email);
    }

    setSubParteId(con.subParteId || '');

    if (prop) {
      setDireccionInmueble(prop.direccion);
      const leaseSubPart = prop.subPartes?.find(sub => sub.id === con.subParteId);
      if (leaseSubPart) {
        const subLabel = leaseSubPart.tipo === 'apartamento' ? 'apartamento' :
                         leaseSubPart.tipo === 'piso' ? 'piso/planta' :
                         leaseSubPart.tipo === 'habitacion' ? 'habitación' :
                         leaseSubPart.tipo === 'garaje' ? 'garaje' :
                         leaseSubPart.tipo === 'zona_comun' ? 'área común' : 'espacio/otro';
        setParteArrendada(`${prop.parteArrendada} (Unidad: ${leaseSubPart.nombre}, tipo ${subLabel}${leaseSubPart.accesoZonasComunes ? ' con acceso a áreas comunes' : ''})`);
      } else {
        setParteArrendada(prop.parteArrendada);
      }
    }

    setMontoPagado(con.montoCanon);

    // Smart Period Auto-increment from previous receipts
    const propReceipts = receipts.filter(r => 
      r.direccionInmueble === prop?.direccion || 
      r.numeroRecibo.startsWith(con.codigoPropiedad)
    );

    if (propReceipts.length > 0) {
      // Find the latest receipt based on periodoFin date
      const sortedPrev = [...propReceipts].sort((a, b) => {
        const timeA = a.periodoFin ? new Date(a.periodoFin).getTime() : 0;
        const timeB = b.periodoFin ? new Date(b.periodoFin).getTime() : 0;
        return timeB - timeA;
      });
      const latestReceipt = sortedPrev[0];

      if (latestReceipt && latestReceipt.periodoFin) {
        try {
          const prevFin = new Date(latestReceipt.periodoFin + 'T12:00:00');
          const nextInicio = new Date(prevFin);
          nextInicio.setDate(prevFin.getDate() + 1);

          const nextFin = new Date(nextInicio);
          nextFin.setMonth(nextInicio.getMonth() + 1);
          nextFin.setDate(nextFin.getDate() - 1);

          setPeriodoInicio(nextInicio.toISOString().split('T')[0]);
          setPeriodoFin(nextFin.toISOString().split('T')[0]);
        } catch (e) {
          setPeriodoInicio(con.periodoInicio);
          setPeriodoFin(con.periodoFin);
        }
      } else {
        setPeriodoInicio(con.periodoInicio);
        setPeriodoFin(con.periodoFin);
      }
    } else {
      setPeriodoInicio(con.periodoInicio);
      setPeriodoFin(con.periodoFin);
    }

    // Auto-generate recipe code based on property code and max suffix serial number
    const propertyReceipts = receipts.filter(r => r.numeroRecibo.startsWith(con.codigoPropiedad));
    let nextNum = 1;
    if (propertyReceipts.length > 0) {
      const numbers = propertyReceipts.map(r => {
        const suffix = r.numeroRecibo.slice(-3);
        const parsed = parseInt(suffix);
        return isNaN(parsed) ? 0 : parsed;
      });
      nextNum = Math.max(...numbers) + 1;
    }
    const paddedCount = String(nextNum).padStart(3, '0');
    setNumeroRecibo(`${con.codigoPropiedad}2026${paddedCount}`);

    // Conversion to words
    const words = translateNumberToWords(con.montoCanon);
    setMontoEnLetras(words);
  };

  const translateNumberToWords = (num: number): string => {
    const words = numeroALetras(num);
    if (!words) return '';
    const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
    return capitalized + ' pesos M/CTE';
  };

  const handleReset = () => {
    setContractId('');
    setNumeroRecibo('');
    setMontoPagado(0);
    setMontoEnLetras('');
    setNombreArrendatario('');
    setDocumentoArrendatario('');
    setTelefonoArrendatario('');
    setEmailArrendatario('');
    setDireccionInmueble('');
    setParteArrendada('');
    setSubParteId('');
    setPeriodoInicio('');
    setPeriodoFin('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroRecibo || !nombreArrendatario || montoPagado <= 0 || !direccionInmueble) {
      setError('Por favor complete todos los campos obligatorios.');
      return;
    }

    setLoading(true);
    setError('');

    const newReceipt: Receipt = {
      numeroRecibo: numeroRecibo.trim().toUpperCase(),
      lugarExpedicion,
      fechaExpedicion,
      nombreArrendatario,
      documentoArrendatario,
      telefonoArrendatario,
      emailArrendatario,
      montoPagado: Number(montoPagado),
      montoEnLetras: montoEnLetras || translateNumberToWords(Number(montoPagado)),
      formaPago,
      fechaPago,
      horaPago,
      concepto,
      direccionInmueble,
      parteArrendada,
      subParteId: subParteId || '',
      periodoInicio,
      periodoFin,
      nombreQuienRecibe,
      cedulaQuienRecibe
    };

    try {
      await onAdd(newReceipt);
      setShowForm(false);
      handleReset();
    } catch (e: any) {
      setError('Error al registrar pago en Firebase: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  // 4. Client Search Engine
  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => 
      r.numeroRecibo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.nombreArrendatario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.documentoArrendatario.includes(searchTerm) ||
      r.direccionInmueble.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [receipts, searchTerm]);

  // Standard printing action triggering browser printing subsystem
  const handlePrint = () => {
    window.print();
  };

  const generatePdfBlob = async (): Promise<Blob | null> => {
    const element = document.getElementById('reciboGenerado');
    if (!element) return null;
    
    // Smooth overflow overrides to capture full box contents perfectly
    const originalMaxHeight = element.style.maxHeight;
    const originalOverflow = element.style.overflow;
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';

    try {
      const canvas = await html2canvas(element, {
        scale: 2.2, // Clean high-definition text scale
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      element.style.maxHeight = originalMaxHeight;
      element.style.overflow = originalOverflow;

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const margin = 12; // 12mm print margins
      const contentWidth = pdfWidth - (margin * 2);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgHeight / imgWidth;
      const imgHeightInPdf = contentWidth * ratio;

      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, imgHeightInPdf);
      return pdf.output('blob');
    } catch (e) {
      console.error('Error al compilar documento PDF:', e);
      element.style.maxHeight = originalMaxHeight;
      element.style.overflow = originalOverflow;
      return null;
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedReceipt) return;
    setIsGeneratingPdf(true);
    setCopiedNotification('Generando recibo en formato PDF...');
    try {
      const blob = await generatePdfBlob();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Recibo_Arrendamiento_${selectedReceipt.numeroRecibo}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setCopiedNotification('¡PDF descargado con éxito!');
        setTimeout(() => setCopiedNotification(''), 3000);
      } else {
        alert('No se pudo encontrar el canvas del recibo para renderizar.');
        setCopiedNotification('');
      }
    } catch (err) {
      console.error(err);
      alert('Error de compilación en PDF.');
      setCopiedNotification('');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!selectedReceipt) return;
    setIsGeneratingPdf(true);
    setCopiedNotification('Generando archivo PDF y preparando WhatsApp...');
    
    try {
      // 1. Download PDF directly
      const blob = await generatePdfBlob();
      if (blob) {
        const fileUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = `Recibo_Arrendamiento_${selectedReceipt.numeroRecibo}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(fileUrl);
      }

      // 2. Format a pristine textual summary for WhatsApp
      const plainText = `*CONFIRMACIÓN DE PAGO - RECIBO DE ARRENDAMIENTO No. ${selectedReceipt.numeroRecibo}*
      
Estimado(a) *${selectedReceipt.nombreArrendatario}*, le comparto su recibo de arrendamiento digital correspondiente a este periodo.

🔑 *Detalles del Canon:*
• *Inmueble:* ${selectedReceipt.direccionInmueble}
• *Periodo:* ${formatearFecha(selectedReceipt.periodoInicio)} al ${formatearFecha(selectedReceipt.periodoFin)}
• *Valor Pagado:* ${formatterCOP.format(selectedReceipt.montoPagado)} COP
• *En Letras:* ${selectedReceipt.montoEnLetras}
• *Forma de Pago:* ${selectedReceipt.formaPago}
• *Fecha y Hora:* ${formatearFecha(selectedReceipt.fechaPago)}, ${selectedReceipt.horaPago}

📄 *Nota:* Se ha descargado el documento original en formato PDF para sus archivos. Favor adjuntarlo junto con este mensaje en el chat.

Atentamente: *${selectedReceipt.nombreQuienRecibe}* (C.C. ${selectedReceipt.cedulaQuienRecibe})`;

      // 3. Write message directly to user's system Clipboard
      await navigator.clipboard.writeText(plainText);
      
      const cleanPhone = selectedReceipt.telefonoArrendatario ? selectedReceipt.telefonoArrendatario.replace(/\D/g, '') : '';
      let url = '';
      if (cleanPhone) {
        let phoneWithCountry = cleanPhone;
        if (cleanPhone.length === 10 && !cleanPhone.startsWith('57')) {
          phoneWithCountry = '57' + cleanPhone;
        }
        url = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(plainText)}`;
      } else {
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(plainText)}`;
      }
      
      setCopiedNotification('📋 ¡PDF descargado y texto copiado al portapapeles! Abriendo WhatsApp...');
      
      setTimeout(() => {
        setCopiedNotification('');
        window.open(url, '_blank');
      }, 2500);

    } catch (e) {
      console.error(e);
      alert('Error al compilar el texto de WhatsApp.');
      setCopiedNotification('');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6" id="receipts-manager">
      {/* RENDER STUNNING SINGLE PRINTABLE RECEIPT CONTAINER (IF SELECTED) */}
      {selectedReceipt ? (
        <div className="bg-white p-4 sm:p-8 rounded-2xl border border-gray-200 shadow-md max-w-4xl mx-auto space-y-6 relative" id="printable-receipt-card">
          
          {copiedNotification && (
            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded-r-lg text-xs text-indigo-700 font-medium no-print flex items-center justify-between shadow-xs">
              <span>{copiedNotification}</span>
            </div>
          )}
          
          {/* Back Action Header */}
          <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center pb-4 border-b border-gray-100 no-print">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors bg-white font-semibold"
            >
              <ArrowLeft size={14} /> Volver al Listado
            </button>
            <div className="flex flex-wrap gap-2 items-center justify-end">
              <button
                onClick={handleShareWhatsApp}
                disabled={isGeneratingPdf}
                className="flex items-center justify-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 px-3 py-1.5 rounded-lg transition-colors font-semibold shadow-xs cursor-pointer disabled:cursor-not-allowed"
                title="Compartir por WhatsApp rápidamente"
              >
                <Share2 size={14} /> WhatsApp (PDF)
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center justify-center gap-1.5 text-xs text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 px-3 py-1.5 rounded-lg transition-colors font-semibold cursor-pointer disabled:cursor-not-allowed"
                title="Guardar recibo original como documento PDF"
              >
                <Download size={14} /> {isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-colors font-semibold shadow-xs cursor-pointer"
              >
                <Printer size={14} /> Imprimir Recibo
              </button>
            </div>
          </div>

          {/* REAL PHYSICAL COLOR RECIPIENT LAYOUT MATCHING USER SPECIFICATIONS */}
          <div className="recibo-contenedor bg-white text-black font-sans border-2 border-black p-6 sm:p-10 mx-auto max-w-3xl space-y-6" id="reciboGenerado">
            
            {/* Header section with No. and date details */}
            <div className="recibo-header flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-black pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-sans text-black tracking-tight uppercase">Recibo de Arrendamiento</h2>
                <p className="recibo-numero text-sm font-mono font-bold mt-1 text-indigo-700">No. {selectedReceipt.numeroRecibo}</p>
              </div>
              <div className="text-xs sm:text-right font-sans text-black leading-relaxed">
                <p><strong>Lugar y Fecha:</strong><br/>{selectedReceipt.lugarExpedicion},<br/>{formatearFecha(selectedReceipt.fechaExpedicion)}</p>
              </div>
            </div>

            {/* Recipient operation details body */}
            <div className="recibo-body text-xs sm:text-sm space-y-4 text-black font-sans">
              <div className="space-y-3">
                <p className="border-b border-slate-100 pb-1"><strong>Recibí de:</strong> {selectedReceipt.nombreArrendatario}</p>
                <p className="border-b border-slate-100 pb-1"><strong>La suma de:</strong> <span className="font-bold text-base sm:text-lg">{formatterCOP.format(selectedReceipt.montoPagado)}</span></p>
                <p className="border-b border-slate-100 pb-1"><strong>En letras:</strong> <span className="italic">{selectedReceipt.montoEnLetras}</span></p>
                <p className="border-b border-slate-100 pb-1"><strong>Forma de pago:</strong> {selectedReceipt.formaPago}</p>
                <p className="border-b border-slate-100 pb-1"><strong>Fecha y hora del pago:</strong> {formatearFecha(selectedReceipt.fechaPago)}, {selectedReceipt.horaPago}</p>
                <p className="text-justify leading-relaxed pt-1">
                  <strong>Por concepto de:</strong> Canon de arrendamiento del inmueble ubicado en <span className="font-semibold">{selectedReceipt.direccionInmueble}</span>, correspondiente al periodo del <span className="font-semibold">{formatearFecha(selectedReceipt.periodoInicio)}</span> al <span className="font-semibold">{formatearFecha(selectedReceipt.periodoFin)}</span>.
                </p>
                <p className="pt-1"><strong>Descripción del inmueble arrendado:</strong> {selectedReceipt.parteArrendada}</p>
              </div>

              {/* Hardcoded Legal/Receipt Observations */}
              <div className="pt-3 border-t border-dashed border-gray-300 mt-4">
                <p className="font-bold mb-1">Observaciones:</p>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-gray-700">
                  <li>Este recibo no implica novación de la deuda.</li>
                  <li>El arrendatario declara estar al día en el pago de servicios públicos y cuotas de administración (si aplica).</li>
                  <li>Este recibo no sustituye el contrato de arrendamiento vigente entre las partes.</li>
                </ul>
              </div>
            </div>

            {/* Signature Area */}
            <div className="recibo-footer border-t border-black pt-4 mt-6 flex justify-between items-end">
              <div className="firma text-left text-xs sm:text-sm space-y-1">
                <p><strong>Nombre y firma de quien recibe:</strong></p>
                <div className="h-12 sm:h-16"></div>
                <p className="italic text-xs text-gray-500">Original firmado</p>
                <p className="font-bold text-gray-900 border-t border-gray-300 pt-1 min-w-[200px]">{selectedReceipt.nombreQuienRecibe}</p>
                <p className="text-gray-600 text-xs">C.C. {selectedReceipt.cedulaQuienRecibe}</p>
              </div>
              <div className="text-right text-[10px] text-gray-400 font-mono no-print">
                <p>Generado digitalmente</p>
                <p>Copia del Arrendatario</p>
              </div>
            </div>

          </div>

          {/* Voucher share email simulation */}
          <div className="bg-gray-100 p-4 rounded-xl flex items-center justify-between no-print">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Mail size={16} className="text-indigo-600" />
              <span>Enviar comprobante digital en PDF al arrendatario: <strong>{selectedReceipt.emailArrendatario}</strong></span>
            </div>
            <button 
              onClick={() => alert(`Copia del recibo digital enviada por correo electrónico a ${selectedReceipt.emailArrendatario}`)}
              className="text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 rounded-lg transition-colors shrink-0"
            >
              Enviar por Correo
            </button>
          </div>

        </div>
      ) : (
        <>
          {/* Header and buttons */}
          <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-gray-900 font-sans">Recibos de Arrendamiento</h2>
              <p className="text-gray-500 text-xs mt-1">Archivo de operaciones, generación de voucher fiscal y timbrado de cánones.</p>
            </div>
            {!showForm && (
              <button
                onClick={() => { handleReset(); setShowForm(true); }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shrink-0"
              >
                <Plus size={14} /> Registrar Pago (Recibo)
              </button>
            )}
          </div>

          {/* New payment receipt registration */}
          {showForm && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
                <h3 className="font-semibold text-sm text-gray-950 pb-2 border-b border-gray-100 mb-4">
                  Emitir Nuevo Recibo de Pago (Pre-Relleno Inteligente)
                </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3.5 rounded-xl text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Contrato de Arrendamiento Vigente</label>
                  <select
                    value={contractId}
                    onChange={(e) => handleContractChange(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-sans"
                  >
                    <option value="">-- Seleccionar contrato para auto-llenar todo --</option>
                    {contracts.map(c => {
                      const prop = properties.find(p => p.codigo === c.codigoPropiedad);
                      const t = tenants.find(ten => ten.documento === c.tenantDocumento);
                      return (
                        <option key={c.id} value={c.id}>
                          Inmueble: {c.codigoPropiedad} - Arrendatario: {t?.nombre || c.tenantDocumento} ({formatterCOP.format(c.montoCanon)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Número de Recibo Único*</label>
                    <input
                      type="text"
                      placeholder="Ej: TAPP2026001"
                      value={numeroRecibo}
                      onChange={(e) => setNumeroRecibo(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none uppercase font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Valor Recibido ($ COP)*</label>
                    <input
                      type="number"
                      placeholder="720000"
                      value={montoPagado || ''}
                      onChange={(e) => {
                        setMontoPagado(Number(e.target.value));
                        setMontoEnLetras(translateNumberToWords(Number(e.target.value)));
                      }}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre Completo del Arrendatario*</label>
                    <input
                      type="text"
                      placeholder="Ingrese nombre"
                      value={nombreArrendatario}
                      onChange={(e) => setNombreArrendatario(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 font-mono">Cédula del Arrendatario</label>
                    <input
                      type="text"
                      placeholder="Ingrese cédula"
                      value={documentoArrendatario}
                      onChange={(e) => setDocumentoArrendatario(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Dirección del Inmueble*</label>
                    <input
                      type="text"
                      placeholder="Dirección del inmueble"
                      value={direccionInmueble}
                      onChange={(e) => setDireccionInmueble(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Parte física arrendada</label>
                    <input
                      type="text"
                      placeholder="Primer piso, local..."
                      value={parteArrendada}
                      onChange={(e) => setParteArrendada(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Forma de Pago*</label>
                    <select
                      value={formaPago}
                      onChange={(e) => setFormaPago(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-sans"
                    >
                      <option value="Consignación bancaria">Consignación bancaria</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia Nequi/Daviplata">Transferencia Nequi/Daviplata</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de Pago*</label>
                    <input
                      type="date"
                      value={fechaPago}
                      onChange={(e) => setFechaPago(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Hora*</label>
                    <input
                      type="text"
                      placeholder="Ej: 14:22"
                      value={horaPago}
                      onChange={(e) => setHoraPago(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Periodo Cubierto - Desde*</label>
                    <input
                      type="date"
                      value={periodoInicio}
                      onChange={(e) => setPeriodoInicio(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Hasta*</label>
                    <input
                      type="date"
                      value={periodoFin}
                      onChange={(e) => setPeriodoFin(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                    />
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
                    {loading ? 'Preparando...' : 'Emitir Recibo'}
                  </button>
                </div>
              </form>
              </div>
            </div>
          )}

          {/* Quick Query Filtering Panel & Dynamic Receipts grid */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-3xs overflow-hidden">
            
            {/* Search filter input */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
                <input
                  type="text"
                  placeholder="Buscar por código, dirección o arrendatario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs pl-9 pr-4 py-2 w-full border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-sans"
                />
              </div>
              <span className="text-xs text-gray-500 font-medium shrink-0">
                {filteredReceipts.length} Recibos Registrados
              </span>
            </div>

            {/* Receipts DataTable list */}
            <div className="overflow-x-auto text-[11px] sm:text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100/50 border-b border-gray-200 text-gray-600 font-semibold font-sans">
                    <th className="p-4">Recibo ID</th>
                    <th className="p-4">Arrendatario</th>
                    <th className="p-4">Predio / Dirección</th>
                    <th className="p-4">Fecha Pago</th>
                    <th className="p-4">Valor Cobrado</th>
                    <th className="p-4">Concepto</th>
                    <th className="p-4 text-right">Ficha técnica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 font-sans">
                  {filteredReceipts.map((r) => (
                    <tr key={r.numeroRecibo} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-gray-900">{r.numeroRecibo}</td>
                      <td className="p-4 font-medium text-gray-950">{r.nombreArrendatario}</td>
                      <td className="p-4 text-gray-600 max-w-xs truncate" title={r.direccionInmueble}>
                        {r.direccionInmueble.split(',')[0]}
                      </td>
                      <td className="p-4 font-mono text-gray-500">{r.fechaPago}</td>
                      <td className="p-4 font-bold text-slate-800">{formatterCOP.format(r.montoPagado)}</td>
                      <td className="p-4 text-gray-500">{r.concepto}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedReceipt(r)}
                            className="px-2.5 py-1.5 text-xs text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 font-bold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <ReceiptIcon size={12} /> Ver Recibo
                          </button>
                          
                          {confirmingDeleteId === (r.id || r.numeroRecibo) ? (
                            <span className="flex items-center gap-1">
                              <button
                                onClick={async () => {
                                  try {
                                    await onDelete(r.id || r.numeroRecibo);
                                    setConfirmingDeleteId(null);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="px-1.5 py-1 text-[10px] bg-rose-600 text-white rounded font-bold"
                              >
                                Sí
                              </button>
                              <button
                                onClick={() => setConfirmingDeleteId(null)}
                                className="px-1.5 py-1 text-[10px] bg-gray-100 text-gray-500 rounded font-bold"
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmingDeleteId(r.id || r.numeroRecibo)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Eliminar recibo"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredReceipts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-gray-400 font-sans text-xs">
                        <ReceiptIcon size={32} className="mx-auto text-gray-200 mb-2" />
                        <span className="font-semibold block">Sin registros encontrados</span>
                        <span className="text-gray-400">Pruebe a cambiar el criterio de búsqueda en el filtro superior.</span>
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
