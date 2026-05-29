export interface SubParte {
  id: string; // e.g., 'sub_123'
  codigo: string; // e.g., 'PVPP-101'
  nombre: string; // e.g. "Habitación 101", "Garaje Posterior", "Apartamento 201"
  tipo: 'apartamento' | 'piso' | 'habitacion' | 'garaje' | 'zona_comun' | 'otro';
  accesoZonasComunes: boolean;
  detalles: string;
  estado: 'Disponible' | 'Arrendado' | 'Mantenimiento';
}

export interface Property {
  id?: string; // Firestore document ID
  codigo: string; // e.g., PVPP, PVJC, TASP, TAPP, CABA (still maintained internally, but hidden from the main form to prevent user confusion)
  direccion: string;
  departamento?: string; // e.g., "Boyacá", "Cundinamarca"
  municipio?: string;    // e.g., "Paipa", "Bogotá"
  parteArrendada: string;
  tipoArrendamiento: 'completo' | 'habitacion' | 'comercial' | 'no_aplica';
  estado: 'Disponible' | 'Arrendado' | 'Mantenimiento';
  subPartes?: SubParte[]; // List of individual subparts representing rooms, garages, etc.
  detalles?: string; // Composition details for entire house (bedrooms, bathrooms, etc.)
  createdBy?: string;
}

export interface Tenant {
  id?: string; // Firestore document ID or numeric ID
  nombre: string;
  documento: string;
  telefono: string;
  email: string;
  archivoCedulaUrl?: string;
  archivoCedulaNombre?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface Contract {
  id?: string; // Firestore document ID
  codigoPropiedad: string; // matches Property.codigo
  subParteId?: string; // matches SubParte.id if renting a specific space/room
  tenantDocumento: string; // matches Tenant.documento
  montoCanon: number;
  periodoInicio: string; // YYYY-MM-DD
  periodoFin: string; // YYYY-MM-DD
  fianzaDeposito: number; // Deposit amount
  reajusteAnualPercent?: number; // e.g., 5, optional (defaults to IPC)
  estado: 'Vigente' | 'Vencido' | 'Finalizado';
  archivoContratoUrl?: string;
  archivoContratoNombre?: string;
  createdBy?: string;
}

export interface Receipt {
  id?: string; // Firestore document ID
  numeroRecibo: string; // e.g., TAPP2026001
  lugarExpedicion: string;
  fechaExpedicion: string;
  nombreArrendatario: string;
  documentoArrendatario: string;
  telefonoArrendatario: string;
  emailArrendatario: string;
  montoPagado: number;
  montoEnLetras: string;
  formaPago: string;
  fechaPago: string; // YYYY-MM-DD
  horaPago: string;
  concepto: string;
  direccionInmueble: string;
  parteArrendada: string;
  subParteId?: string; // matches SubParte.id if renting a specific space/room
  periodoInicio: string; // YYYY-MM-DD
  periodoFin: string; // YYYY-MM-DD
  nombreQuienRecibe: string;
  cedulaQuienRecibe: string;
  createdBy?: string;
}

export interface Expense {
  id?: string; // Firestore document ID
  codigoPropiedad: string; // e.g., "PVPP" or "GENERAL"
  tipoGasto: 'Impuesto' | 'Servicio Público' | 'Seguro de Arrendamiento' | 'Reparación/Mantenimiento' | 'Otro';
  monto: number;
  fecha: string; // YYYY-MM-DD
  concepto: string;
  pagado: boolean;
  createdBy?: string;
}

export interface Incident {
  id?: string; // Firestore document ID
  codigoPropiedad: string;
  descripcion: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  estado: 'Abierto' | 'En Proceso' | 'Resuelto';
  fechaReporte: string; // YYYY-MM-DD
  montoEstimado: number;
  createdBy?: string;
}

export interface Alert {
  tipo: 'vencimiento' | 'reajuste' | 'mantenimiento' | 'impago';
  titulo: string;
  descripcion: string;
  fecha: string;
  nivel: 'urgente' | 'advertencia' | 'info';
  objetoId?: string; // ID related to property, contract or issue
  tenantName?: string;
  phone?: string;
  email?: string;
  propertyName?: string;
  montoCanon?: number;
  contract?: Contract;
}
