import React, { useState } from 'react';
import { Building2, Plus, Edit2, CheckCircle2, AlertTriangle, HelpCircle, Store, Bed, Home, Car, Trash2, DoorOpen, Check, Layers, ArrowLeft, ChevronRight, SlidersHorizontal, Search, X, Filter } from 'lucide-react';
import { Property, SubParte } from '../types';

interface PropertyManagerProps {
  properties: Property[];
  onAdd: (p: Property) => Promise<void>;
  onUpdate: (id: string, p: Partial<Property>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const parseScenarioCounts = (detalles: string) => {
  const parts = (detalles || '').split('|');
  const structuredPart = parts[0].toLowerCase();
  
  const extract = (keywords: string[]) => {
    for (const key of keywords) {
      const regex = new RegExp(`(\\d+)\\s*(?:${key})`);
      const match = structuredPart.match(regex);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return 0;
  };

  return {
    hab: extract(['habitación', 'habitacion', 'habitaciones', 'habs', 'hab']),
    bano: extract(['baño', 'bano', 'baños', 'banos']),
    cocina: extract(['cocina', 'cocinas']),
    sala: extract(['sala', 'comedor', 'sala-comedor', 'salas']),
    balcon: extract(['balcón', 'balcon', 'balcones']),
    patio: extract(['patio', 'patios', 'lavanderia', 'ropa', 'ropas', 'patio-ropas']),
    garaje: extract(['garaje', 'garajes', 'parqueadero', 'parqueaderos', 'puestos', 'puesto', 'estacionamiento']),
    local: extract(['local', 'locales', 'comercio', 'establecimiento']),
    terreno: extract(['terreno', 'terrenos', 'lote', 'lotes', 'solar', 'finca'])
  };
};

const serializeScenarioCounts = (
  counts: { 
    hab: number; 
    bano: number; 
    cocina: number; 
    sala: number; 
    balcon: number; 
    patio: number; 
    garaje?: number;
    local?: number;
    terreno?: number;
  },
  extraText: string
) => {
  const parts: string[] = [];
  if (counts.hab > 0) parts.push(`${counts.hab} ${counts.hab === 1 ? 'habitación' : 'habitaciones'}`);
  if (counts.bano > 0) parts.push(`${counts.bano} ${counts.bano === 1 ? 'baño' : 'baños'}`);
  if (counts.cocina > 0) parts.push(`${counts.cocina} ${counts.cocina === 1 ? 'cocina' : 'cocinas'}`);
  if (counts.sala > 0) parts.push(`${counts.sala} ${counts.sala === 1 ? 'sala-comedor' : 'salas-comedor'}`);
  if (counts.balcon > 0) parts.push(`${counts.balcon} ${counts.balcon === 1 ? 'balcón' : 'balcones'}`);
  if (counts.patio > 0) parts.push(`${counts.patio} ${counts.patio === 1 ? 'patio' : 'patios'}`);
  if (counts.garaje && counts.garaje > 0) parts.push(`${counts.garaje} ${counts.garaje === 1 ? 'garaje' : 'garajes'}`);
  if (counts.local && counts.local > 0) parts.push(`${counts.local} ${counts.local === 1 ? 'local' : 'locales'}`);
  if (counts.terreno && counts.terreno > 0) parts.push(`${counts.terreno} ${counts.terreno === 1 ? 'terreno' : 'terrenos'}`);

  const structuredString = parts.join(', ');
  const cleanedExtra = (extraText || '').trim();
  
  if (cleanedExtra) {
    return structuredString ? `${structuredString} | ${cleanedExtra}` : cleanedExtra;
  }
  return structuredString;
};

const getExtraText = (detalles: string) => {
  const parts = (detalles || '').split('|');
  if (parts.length > 1) {
    return parts[1].trim();
  }
  const text = (detalles || '').trim();
  if (text && 
      !text.includes('hab') && 
      !text.includes('baño') && 
      !text.includes('cocina') && 
      !text.includes('sala') && 
      !text.includes('balcón') && 
      !text.includes('patio') && 
      !text.includes('garaje') && 
      !text.includes('parqueadero') &&
      !text.includes('local') &&
      !text.includes('terreno')
  ) {
    return text;
  }
  return '';
};

const renderSubParteDetalles = (detalles: string) => {
  if (!detalles) return null;

  const parts = detalles.split('|');
  const hasDelimiter = parts.length > 1;
  const structuredPart = hasDelimiter ? parts[0].trim() : '';
  const extraPart = hasDelimiter ? parts[1].trim() : detalles.trim();

  const pills = structuredPart ? structuredPart.split(',').map(p => p.trim()).filter(Boolean) : [];

  return (
    <div className="space-y-1 mt-1">
      {pills.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {pills.map((pill, idx) => {
            let icon = '⚙️';
            let bgClass = 'bg-slate-100 text-slate-700 border-slate-200/60';
            const lower = pill.toLowerCase();
            
            if (lower.includes('habitaci') || lower.includes('hab')) {
              icon = '🛌';
              bgClass = 'bg-purple-50 text-purple-700 border-purple-200/50';
            } else if (lower.includes('baño') || lower.includes('bano')) {
              icon = '🚿';
              bgClass = 'bg-blue-50 text-blue-700 border-blue-200/50';
            } else if (lower.includes('cocina')) {
              icon = '🍳';
              bgClass = 'bg-amber-50 text-amber-900 border-amber-200/50';
            } else if (lower.includes('sala')) {
              icon = '🛋️';
              bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/50';
            } else if (lower.includes('balcón') || lower.includes('balcon')) {
              icon = '🏙️';
              bgClass = 'bg-pink-50 text-pink-700 border-pink-200/50';
            } else if (lower.includes('patio')) {
              icon = '🧺';
              bgClass = 'bg-teal-50 text-teal-700 border-teal-200/50';
            } else if (lower.includes('garaje') || lower.includes('parqueadero') || lower.includes('estacionamiento')) {
              icon = '🚗';
              bgClass = 'bg-slate-100 text-slate-800 border-slate-300/50';
            } else if (lower.includes('local') || lower.includes('comercio') || lower.includes('establecimiento')) {
              icon = '🏢';
              bgClass = 'bg-indigo-50 text-indigo-700 border-indigo-200/50';
            } else if (lower.includes('terreno') || lower.includes('lote') || lower.includes('finca') || lower.includes('solar')) {
              icon = '🌱';
              bgClass = 'bg-lime-55 text-lime-800 border-lime-200/50';
            }

            return (
              <span key={idx} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border capitalize ${bgClass}`}>
                <span>{icon}</span>
                <span>{pill}</span>
              </span>
            );
          })}
        </div>
      ) : null}

      {!hasDelimiter && (detalles.includes('hab') || detalles.includes('baño') || detalles.includes('cocina') || detalles.includes('sala') || detalles.includes('garaje') || detalles.includes('parqueadero') || detalles.includes('local') || detalles.includes('terreno') || detalles.includes('lote')) ? (
        <div className="flex flex-wrap gap-1">
          {detalles.split(',').map((pill, idx) => {
            const trimmed = pill.trim();
            if (!trimmed) return null;
            let icon = '✨';
            let bgClass = 'bg-slate-50 text-slate-600 border-slate-200/40';
            const lower = trimmed.toLowerCase();
            if (lower.includes('hab')) { icon = '🛌'; bgClass = 'bg-purple-50 text-purple-700 border-purple-200/50'; }
            else if (lower.includes('baño') || lower.includes('bano')) { icon = '🚿'; bgClass = 'bg-blue-50 text-blue-700 border-blue-200/50'; }
            else if (lower.includes('cocina')) { icon = '🍳'; bgClass = 'bg-amber-50 text-amber-700 border-amber-200/50'; }
            else if (lower.includes('sala')) { icon = '🛋️'; bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/50'; }
            else if (lower.includes('balcón') || lower.includes('balcon')) { icon = '🏙️'; bgClass = 'bg-pink-50 text-pink-700 border-pink-200/50'; }
            else if (lower.includes('patio')) { icon = '🧺'; bgClass = 'bg-teal-50 text-teal-700 border-teal-200/50'; }
            else if (lower.includes('garaje') || lower.includes('parqueadero') || lower.includes('estacionamiento')) { icon = '🚗'; bgClass = 'bg-slate-100 text-slate-800 border-slate-300/50'; }
            else if (lower.includes('local') || lower.includes('comercio') || lower.includes('establecimiento')) { icon = '🏢'; bgClass = 'bg-indigo-50 text-indigo-700 border-indigo-200/50'; }
            else if (lower.includes('terreno') || lower.includes('lote') || lower.includes('finca') || lower.includes('solar')) { icon = '🌱'; bgClass = 'bg-lime-55 text-lime-800 border-lime-200/50'; }
            
            return (
              <span key={idx} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${bgClass}`}>
                <span>{icon}</span>
                <span>{trimmed}</span>
              </span>
            );
          })}
        </div>
      ) : (
        !hasDelimiter && extraPart && (
          <p className="text-[10px] text-slate-500 italic mt-0.5 leading-normal">
             “{extraPart}”
          </p>
        )
      )}

      {hasDelimiter && extraPart && (
        <p className="text-[10px] text-slate-500 italic mt-0.5 leading-normal">
           “{extraPart}”
        </p>
      )}
    </div>
  );
};

const SUFFIX_SUGGESTIONS: Record<string, string[]> = {
  apartamento: ['APT101', 'APT102', 'APT201', 'APT202', 'APT301', 'LOCAL1', 'LOCAL2'],
  habitacion: ['HAB101', 'HAB102', 'HAB201', 'HAB1', 'HAB2', 'CUARTO1', 'CUARTO2'],
  piso: ['P1', 'P2', 'P3', 'PISO1', 'PISO2', 'PISO3', 'PLANTA1', 'PLANTA2'],
  garaje: ['GAR1', 'GAR2', 'PAR1', 'PAR2', 'PARQ1', 'PARQ2', 'GARAJE'],
  zona_comun: ['ZONCOM1', 'ZONCOM2', 'ZON1', 'ZON2', 'ZONAA', 'ZONAB'],
  otro: ['BOD1', 'BOD2', 'DEP1', 'DEP2', 'ESP1', 'ESP2', 'CABA1', 'CABA2']
};

export default function PropertyManager({ properties, onAdd, onUpdate, onDelete }: PropertyManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Listing filters states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<'Todos' | 'Disponible' | 'Arrendado' | 'Mantenimiento'>('Todos');
  const [filterTipoArrendamiento, setFilterTipoArrendamiento] = useState<'Todos' | 'completo' | 'habitacion' | 'comercial' | 'subdividido'>('Todos');
  const [filterDepartamento, setFilterDepartamento] = useState<string>('Todos');
  const [filterMunicipio, setFilterMunicipio] = useState<string>('Todos');

  // Floating views and overlay modals
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  
  // Step Navigation in Form
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [hasSubdivisions, setHasSubdivisions] = useState(false);

  // Form fields
  const [codigo, setCodigo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [parteArrendada, setParteArrendada] = useState('');
  const [tipoArrendamiento, setTipoArrendamiento] = useState<'completo' | 'habitacion' | 'comercial' | 'no_aplica'>('completo');
  const [estado, setEstado] = useState<'Disponible' | 'Arrendado' | 'Mantenimiento'>('Disponible');
  const [subPartes, setSubPartes] = useState<SubParte[]>([]);

  // Single unit configuration workspace states
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null); // 'new' or specific subpart ID
  const [uCodigo, setUCodigo] = useState('');
  const [uNombre, setUNombre] = useState('');
  const [uTipo, setUTipo] = useState<SubParte['tipo']>('habitacion');
  const [uAccesoZonasComunes, setUAccesoZonasComunes] = useState(true);
  const [uCounts, setUCounts] = useState({ hab: 0, bano: 0, cocina: 0, sala: 0, balcon: 0, patio: 0, garaje: 0, local: 0, terreno: 0 });
  const [uExtraText, setUExtraText] = useState('');
  const [uEstado, setUEstado] = useState<SubParte['estado']>('Disponible');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Entire Property (Whole House) Composition States
  const [pCounts, setPCounts] = useState({ hab: 0, bano: 0, cocina: 0, sala: 0, balcon: 0, patio: 0, garaje: 0, local: 0, terreno: 0 });
  const [pExtraText, setPExtraText] = useState('');

  // Quick Edit SubParte States
  const [editingSubParte, setEditingSubParte] = useState<SubParte | null>(null);
  const [editingSubParteParentProperty, setEditingSubParteParentProperty] = useState<Property | null>(null);
  const [qeCodigo, setQeCodigo] = useState('');
  const [qeNombre, setQeNombre] = useState('');
  const [qeTipo, setQeTipo] = useState<SubParte['tipo']>('habitacion');
  const [qeAccesoZonasComunes, setQeAccesoZonasComunes] = useState(true);
  const [qeCounts, setQeCounts] = useState({ hab: 0, bano: 0, cocina: 0, sala: 0, balcon: 0, patio: 0, garaje: 0, local: 0, terreno: 0 });
  const [qeExtraText, setQeExtraText] = useState('');
  const [qeEstado, setQeEstado] = useState<SubParte['estado']>('Disponible');
  const [qeLoading, setQeLoading] = useState(false);
  const [qeError, setQeError] = useState('');
  const [isAddingNewUnit, setIsAddingNewUnit] = useState(false);

  const handleOpenQuickEditSubParte = (sub: SubParte, parent: Property) => {
    setIsAddingNewUnit(false);
    setEditingSubParte(sub);
    setEditingSubParteParentProperty(parent);
    
    // Extrapolate only the suffix by removing the parent code prefix and dash if present
    const prefix = `${parent.codigo}-`;
    if (sub.codigo && sub.codigo.startsWith(prefix)) {
      setQeCodigo(sub.codigo.substring(prefix.length));
    } else {
      setQeCodigo(sub.codigo || '');
    }
    setQeNombre(sub.nombre);
    setQeTipo(sub.tipo);
    setQeAccesoZonasComunes(sub.accesoZonasComunes);
    setQeCounts(parseScenarioCounts(sub.detalles));
    setQeExtraText(getExtraText(sub.detalles));
    setQeEstado(sub.estado);
    setQeError('');
    setQeLoading(false);
  };

  const handleOpenAddUnitToProperty = (parent: Property) => {
    setIsAddingNewUnit(true);
    setEditingSubParte(null);
    setEditingSubParteParentProperty(parent);
    
    const existingSub = parent.subPartes || [];
    const nextNum = existingSub.length + 1;
    setQeCodigo(`UNI${nextNum}`);
    setQeNombre(`Unidad ${nextNum}`);
    setQeTipo('apartamento');
    setQeAccesoZonasComunes(true);
    setQeCounts({ hab: 1, bano: 1, cocina: 1, sala: 0, balcon: 0, patio: 0, garaje: 0, local: 0, terreno: 0 });
    setQeExtraText('');
    setQeEstado('Disponible');
    setQeError('');
    setQeLoading(false);
  };

  const handleSaveQuickEditSubParte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubParteParentProperty) return;
    if (!isAddingNewUnit && !editingSubParte) return;

    if (!qeCodigo.trim() || !qeNombre.trim()) {
      setQeError('Por favor complete el código y nombre de la unidad.');
      return;
    }

    setQeLoading(true);
    setQeError('');

    const serializedDetalles = serializeScenarioCounts(qeCounts, qeExtraText);
    
    let updatedSubPartes = [...(editingSubParteParentProperty.subPartes || [])];
    
    // Enforce dynamic prefixing with property code
    const cleanQeCodigo = qeCodigo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '').trim();
    const finalSubCodigo = `${editingSubParteParentProperty.codigo}-${cleanQeCodigo}`;

    if (isAddingNewUnit) {
      const newUnit: SubParte = {
        id: 'sub_' + Math.random().toString(36).substr(2, 9),
        codigo: finalSubCodigo,
        nombre: qeNombre.trim(),
        tipo: qeTipo,
        accesoZonasComunes: qeAccesoZonasComunes,
        detalles: serializedDetalles,
        estado: qeEstado
      };
      updatedSubPartes.push(newUnit);
    } else if (editingSubParte) {
      const updatedUnit: SubParte = {
        id: editingSubParte.id,
        codigo: finalSubCodigo,
        nombre: qeNombre.trim(),
        tipo: qeTipo,
        accesoZonasComunes: qeAccesoZonasComunes,
        detalles: serializedDetalles,
        estado: qeEstado
      };
      updatedSubPartes = updatedSubPartes.map(u => 
        u.id === editingSubParte.id ? updatedUnit : u
      );
    }

    const propPayload: Partial<Property> = {
      subPartes: updatedSubPartes
    };

    if (isAddingNewUnit && (!editingSubParteParentProperty.subPartes || editingSubParteParentProperty.subPartes.length === 0)) {
      propPayload.parteArrendada = 'Unidades independientes';
      propPayload.tipoArrendamiento = 'habitacion';
    }

    try {
      await onUpdate(editingSubParteParentProperty.id || editingSubParteParentProperty.codigo, propPayload);
      setEditingSubParte(null);
      setEditingSubParteParentProperty(null);
      setIsAddingNewUnit(false);
    } catch (err: any) {
      setQeError('Error al guardar cambios: ' + (err.message || String(err)));
    } finally {
      setQeLoading(false);
    }
  };

  // Start Editing Property
  const handleEdit = (p: Property) => {
    setEditingId(p.id || p.codigo);
    setCodigo(p.codigo);
    setDireccion(p.direccion);
    setDepartamento(p.departamento || '');
    setMunicipio(p.municipio || '');
    setParteArrendada(p.parteArrendada || 'Inmueble completo');
    setTipoArrendamiento(p.tipoArrendamiento || 'completo');
    setEstado(p.estado || 'Disponible');
    setSubPartes(p.subPartes || []);
    
    // Auto-detect subdivisions
    const subsExist = (p.subPartes || []).length > 0;
    setHasSubdivisions(subsExist);
    setCurrentStep(1);

    // Load physical composition details if they exist
    const parsedCounts = p.detalles ? parseScenarioCounts(p.detalles) : { hab: 0, bano: 0, cocina: 0, sala: 0, balcon: 0, patio: 0, garaje: 0, local: 0, terreno: 0 };
    const parsedExtra = p.detalles ? getExtraText(p.detalles) : '';
    setPCounts(parsedCounts);
    setPExtraText(parsedExtra);
    
    // Reset workspace
    setEditingUnitId(null);
    setShowForm(true);
  };

  const handleReset = () => {
    setEditingId(null);
    // Pre-populate a suggested high contrast uppercase registration code
    setCodigo('INM_' + Math.random().toString(36).substr(2, 5).toUpperCase());
    setDireccion('');
    setDepartamento('');
    setMunicipio('');
    setParteArrendada('');
    setTipoArrendamiento('completo');
    setEstado('Disponible');
    setSubPartes([]);
    
    setHasSubdivisions(false);
    setCurrentStep(1);
    setPCounts({ hab: 0, bano: 0, cocina: 0, sala: 0, balcon: 0, patio: 0, garaje: 0, local: 0, terreno: 0 });
    setPExtraText('');
    setEditingUnitId(null);
    setError('');
  };

  // Workspace handlers for Unit creation/edition
  const handleOpenNewUnit = (tipoPreset?: SubParte['tipo']) => {
    setEditingUnitId('new');
    const t = tipoPreset || 'habitacion';
    
    const presetConfig = {
      habitacion: { label: 'Habitación', prefix: 'HAB', hab: 1, bano: 1, cocina: 0, sala: 0, balcon: 0, patio: 0, garaje: 0, local: 0, terreno: 0, extra: 'Baño privado, clóset' },
      apartamento: { label: 'Apartamento', prefix: 'APT', hab: 1, bano: 1, cocina: 1, sala: 0, balcon: 0, patio: 0, garaje: 0, local: 0, terreno: 0, extra: 'Cocina semintegral, clóset' },
      piso: { label: 'Piso / Planta', prefix: 'PIS', hab: 3, bano: 1, cocina: 1, sala: 1, balcon: 1, patio: 1, garaje: 0, local: 0, terreno: 0, extra: 'Piso completo de vivienda' },
      garaje: { label: 'Garaje', prefix: 'PAR', hab: 0, bano: 0, cocina: 0, sala: 0, balcon: 0, patio: 0, garaje: 1, local: 0, terreno: 0, extra: 'Parqueadero cubierto privado' },
      zona_comun: { label: 'Zona Común', prefix: 'ZON', hab: 0, bano: 0, cocina: 0, sala: 0, balcon: 0, patio: 0, garaje: 0, local: 0, terreno: 0, extra: 'Acceso regulado para residentes' },
      otro: { label: 'Espacio Auxiliar', prefix: 'ESP', hab: 0, bano: 0, cocina: 0, sala: 0, balcon: 0, patio: 0, garaje: 0, local: 0, terreno: 0, extra: 'Depósito o área de servicio' },
    }[t];

    const nextNum = subPartes.filter(s => s.tipo === t).length + 1;
    setUCodigo(`${presetConfig.prefix}${nextNum}`);
    setUNombre(`${presetConfig.label} ${nextNum}`);
    setUTipo(t);
    setUAccesoZonasComunes(true);
    setUCounts({
      hab: presetConfig.hab,
      bano: presetConfig.bano,
      cocina: presetConfig.cocina,
      sala: presetConfig.sala,
      balcon: presetConfig.balcon,
      patio: presetConfig.patio,
      garaje: presetConfig.garaje,
      local: presetConfig.local,
      terreno: presetConfig.terreno
    });
    setUExtraText(presetConfig.extra);
    setUEstado('Disponible');
  };

  const handleLoadUnitToEdit = (sub: SubParte) => {
    setEditingUnitId(sub.id);
    
    // Extrapolate suffix code for the input field
    const prefix = `${codigo}-`;
    if (sub.codigo && sub.codigo.startsWith(prefix)) {
      setUCodigo(sub.codigo.substring(prefix.length));
    } else {
      setUCodigo(sub.codigo || '');
    }
    
    setUNombre(sub.nombre);
    setUTipo(sub.tipo);
    setUAccesoZonasComunes(sub.accesoZonasComunes);
    setUCounts(parseScenarioCounts(sub.detalles));
    setUExtraText(getExtraText(sub.detalles));
    setUEstado(sub.estado);
  };

  const handleSaveUnitWorkspace = () => {
    if (!uCodigo.trim() || !uNombre.trim()) {
      setError('Por favor complete el código y nombre de la unidad.');
      return;
    }
    setError('');

    const serializedDetalles = serializeScenarioCounts(uCounts, uExtraText);

    // Dynamic prefixing
    const cleanUCodigo = uCodigo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '').trim();
    const finalSubCodigo = `${codigo}-${cleanUCodigo}`;

    if (editingUnitId === 'new') {
      const newSub: SubParte = {
        id: 'sub_' + Math.random().toString(36).substr(2, 9),
        codigo: finalSubCodigo,
        nombre: uNombre.trim(),
        tipo: uTipo,
        accesoZonasComunes: uAccesoZonasComunes,
        detalles: serializedDetalles,
        estado: uEstado
      };
      setSubPartes([...subPartes, newSub]);
    } else {
      setSubPartes(subPartes.map(s => s.id === editingUnitId ? {
        ...s,
        codigo: finalSubCodigo,
        nombre: uNombre.trim(),
        tipo: uTipo,
        accesoZonasComunes: uAccesoZonasComunes,
        detalles: serializedDetalles,
        estado: uEstado
      } : s));
    }

    setEditingUnitId(null);
  };

  // Submit flow
  const handleSiguienteStep = () => {
    if (!direccion || !departamento || !municipio) {
      setError('Por favor complete los campos obligatorios: Dirección, Departamento y Municipio.');
      return;
    }
    setError('');
    setCurrentStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!direccion || !departamento || !municipio) {
      setError('Por favor complete los campos obligatorios: Dirección, Departamento y Municipio.');
      return;
    }

    if (hasSubdivisions && subPartes.length === 0) {
      setError('Has seleccionado un inmueble subdividido, pero no has agregado ninguna unidad. Por favor agrega una en el Paso 2 o cámbialo a "Propiedad Completa" en el Paso 1.');
      return;
    }

    setLoading(true);
    setError('');

    const finalCodigo = codigo.trim().toUpperCase() || (editingId 
      ? editingId 
      : 'INM_' + Math.random().toString(36).substr(2, 5).toUpperCase());

    const finalParteArrendada = hasSubdivisions 
      ? 'Unidades independientes' 
      : (parteArrendada.trim() || 'Inmueble completo');

    const finalTipoArrendamiento = hasSubdivisions ? 'habitacion' : tipoArrendamiento;

    const payload: Property = {
      codigo: finalCodigo,
      direccion: direccion.trim(),
      departamento: departamento.trim(),
      municipio: municipio.trim(),
      parteArrendada: finalParteArrendada,
      tipoArrendamiento: finalTipoArrendamiento,
      estado,
      subPartes: hasSubdivisions ? subPartes : [],
      detalles: hasSubdivisions ? undefined : serializeScenarioCounts(pCounts, pExtraText)
    };

    try {
      if (editingId) {
        await onUpdate(editingId, payload);
      } else {
        await onAdd(payload);
      }
      setShowForm(false);
      handleReset();
    } catch (e: any) {
      setError('Error al guardar: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  // Helper icons/badges based on lease types
  const getLeaseTypeBadge = (type: 'completo' | 'habitacion' | 'comercial' | 'no_aplica') => {
    switch (type) {
      case 'completo':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700">
            <Home size={12} /> Arrendamiento Completo
          </span>
        );
      case 'habitacion':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700">
            <Bed size={12} /> Por Habitaciones
          </span>
        );
      case 'comercial':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700">
            <Store size={12} /> Local Comercial
          </span>
        );
      case 'no_aplica':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            🚫 No Aplica
          </span>
        );
    }
  };

  const getStatusBadge = (status: 'Disponible' | 'Arrendado' | 'Mantenimiento') => {
    switch (status) {
      case 'Disponible':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 size={10} /> Disponible
          </span>
        );
      case 'Arrendado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
            Arrendado
          </span>
        );
      case 'Mantenimiento':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
            <AlertTriangle size={10} /> Mantenimiento
          </span>
        );
    }
  };

  const getDynamicPropertyStatusBadge = (p: Property) => {
    if (!p.subPartes || p.subPartes.length === 0) {
      return getStatusBadge(p.estado);
    }

    const totalUnits = p.subPartes.length;
    const disponibles = p.subPartes.filter(sub => sub.estado === 'Disponible').length;
    const arrendados = p.subPartes.filter(sub => sub.estado === 'Arrendado').length;
    const mantenimiento = p.subPartes.filter(sub => sub.estado === 'Mantenimiento').length;

    if (disponibles === totalUnits) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={10} className="stroke-[2.5]" /> Disponible ({disponibles}/{totalUnits})
        </span>
      );
    }

    if (arrendados === totalUnits) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
          Arrendado ({arrendados}/{totalUnits})
        </span>
      );
    }

    if (mantenimiento === totalUnits) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertTriangle size={10} className="stroke-[2.5]" /> Mantenimiento ({mantenimiento}/{totalUnits})
        </span>
      );
    }

    if (disponibles > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Disp. Parcial ({disponibles}/{totalUnits})
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-205">
        Ocupado ({arrendados}/{totalUnits})
      </span>
    );
  };

  // Dynamic search and filter calculations
  const uniqueDepartamentos = Array.from(new Set(properties.map(p => p.departamento).filter(Boolean))) as string[];
  const uniqueMunicipios = Array.from(new Set(properties.map(p => p.municipio).filter(Boolean))) as string[];

  const activeFiltersCount = [
    searchTerm ? 1 : 0,
    filterEstado !== 'Todos' ? 1 : 0,
    filterTipoArrendamiento !== 'Todos' ? 1 : 0,
    filterDepartamento !== 'Todos' ? 1 : 0,
    filterMunicipio !== 'Todos' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const isFilteringActive = activeFiltersCount > 0;

  // Determine which sub-states are allowed to be shown based on active filters
  const allowedSubStates: ('Disponible' | 'Arrendado' | 'Mantenimiento')[] = (() => {
    if (filterEstado !== 'Todos') {
      return [filterEstado];
    }
    // If no specific status is selected, but SOME other filters are active,
    // we only show spaces that are 'Disponible' (as requested)
    if (isFilteringActive) {
      return ['Disponible'];
    }
    // No filters at all: show everything
    return ['Disponible', 'Arrendado', 'Mantenimiento'];
  })();

  const filteredProperties = properties.map(p => {
    // We dynamically filter subPartes based on which states are allowed by active filters
    if (p.subPartes && p.subPartes.length > 0) {
      return {
        ...p,
        subPartes: p.subPartes.filter(sub => allowedSubStates.includes(sub.estado))
      };
    }
    return p;
  }).filter(p => {
    // If filtering is active, enforce that:
    // 1. If property is not subdivided, its status must be one of the allowed ones.
    // 2. If property is subdivided, it must have at least one subunit of the allowed states remaining.
    if (isFilteringActive) {
      if (!p.subPartes || p.subPartes.length === 0) {
        if (!allowedSubStates.includes(p.estado)) {
          return false;
        }
      } else {
        if (p.subPartes.length === 0) {
          return false;
        }
      }
    }

    // Search filter: address, code, department, municipality, or unit details
    const cleanSearch = searchTerm.toLowerCase().trim();
    const matchesSearch = !cleanSearch || 
      p.direccion.toLowerCase().includes(cleanSearch) || 
      p.codigo.toLowerCase().includes(cleanSearch) ||
      (p.departamento && p.departamento.toLowerCase().includes(cleanSearch)) ||
      (p.municipio && p.municipio.toLowerCase().includes(cleanSearch)) ||
      (p.subPartes && p.subPartes.some(sub => sub.nombre.toLowerCase().includes(cleanSearch) || sub.codigo.toLowerCase().includes(cleanSearch)));

    // Estado filter:
    // With our active filtration, everything shown is 'Disponible'. But let's keep matchesEstado valid.
    const matchesEstado = filterEstado === 'Todos' || p.estado === filterEstado || (p.subPartes && p.subPartes.some(sub => sub.estado === filterEstado));

    // Tipo filter
    let matchesTipo = true;
    if (filterTipoArrendamiento !== 'Todos') {
      if (filterTipoArrendamiento === 'subdividido') {
        matchesTipo = !!(p.subPartes && p.subPartes.length > 0);
      } else {
        matchesTipo = p.tipoArrendamiento === filterTipoArrendamiento;
      }
    }

    // Departamento filter
    const matchesDept = filterDepartamento === 'Todos' || p.departamento === filterDepartamento;

    // Municipio filter
    const matchesMun = filterMunicipio === 'Todos' || p.municipio === filterMunicipio;

    return matchesSearch && matchesEstado && matchesTipo && matchesDept && matchesMun;
  });

  return (
    <div className="space-y-6" id="property-manager">
      {/* Floating Modal: Administración de Inmuebles */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xl max-w-xl w-full relative font-sans animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowAdminModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} className="stroke-[2.5]" />
            </button>

            <div className="space-y-5">
              <div className="flex items-start gap-4 pr-6">
                <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-indigo-100/60 text-indigo-600 rounded-xl shadow-[0_4px_12px_rgba(79,70,229,0.08)] border border-indigo-100/80 shrink-0">
                  <Building2 size={26} className="stroke-[1.75]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900 leading-snug">Administración de Inmuebles</h2>
                  <p className="text-slate-500 text-xs mt-1.5 font-medium leading-relaxed">
                    Configuración técnica de predios, habitaciones y locales comerciales con administración de unidades de alquiler y códigos de identificación autogenerados.
                  </p>
                </div>
              </div>

              {/* Statistics Panel */}
              <div className="grid grid-cols-2 gap-3.5 bg-slate-50/50 border border-slate-100 p-4 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registrados</span>
                  <p className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-1.5">
                    {properties.length}
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">Inmuebles</span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Modalidad</span>
                  <p className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-1.5">
                    {properties.filter(p => p.subPartes && p.subPartes.length > 0).length}
                    <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">Subdivididos</span>
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    handleReset();
                    setShowForm(true);
                    setShowAdminModal(false);
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-[0_4px_14px_rgba(79,70,229,0.25)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.35)] transition-all outline-hidden cursor-pointer"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  Registrar Inmueble
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Form */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
            {/* Form Header */}
            <div className="pb-3 border-b border-gray-100 mb-5 flex justify-between items-center">
              <h3 className="font-bold text-sm text-gray-950">
                {editingId ? '📝 Editar Información de Inmueble' : '🏢 Registrar Nuevo Inmueble o Unidad'}
              </h3>
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                Paso {currentStep} de {hasSubdivisions ? 2 : 1}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                  ⚠️ {error}
                </div>
              )}

              {/* Step Navigation Bar */}
              <div className="flex items-center justify-between pb-2 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentStep === 1 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-700 font-bold'}`}>1</div>
                  <span className={`text-xs font-bold ${currentStep === 1 ? 'text-gray-900' : 'text-gray-400'}`}>Datos Básicos y Alquiler</span>
                </div>
                <div className="flex-1 mx-4 h-0.5 bg-gray-100"></div>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentStep === 2 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-gray-100 text-gray-400'}`}>2</div>
                  <span className={`text-xs font-bold ${currentStep === 2 ? 'text-gray-900' : 'text-gray-400'} ${!hasSubdivisions ? 'line-through opacity-40' : ''}`}>Unidades Internas (Opcional)</span>
                </div>
              </div>

              {/* STEP 1: GENERAL DATA & RENTAL TYPE */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-650 mb-1">Código del Inmueble*</label>
                      <input
                        type="text"
                        placeholder="Ej: PVPP, TASP, CABA"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none font-mono font-bold text-indigo-700"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-650 mb-1">Departamento*</label>
                      <input
                        type="text"
                        placeholder="Ej: Boyacá, Cundinamarca"
                        value={departamento}
                        onChange={(e) => setDepartamento(e.target.value)}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-650 mb-1">Municipio / Ciudad*</label>
                      <input
                        type="text"
                        placeholder="Ej: Paipa, Tunja, Bogotá"
                        value={municipio}
                        onChange={(e) => setMunicipio(e.target.value)}
                        className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-650 mb-1">Dirección Exacta del Inmueble*</label>
                    <input
                      type="text"
                      placeholder="Ej: CALLE 33 NO. 14-155 MZ A, URBANIZACIÓN VILLA PRADO"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* VISUAL SELECTION FOR RENTAL TYPE */}
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-bold text-gray-700">¿Cómo vas a arrendar este inmueble?</label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Unique Property Card Selector */}
                      <button
                        type="button"
                        onClick={() => {
                          setHasSubdivisions(false);
                          setParteArrendada('Inmueble completo');
                          setTipoArrendamiento('completo');
                        }}
                        className={`p-4 rounded-xl border text-left transition-all ${!hasSubdivisions ? 'border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-500/10' : 'border-gray-200 bg-white hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className={`p-2 rounded-lg ${!hasSubdivisions ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            <Home size={16} />
                          </span>
                          <span className="font-bold text-xs text-slate-900 font-sans">Propiedad Completa</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Se alquila todo el predio como una sola unidad bajo un único contrato de arrendamiento global.
                        </p>
                      </button>

                      {/* Subdivided Units Card Selector */}
                      <button
                        type="button"
                        onClick={() => {
                          setHasSubdivisions(true);
                          setParteArrendada('Unidades independientes');
                          setTipoArrendamiento('habitacion');
                        }}
                        className={`p-4 rounded-xl border text-left transition-all ${hasSubdivisions ? 'border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-500/10' : 'border-gray-200 bg-white hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className={`p-2 rounded-lg ${hasSubdivisions ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            <Layers size={16} />
                          </span>
                          <span className="font-bold text-xs text-slate-900 font-sans">Dividido en Unidades</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Se subdivide en múltiples espacios independientes (apartamentos, cuartos, garajes) con contratos individuales.
                        </p>
                      </button>
                    </div>
                  </div>

                  {!hasSubdivisions && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-650 mb-1">Tipo de Edificación Completa</label>
                          <select
                            value={tipoArrendamiento}
                            onChange={(e) => setTipoArrendamiento(e.target.value as any)}
                            className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-medium"
                          >
                            <option value="completo">🏠 Vivienda Familiar / Casa / Apartamento completo</option>
                            <option value="comercial">🏢 Local u Oficina Comercial</option>
                            <option value="no_aplica">🚫 No Aplica (Sin edificación / Terreno / Lote vacío)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-650 mb-1">Estado de la Propiedad</label>
                          <select
                            value={estado}
                            onChange={(e) => setEstado(e.target.value as any)}
                            className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-medium"
                          >
                            <option value="Disponible">Disponible</option>
                            <option value="Arrendado">Arrendado</option>
                            <option value="Mantenimiento">Mantenimiento</option>
                          </select>
                        </div>
                      </div>

                      {/* PHYSICAL COMPOSITION SECTION FOR THE WHOLE HOUSE / COMPLETE PROPERTY */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                        <span className="text-[10px] uppercase font-bold text-slate-550 tracking-wider block">📐 Composición Física del Inmueble Completo:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {[
                            { key: 'hab', label: 'Habitaciones', icon: '🛌', activeCol: 'border-purple-200 text-purple-700 bg-purple-50/10' },
                            { key: 'bano', label: 'Baños', icon: '🚿', activeCol: 'border-blue-200 text-blue-700 bg-blue-50/10' },
                            { key: 'cocina', label: 'Cocinas', icon: '🍳', activeCol: 'border-amber-200 text-amber-700 bg-amber-50/10' },
                            { key: 'sala', label: 'Salas', icon: '🛋️', activeCol: 'border-emerald-200 text-emerald-700 bg-emerald-50/10' },
                            { key: 'balcon', label: 'Balcón', icon: '🏙️', activeCol: 'border-pink-200 text-pink-700 bg-pink-50/10' },
                            { key: 'patio', label: 'Patio/Ropas', icon: '🧺', activeCol: 'border-teal-200 text-teal-700 bg-teal-50/10' },
                            { key: 'garaje', label: 'Garajes', icon: '🚗', activeCol: 'border-slate-300 text-slate-800 bg-slate-50/20' },
                            { key: 'local', label: 'Local Comercial', icon: '🏢', activeCol: 'border-indigo-200 text-indigo-750 bg-indigo-50/10' },
                            { key: 'terreno', label: 'Terrenos / Lote', icon: '🌱', activeCol: 'border-lime-200 text-lime-850 bg-lime-50/10' },
                          ].map((item) => {
                            const currentVal = pCounts[item.key as keyof typeof pCounts] || 0;
                            return (
                              <div
                                key={item.key} 
                                className={`flex items-center justify-between border ${currentVal > 0 ? item.activeCol : 'border-slate-200 bg-white'} rounded-lg px-2.5 py-1.5 text-xs`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-sm shrink-0">{item.icon}</span>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] text-gray-500 leading-none truncate capitalize">{item.label}</span>
                                    <span className="text-[11px] font-bold font-mono text-slate-900 mt-0.5">{currentVal}</span>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-0.5 ml-2">
                                  <button
                                    type="button"
                                    onClick={() => setPCounts({ ...pCounts, [item.key]: currentVal + 1 })}
                                    className="w-4.5 h-4.5 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold rounded flex items-center justify-center text-slate-800 cursor-pointer"
                                  >
                                    +
                                  </button>
                                  {currentVal > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setPCounts({ ...pCounts, [item.key]: Math.max(0, currentVal - 1) })}
                                      className="w-4.5 h-4.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded flex items-center justify-center text-[10px] font-bold cursor-pointer"
                                    >
                                      -
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Additional free-form description */}
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-slate-650 text-slate-600">Comentarios o Comodidades Adicionales</label>
                          <input
                            type="text"
                            placeholder="Ej: garaje doble, patio grande, closets en madera, recién remodelado"
                            value={pExtraText}
                            onChange={(e) => setPExtraText(e.target.value)}
                            className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:outline-none text-slate-900 font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: DIVIDED UNITS SETUP (SIDE BY SIDE WORKSPACE) */}
              {currentStep === 2 && hasSubdivisions && (
                <div className="space-y-4">
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex items-start gap-2 text-xs text-indigo-950 leading-relaxed">
                    <span className="text-sm">💡</span>
                    <div>
                      <span className="font-bold block">Espacios de Alquiler Individuales</span>
                      Agrega los apartamentos, habitaciones o garajes de este edificio. Los contratos se generarán por separado para cada unidad que crees aquí.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT COLUMN: SELECTED / ADDED UNITS LIST */}
                    <div className="md:col-span-4 space-y-3">
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-150">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide px-1">Tus Unidades ({subPartes.length})</span>
                        {editingUnitId !== 'new' && (
                          <button
                            type="button"
                            onClick={() => handleOpenNewUnit()}
                            className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-2 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Plus size={10} /> Nueva
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                        {subPartes.map((sub, idx) => {
                          const isEditing = editingUnitId === sub.id;
                          let typeIcon = <Home size={12} className="text-blue-500" />;
                          if (sub.tipo === 'habitacion') typeIcon = <Bed size={12} className="text-purple-600" />;
                          if (sub.tipo === 'piso') typeIcon = <Layers size={12} className="text-amber-600" />;
                          if (sub.tipo === 'garaje') typeIcon = <Car size={12} className="text-emerald-600" />;

                          return (
                            <div 
                              key={sub.id} 
                              onClick={() => handleLoadUnitToEdit(sub)}
                              className={`group p-2.5 rounded-xl border text-left cursor-pointer transition-all flex justify-between items-start gap-2 ${isEditing ? 'border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-500/10' : 'border-slate-100 bg-slate-50/50 hover:border-indigo-300 hover:bg-white'}`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-[9px] font-bold bg-slate-200 px-1 py-0.5 rounded text-slate-800 uppercase">
                                    {sub.codigo}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 truncate">{sub.nombre}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                                  {typeIcon}
                                  <span className="capitalize">{sub.tipo === 'zona_comun' ? 'Común' : sub.tipo}</span>
                                  <span className="mx-0.5">•</span>
                                  <span className="text-slate-700 truncate font-medium max-w-[110px]">{sub.detalles.split('|')[0] || 'Por configurar'}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 align-middle">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSubPartes(subPartes.filter(item => item.id !== sub.id));
                                    if (editingUnitId === sub.id) setEditingUnitId(null);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Eliminar"
                                >
                                  <Trash2 size={12} />
                                </button>
                                <ChevronRight size={13} className="text-slate-400" />
                              </div>
                            </div>
                          );
                        })}

                        {subPartes.length === 0 && (
                          <div className="border border-dashed border-slate-250 p-6 rounded-xl text-center text-slate-400">
                            <span className="text-xl block mb-1">🏡</span>
                            <p className="text-[10px] font-bold">Sin unidades registradas</p>
                            <button
                              type="button"
                              onClick={() => handleOpenNewUnit('apartamento')}
                              className="mt-2 text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md font-bold hover:bg-indigo-100 transition-colors inline-block"
                            >
                              + Crear Apartamento
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: FOCUSED WORKSPACE CREATOR / EDITOR PANEL */}
                    <div className="md:col-span-8">
                      {editingUnitId ? (
                        <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-4 shadow-3xs">
                          
                          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">⚙️</span>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900">
                                  {editingUnitId === 'new' ? 'Agregar Nueva Unidad' : `Modificar: ${uNombre}`}
                                </h4>
                                <p className="text-[10px] text-slate-500 font-medium">Especifica los ambientes y comodidades de este espacio.</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditingUnitId(null)}
                              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded cursor-pointer"
                            >
                              Cerrar
                            </button>
                          </div>

                          {/* Templates shortcut inside workspace */}
                          {editingUnitId === 'new' && (
                            <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[9px] uppercase font-bold text-indigo-950 tracking-wider block">⚡ Configuración Pre-establecida (Clic para autocompletar):</span>
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { tipo: 'habitacion', label: '🛌 Habitación', css: 'hover:bg-purple-50 text-purple-700' },
                                  { tipo: 'apartamento', label: '🏢 Apartamento', css: 'hover:bg-blue-50 text-blue-700' },
                                  { tipo: 'piso', label: '🔲 Piso', css: 'hover:bg-amber-50 text-amber-700' },
                                ].map(p => (
                                  <button
                                    key={p.tipo}
                                    type="button"
                                    onClick={() => handleOpenNewUnit(p.tipo as any)}
                                    className={`text-[10px] font-bold py-1 px-1.5 bg-slate-50 border border-slate-200/60 rounded-lg text-center transition-all ${p.css} cursor-pointer`}
                                  >
                                    {p.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3.5">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Código de Alquiler (Sufijo)*</label>
                              <div className="flex items-center">
                                <span className="bg-slate-100 border border-r-0 border-slate-200 px-3 py-2 rounded-l-xl text-xs font-mono font-bold text-slate-500 select-none">
                                  {codigo || 'INM'}-
                                </span>
                                <input
                                  type="text"
                                  placeholder="Ej: APT101"
                                  value={uCodigo}
                                  onChange={(e) => setUCodigo(e.target.value.toUpperCase().replace(/[^a-zA-Z0-9]/g, ''))}
                                  className="w-full text-xs p-2 border border-slate-200 rounded-r-xl bg-white focus:border-indigo-500 focus:outline-none font-mono font-bold uppercase"
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Nombre / Título de Alquiler*</label>
                              <input
                                type="text"
                                placeholder="Ej: Apartamento 101"
                                value={uNombre}
                                onChange={(e) => setUNombre(e.target.value)}
                                className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:outline-none"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3.5">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Tipo de Espacio</label>
                              <select
                                value={uTipo}
                                onChange={(e) => {
                                  const newTipo = e.target.value as any;
                                  setUTipo(newTipo);

                                  const nextNum = subPartes.filter(s => s.tipo === newTipo).length + 1;
                                  let suggestedSuffix = '';
                                  let suggestedName = '';

                                  if (newTipo === 'apartamento') {
                                    suggestedSuffix = `APT10${nextNum}`;
                                    suggestedName = `Apartamento 10${nextNum}`;
                                  } else if (newTipo === 'habitacion') {
                                    suggestedSuffix = `HAB10${nextNum}`;
                                    suggestedName = `Habitación 10${nextNum}`;
                                  } else if (newTipo === 'piso') {
                                    suggestedSuffix = `P${nextNum}`;
                                    suggestedName = `Piso ${nextNum}`;
                                  } else if (newTipo === 'garaje') {
                                    suggestedSuffix = `GAR${nextNum}`;
                                    suggestedName = `Garaje ${nextNum}`;
                                  } else if (newTipo === 'zona_comun') {
                                    suggestedSuffix = `ZONCOM${nextNum}`;
                                    suggestedName = `Zona Común ${nextNum}`;
                                  } else {
                                    suggestedSuffix = `ESP${nextNum}`;
                                    suggestedName = `Espacio Auxiliar ${nextNum}`;
                                  }

                                  setUCodigo(suggestedSuffix);
                                  setUNombre(suggestedName);

                                  const presetExtra = {
                                    habitacion: { hab: 1, bano: 1, cocina: 0, extra: 'Baño privado, clóset' },
                                    apartamento: { hab: 1, bano: 1, cocina: 1, extra: 'Cocina semintegral, clóset' },
                                    piso: { hab: 3, bano: 1, cocina: 1, extra: 'Piso completo de vivienda' },
                                    garaje: { hab: 0, bano: 0, cocina: 0, extra: 'Parqueadero cubierto privado' },
                                    zona_comun: { hab: 0, bano: 0, cocina: 0, extra: 'Acceso regulado para residentes' },
                                    otro: { hab: 0, bano: 0, cocina: 0, extra: 'Depósito o área de servicio' },
                                  }[newTipo];

                                  if (presetExtra) {
                                    setUCounts(prev => ({
                                      ...prev,
                                      hab: presetExtra.hab,
                                      bano: presetExtra.bano,
                                      cocina: presetExtra.cocina,
                                    }));
                                    setUExtraText(presetExtra.extra);
                                  }
                                }}
                                className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-100 font-medium"
                              >
                                <option value="apartamento">🏢 Apartamento</option>
                                <option value="habitacion">🛌 Habitación / Cuarto</option>
                                <option value="piso">🔲 Piso / Planta nueva</option>
                                <option value="garaje">🚗 Garaje / Parqueadero</option>
                                <option value="zona_comun">🚪 Zona Común</option>
                                <option value="otro">📦 Espacio Auxiliar</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Estado Operativo</label>
                              <select
                                value={uEstado}
                                onChange={(e) => setUEstado(e.target.value as any)}
                                className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:outline-none font-semibold text-slate-800"
                              >
                                <option value="Disponible">🟢 Disponible</option>
                                <option value="Arrendado">🔵 Arrendado</option>
                                <option value="Mantenimiento">🔴 Mantenimiento</option>
                              </select>
                            </div>
                          </div>

                          {/* Composición Interna */}
                          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">📐 Composición Interna:</span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {[
                                { key: 'hab', label: 'Habitaciones', icon: '🛌', activeCol: 'border-purple-200 text-purple-700 bg-purple-50/10' },
                                { key: 'bano', label: 'Baños', icon: '🚿', activeCol: 'border-blue-200 text-blue-700 bg-blue-50/10' },
                                { key: 'cocina', label: 'Cocinas', icon: '🍳', activeCol: 'border-amber-200 text-amber-700 bg-amber-50/10' },
                                { key: 'sala', label: 'Salas', icon: '🛋️', activeCol: 'border-emerald-200 text-emerald-700 bg-emerald-50/10' },
                                { key: 'balcon', label: 'Balcón', icon: '🏙️', activeCol: 'border-pink-200 text-pink-700 bg-pink-50/10' },
                                { key: 'patio', label: 'Patio/Ropas', icon: '🧺', activeCol: 'border-teal-200 text-teal-700 bg-teal-50/10' },
                                { key: 'garaje', label: 'Garajes', icon: '🚗', activeCol: 'border-slate-300 text-slate-800 bg-slate-50/20' },
                                { key: 'local', label: 'Local Comercial', icon: '🏢', activeCol: 'border-indigo-200 text-indigo-755 bg-indigo-50/10' },
                                { key: 'terreno', label: 'Terrenos / Lote', icon: '🌱', activeCol: 'border-lime-200 text-lime-855 bg-lime-50/10' },
                              ].map((item) => {
                                const currentVal = uCounts[item.key as keyof typeof uCounts] || 0;
                                return (
                                  <div
                                    key={item.key} 
                                    className={`flex items-center justify-between border ${currentVal > 0 ? item.activeCol : 'border-slate-200'} rounded-lg px-2 py-1 text-xs`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-sm shrink-0">{item.icon}</span>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[9px] text-gray-500 leading-none truncate capitalize">{item.label}</span>
                                        <span className="text-[11px] font-bold font-mono text-slate-900 mt-0.5">{currentVal}</span>
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-0.5 ml-2">
                                      <button
                                        type="button"
                                        onClick={() => setUCounts({ ...uCounts, [item.key]: currentVal + 1 })}
                                        className="w-4.5 h-4.5 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold rounded flex items-center justify-center text-slate-800 cursor-pointer"
                                      >
                                        +
                                      </button>
                                      {currentVal > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => setUCounts({ ...uCounts, [item.key]: Math.max(0, currentVal - 1) })}
                                          className="w-4.5 h-4.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded flex items-center justify-center text-[10px] font-bold cursor-pointer"
                                        >
                                          -
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Extra Notes */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-medium text-slate-500">Comentarios o Comodidades Adicionales</label>
                            <input
                              type="text"
                              placeholder="Ej: vista panorámica, closets completos, calentador a gas"
                              value={uExtraText}
                              onChange={(e) => setUExtraText(e.target.value)}
                              className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:outline-none"
                            />
                          </div>

                          {/* Access Zonas Comunes Checkbox */}
                          <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={uAccesoZonasComunes}
                                onChange={(e) => setUAccesoZonasComunes(e.target.checked)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-550 h-4 w-4"
                              />
                              <span className="text-[11px] text-slate-700 font-bold">¿Acceso a zonas comunes?</span>
                            </label>

                            <button
                              type="button"
                              onClick={handleSaveUnitWorkspace}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-4 rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                            >
                              {editingUnitId === 'new' ? '✓ Registrar Unidad' : '✓ Guardar Cambios'}
                            </button>
                          </div>

                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-200 bg-slate-50/50 p-10 rounded-2xl text-center space-y-3.5 flex flex-col justify-center items-center h-full min-h-[220px]">
                          <span className="text-3xl">👈</span>
                          <div className="max-w-[290px]">
                            <h4 className="text-xs font-bold text-slate-800 mb-1">Editor de Unidades Alquilables</h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Haz clic en alguna de tus unidades en la lista izquierda para editar sus componentes, o pulsa el botón para crear un nuevo espacio.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenNewUnit('apartamento')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-3xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Plus size={13} />
                            Agregar Espacio de Alquiler
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* Form Actions Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-6">
                <div>
                  {currentStep === 2 && (
                    <button
                      type="button"
                      onClick={() => { setCurrentStep(1); setEditingUnitId(null); }}
                      className="flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-250 px-3.5 py-2 rounded-xl transition-all"
                    >
                      <ArrowLeft size={13} /> Regresar a Paso 1
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); handleReset(); }}
                    className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                    disabled={loading}
                  >
                    Cancelar
                  </button>

                  {currentStep === 1 && hasSubdivisions ? (
                    <button
                      type="button"
                      onClick={handleSiguienteStep}
                      className="flex items-center gap-1 px-4.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
                    >
                      Establecer Unidades <ChevronRight size={13} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                      disabled={loading}
                    >
                      {loading ? 'Guardando...' : editingId ? 'Actualizar Inmueble' : 'Guardar Inmueble'}
                    </button>
                  )}
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Floating Modal: Filtros de Búsqueda */}
      {showFiltersModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xl max-w-2xl w-full relative font-sans animate-in fade-in zoom-in-95 duration-200 space-y-5">
            {/* Close button */}
            <button
              onClick={() => setShowFiltersModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} className="stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-2 pr-6">
              <div className="p-1.5 bg-indigo-50 border border-indigo-100/50 rounded-lg text-indigo-600 shrink-0">
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Filtros de Búsqueda</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Encuentra o filtra tus inmuebles rápidamente</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Search input */}
              <div className="sm:col-span-2 relative">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Buscar Dirección, Código o Unidad</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ej: Paipa, APT101, PVPP..."
                    className="w-full text-xs pl-9 pr-8 py-2.5 border border-slate-205 rounded-xl bg-slate-50/40 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 focus:outline-none font-medium transition-all text-slate-900"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={14} className="stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Estado */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Estado</label>
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-205 rounded-xl bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-100 font-semibold text-slate-705"
                >
                  <option value="Todos">🟢 Todos los estados</option>
                  <option value="Disponible">🟢 Disponible</option>
                  <option value="Arrendado">🔵 Arrendado</option>
                  <option value="Mantenimiento">🟡 Mantenimiento</option>
                </select>
              </div>

              {/* Filter Lease Type */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Formato</label>
                <select
                  value={filterTipoArrendamiento}
                  onChange={(e) => setFilterTipoArrendamiento(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-205 rounded-xl bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-100 font-semibold text-slate-705"
                >
                  <option value="Todos">🏢 Todos los formatos</option>
                  <option value="completo">🏠 Completo</option>
                  <option value="habitacion">🛌 Por Habitaciones</option>
                  <option value="comercial">🏬 Local Comercial</option>
                  <option value="subdividido">🧩 Subdividido</option>
                </select>
              </div>

              {/* Filter Department */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Ubicación (Dpto)</label>
                <select
                  value={filterDepartamento}
                  onChange={(e) => {
                    setFilterDepartamento(e.target.value);
                    setFilterMunicipio('Todos'); // reset municipality when department changes
                  }}
                  className="w-full text-xs p-2.5 border border-slate-205 rounded-xl bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-100 font-semibold text-slate-755 uppercase"
                >
                  <option value="Todos">🌎 Todos los Dptos</option>
                  {uniqueDepartamentos.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic Municipality filter row */}
            {uniqueMunicipios.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-dashed border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Filter size={11} className="text-slate-400 shrink-0" /> Ciudades/Municipios:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin p-1">
                  <button
                    onClick={() => setFilterMunicipio('Todos')}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer uppercase ${
                      filterMunicipio === 'Todos'
                        ? 'bg-indigo-650 border-indigo-650 text-white shadow-3xs'
                        : 'bg-slate-50 border-slate-200/60 text-slate-650 hover:bg-slate-100'
                    }`}
                  >
                    Todos
                  </button>
                  {uniqueMunicipios
                    .filter(mun => filterDepartamento === 'Todos' || properties.some(p => p.departamento === filterDepartamento && p.municipio === mun))
                    .map(mun => (
                      <button
                        key={mun}
                        onClick={() => setFilterMunicipio(mun)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer uppercase ${
                          filterMunicipio === mun
                            ? 'bg-indigo-650 border-indigo-650 text-white shadow-3xs'
                            : 'bg-slate-50 border-slate-205 text-slate-650 hover:bg-slate-100'
                        }`}
                      >
                        {mun}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-2 flex justify-between items-center bg-slate-50 -mx-6 -mb-6 p-4 rounded-b-2xl border-t border-slate-100">
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100/30">
                📍 {filteredProperties.length} de {properties.length} inmuebles filtrados
              </span>
              <div className="flex gap-2">
                {(searchTerm || filterEstado !== 'Todos' || filterTipoArrendamiento !== 'Todos' || filterDepartamento !== 'Todos' || filterMunicipio !== 'Todos') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterEstado('Todos');
                      setFilterTipoArrendamiento('Todos');
                      setFilterDepartamento('Todos');
                      setFilterMunicipio('Todos');
                    }}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-850 font-bold hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs"
                  >
                    Restablecer
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowFiltersModal(false)}
                  className="px-4.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Indicators on main screen */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white border border-gray-150 p-4 rounded-xl shadow-3xs font-sans">
        <div className="flex flex-wrap items-center gap-2">
          {activeFiltersCount === 0 ? (
            <div className="flex items-center gap-1 text-slate-500 font-medium text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
              Visualizando todos los inmuebles
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wide">
                <SlidersHorizontal size={10} /> Filtros Activos ({activeFiltersCount}):
              </span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-semibold">
                  "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="p-0.5 hover:bg-slate-200 rounded">
                    <X size={10} className="stroke-[2]" />
                  </button>
                </span>
              )}
              {filterEstado !== 'Todos' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-semibold">
                  Estado: {filterEstado}
                  <button onClick={() => setFilterEstado('Todos')} className="p-0.5 hover:bg-slate-200 rounded">
                    <X size={10} className="stroke-[2]" />
                  </button>
                </span>
              )}
              {filterTipoArrendamiento !== 'Todos' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-semibold">
                  Formato: {filterTipoArrendamiento}
                  <button onClick={() => setFilterTipoArrendamiento('Todos')} className="p-0.5 hover:bg-slate-200 rounded">
                    <X size={10} className="stroke-[2]" />
                  </button>
                </span>
              )}
              {(filterDepartamento !== 'Todos' || filterMunicipio !== 'Todos') && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-semibold capitalize">
                  Ubicación: {[filterDepartamento !== 'Todos' ? filterDepartamento : '', filterMunicipio !== 'Todos' ? filterMunicipio : ''].filter(Boolean).join(', ')}
                  <button
                    onClick={() => {
                      setFilterDepartamento('Todos');
                      setFilterMunicipio('Todos');
                    }}
                    className="p-0.5 hover:bg-slate-200 rounded"
                  >
                    <X size={10} className="stroke-[2]" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterEstado('Todos');
                  setFilterTipoArrendamiento('Todos');
                  setFilterDepartamento('Todos');
                  setFilterMunicipio('Todos');
                }}
                className="text-[10px] font-bold text-rose-500 hover:text-rose-750"
              >
                Limpiar todos
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50/50 border border-indigo-100/35 px-2.5 py-1 rounded-lg">
            {filteredProperties.length} de {properties.length} Inmuebles
          </span>
          <button
            onClick={() => setShowFiltersModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 hover:bg-slate-150 text-slate-705 font-bold text-[11px] border border-slate-200 rounded-lg transition-all cursor-pointer"
          >
            <SlidersHorizontal size={12} /> Modificar Filtros
          </button>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-45 font-sans">
        {/* Floating Button 1: Filters with badge */}
        <button
          onClick={() => setShowFiltersModal(true)}
          className="relative group p-4 bg-slate-900 border border-slate-750 text-white rounded-full shadow-lg hover:shadow-2xl hover:bg-slate-850 hover:-translate-y-0.5 transition-all outline-hidden cursor-pointer flex items-center justify-center pointer-events-auto"
          title="Filtros y Búsqueda"
        >
          <SlidersHorizontal size={20} className="stroke-[2]" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-0.5 w-5 h-5 bg-rose-500 rounded-full text-[10px] font-black flex items-center justify-center text-white ring-2 ring-white animate-pulse">
              {activeFiltersCount}
            </span>
          )}
          {/* Tooltip on hover */}
          <span className="absolute right-14 bg-slate-900 border border-slate-750 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md whitespace-nowrap pointer-events-none">
            🔍 Filtros y Búsqueda
          </span>
        </button>

        {/* Floating Button 2: Administration / Add property panel */}
        <button
          onClick={() => setShowAdminModal(true)}
          className="group relative p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:shadow-2xl hover:bg-indigo-750 hover:-translate-y-0.5 transition-all outline-hidden cursor-pointer flex items-center justify-center pointer-events-auto"
          title="Administración de Inmuebles"
        >
          <Building2 size={20} className="stroke-[2]" />
          {/* Tooltip on hover */}
          <span className="absolute right-14 bg-indigo-650 border border-indigo-500/30 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md whitespace-nowrap pointer-events-none">
            🏢 Panel de Control ({properties.length})
          </span>
        </button>
      </div>

      {/* Properties List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredProperties.map((p) => (
          <div key={p.id || p.codigo} className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs flex flex-col justify-between hover:shadow-2xs transition-shadow">
            <div className="space-y-4">
              
              <div className="flex justify-between items-start gap-2">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase">
                    📍 {p.departamento || 'Boyacá'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-705 uppercase">
                    🏙️ {p.municipio || 'Paipa'}
                  </span>
                  {getLeaseTypeBadge(p.tipoArrendamiento)}
                  {getDynamicPropertyStatusBadge(p)}
                </div>
              </div>

              {/* Title & info */}
              <div className="space-y-1.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Dirección</span>
                  <p className="font-semibold text-gray-900 text-xs tracking-tight line-clamp-2 leading-relaxed">
                    {p.direccion}
                  </p>
                </div>
              </div>

              {/* Individual sub-parts list inside the card */}
              {p.subPartes && p.subPartes.length > 0 ? (
                <div className="pt-3 border-t border-gray-100 mt-2 space-y-2">
                  <div className="flex justify-between items-center bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Unidades ({p.subPartes.length})</span>
                    <button
                      type="button"
                      onClick={() => handleOpenAddUnitToProperty(p)}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-3xs cursor-pointer"
                      title="Adicionar otra unidad de alquiler"
                    >
                      <Plus size={10} /> + Unidad
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {p.subPartes.map((sub) => {
                      // Subpart status badge color
                      let stateBadgeClass = '';
                      if (sub.estado === 'Disponible') stateBadgeClass = 'bg-emerald-50 text-emerald-700';
                      else if (sub.estado === 'Arrendado') stateBadgeClass = 'bg-blue-50 text-blue-700';
                      else stateBadgeClass = 'bg-rose-50 text-rose-700';

                      return (
                        <div key={sub.id} className="text-xs p-2 rounded-lg bg-slate-50 border border-gray-100 flex flex-col gap-1 font-sans">
                          <div className="flex justify-between items-center gap-1">
                            <div className="flex items-center gap-1.5 font-semibold text-gray-800 flex-wrap">
                              {sub.tipo === 'apartamento' && <Home size={12} className="text-indigo-600" />}
                              {sub.tipo === 'piso' && <Layers size={12} className="text-blue-600" />}
                              {sub.tipo === 'habitacion' && <Bed size={12} className="text-purple-500" />}
                              {sub.tipo === 'garaje' && <Car size={12} className="text-blue-500" />}
                              {sub.tipo === 'zona_comun' && <DoorOpen size={12} className="text-amber-500" />}
                              {sub.tipo === 'otro' && <Home size={12} className="text-slate-500" />}
                              <span className="font-mono text-[10px] bg-slate-200 text-slate-800 px-1 py-0.5 rounded uppercase leading-none font-bold">
                                {sub.codigo || 'S/C'}
                              </span>
                              <span>{sub.nombre}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${stateBadgeClass}`}>
                                {sub.estado}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenQuickEditSubParte(sub, p)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-200 transition-colors cursor-pointer"
                                title="Editar esta unidad de alquiler"
                              >
                                <Edit2 size={10} />
                              </button>
                            </div>
                          </div>

                          {sub.detalles && renderSubParteDetalles(sub.detalles)}

                          {sub.accesoZonasComunes && (
                            <div className="flex items-center gap-1 text-[9px] text-emerald-700 font-semibold bg-emerald-50/50 px-1 py-0.5 rounded w-max">
                              <Check size={10} /> Con acceso a zonas comunes
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-gray-100 mt-2 space-y-2">
                  <div className="flex justify-between items-center bg-slate-50/50 p-1.5 rounded-lg border border-slate-100 mb-2">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Características</span>
                    <button
                      type="button"
                      onClick={() => handleOpenAddUnitToProperty(p)}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-3xs cursor-pointer"
                      title="Subdividir este inmueble y añadir unidades de alquiler independientes"
                    >
                      <Plus size={10} /> + Subdividir
                    </button>
                  </div>
                  {p.detalles ? (
                    renderSubParteDetalles(p.detalles)
                  ) : (
                    <span className="text-xs text-gray-400 italic">No se especificaron detalles ni composición</span>
                  )}
                </div>
              )}

            </div>

            {/* Quick Actions Row */}
            <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100">
              <span className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
                ID: {p.id ? String(p.id).substring(0, 8) : 'Internal'}
              </span>
              
              <div className="flex items-center gap-1.5">
                {confirmingDeleteId === (p.id || p.codigo) ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await onDelete(p.id || p.codigo);
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
                      onClick={() => handleEdit(p)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 font-semibold rounded-lg transition-colors font-sans"
                    >
                      <Edit2 size={11} /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteId(p.id || p.codigo)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 font-semibold rounded-lg transition-colors font-sans"
                    >
                      <Trash2 size={11} /> Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {properties.length === 0 && (
          <div className="col-span-full bg-white p-10 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 font-sans">
            <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-xs font-medium">No se han registrado inmuebles.</p>
            <p className="text-[11px] text-gray-400 mt-1">Crea tu primer inmueble completo, habitación o espacio comercial usando el botón superior.</p>
          </div>
        )}

        {properties.length > 0 && filteredProperties.length === 0 && (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center font-sans shadow-3xs max-w-xl mx-auto my-4">
            <div className="p-3 bg-slate-50 border border-slate-100/80 rounded-2xl w-fit mx-auto text-slate-400 mb-4 shadow-4xs">
              <SlidersHorizontal size={24} className="stroke-[1.5]" />
            </div>
            <p className="text-xs font-bold text-slate-800">Ningún inmueble coincide con los filtros</p>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              No encontramos inmuebles con el término de búsqueda o criterios seleccionados. Prueba a restablecer los filtros para ver la lista completa.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterEstado('Todos');
                setFilterTipoArrendamiento('Todos');
                setFilterDepartamento('Todos');
                setFilterMunicipio('Todos');
              }}
              className="mt-4 px-4 py-2 text-[11px] font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 hover:text-indigo-800 border border-indigo-100/80 rounded-xl transition-all cursor-pointer"
            >
              Restablecer Filtros
            </button>
          </div>
        )}
      </div>

      {/* QUICK EDIT SUBPARTE / UNIT MODAL */}
      {(editingSubParte || isAddingNewUnit) && editingSubParteParentProperty && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
            
            {/* Modal Header */}
            <div className="pb-3 border-b border-gray-100 mb-5 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-gray-950 flex items-center gap-2">
                  <span>🏡</span>
                  <span>{isAddingNewUnit ? 'Añadir Nueva Unidad de Alquiler' : 'Editar Unidad de Alquiler'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Inmueble: {editingSubParteParentProperty.direccion}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setEditingSubParte(null); setEditingSubParteParentProperty(null); setIsAddingNewUnit(false); }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 px-2 py-1 rounded cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSaveQuickEditSubParte} className="space-y-4 font-sans">
              {qeError && (
                <div className="p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                  ⚠️ {qeError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                   <label className="block text-xs font-bold text-slate-650 mb-1">Código Único (Sufijo)*</label>
                   <div className="flex items-center">
                     <span className="bg-slate-100 border border-r-0 border-slate-200 px-3 py-2.5 rounded-l-xl text-xs font-mono font-bold text-slate-500 select-none">
                       {editingSubParteParentProperty.codigo}-
                     </span>
                     <input
                       type="text"
                       placeholder="Ej: APT101"
                       value={qeCodigo}
                       onChange={(e) => setQeCodigo(e.target.value.toUpperCase().replace(/[^a-zA-Z0-9]/g, ''))}
                       className="w-full text-xs p-2.5 border border-slate-200 rounded-r-xl bg-white font-mono font-bold uppercase focus:border-indigo-500 focus:outline-none"
                       required
                     />
                   </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-slate-650 mb-1">Nombre o Título de Alquiler*</label>
                   <input
                     type="text"
                     placeholder="Ej: Apartamento 101"
                     value={qeNombre}
                     onChange={(e) => setQeNombre(e.target.value)}
                     className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:outline-none font-medium text-slate-900"
                     required
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-650 mb-1">Tipo de Espacio</label>
                  <select
                    value={qeTipo}
                    onChange={(e) => {
                      const newT = e.target.value as SubParte['tipo'];
                      setQeTipo(newT);

                      const existingSubs = editingSubParteParentProperty.subPartes || [];
                      const nextNum = existingSubs.filter(s => s.tipo === newT).length + 1;
                      let suggestedSuffix = '';
                      let suggestedTitle = '';

                      if (newT === 'apartamento') {
                        suggestedSuffix = `APT10${nextNum}`;
                        suggestedTitle = `Apartamento 10${nextNum}`;
                      } else if (newT === 'habitacion') {
                        suggestedSuffix = `HAB10${nextNum}`;
                        suggestedTitle = `Habitación 10${nextNum}`;
                      } else if (newT === 'piso') {
                        suggestedSuffix = `P${nextNum}`;
                        suggestedTitle = `Piso ${nextNum}`;
                      } else if (newT === 'garaje') {
                        suggestedSuffix = `GAR${nextNum}`;
                        suggestedTitle = `Garaje ${nextNum}`;
                      } else if (newT === 'zona_comun') {
                        suggestedSuffix = `ZONCOM${nextNum}`;
                        suggestedTitle = `Zona Común ${nextNum}`;
                      } else {
                        suggestedSuffix = `ESP${nextNum}`;
                        suggestedTitle = `Espacio Auxiliar ${nextNum}`;
                      }

                      setQeCodigo(suggestedSuffix);
                      setQeNombre(suggestedTitle);

                      const preset = {
                        habitacion: { hab: 1, bano: 1, cocina: 0, sala: 0, balcon: 0, patio: 0, garaje: 0, local: 0, terreno: 0, extra: 'Baño privado, clóset' },
                        apartamento: { hab: 1, bano: 1, cocina: 1, sala: 0, balcon: 0, patio: 0, garaje: 0, local: 0, terreno: 0, extra: 'Cocina semintegral, clóset' },
                        piso: { hab: 3, bano: 1, cocina: 1, sala: 1, balcon: 1, patio: 1, garaje: 0, local: 0, terreno: 0, extra: 'Piso de vivienda confortable' },
                        garaje: { hab: 0, bano: 0, cocina: 0, sala: 0, balcon: 0, patio: 0, garaje: 1, local: 0, terreno: 0, extra: 'Parqueadero cubierto privado' },
                        zona_comun: { hab: 0, bano: 0, cocina: 0, sala: 0, balcon: 0, patio: 0, garaje: 0, local: 0, terreno: 0, extra: 'Área común regulada' },
                        otro: { hab: 0, bano: 0, cocina: 0, sala: 0, balcon: 0, patio: 0, garaje: 0, local: 0, terreno: 0, extra: 'Espacio auxiliar' },
                      }[newT];

                      if (preset) {
                        setQeCounts(preset);
                        setQeExtraText(preset.extra);
                      }
                    }}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:outline-none font-medium text-slate-800"
                  >
                    <option value="apartamento">🏢 Apartamento</option>
                    <option value="habitacion">🛌 Habitación / Cuarto</option>
                    <option value="piso">🔲 Piso / Planta nueva</option>
                    <option value="garaje">🚗 Garaje / Parqueadero</option>
                    <option value="zona_comun">🚪 Zona Común</option>
                    <option value="otro">📦 Espacio Auxiliar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-650 mb-1">Estado Operativo</label>
                  <select
                    value={qeEstado}
                    onChange={(e) => setQeEstado(e.target.value as any)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:outline-none font-bold text-slate-900"
                  >
                    <option value="Disponible">🟢 Disponible</option>
                    <option value="Arrendado">🔵 Arrendado</option>
                    <option value="Mantenimiento">🔴 Mantenimiento</option>
                  </select>
                </div>
              </div>

              {/* Composition */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">📐 Composición Interna:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { key: 'hab', label: 'Habitaciones', icon: '🛌', activeCol: 'border-purple-200 text-purple-700 bg-purple-50/10' },
                    { key: 'bano', label: 'Baños', icon: '🚿', activeCol: 'border-blue-200 text-blue-700 bg-blue-50/10' },
                    { key: 'cocina', label: 'Cocinas', icon: '🍳', activeCol: 'border-amber-200 text-amber-700 bg-amber-50/10' },
                    { key: 'sala', label: 'Salas', icon: '🛋️', activeCol: 'border-emerald-200 text-emerald-700 bg-emerald-50/10' },
                    { key: 'balcon', label: 'Balcón', icon: '🏙️', activeCol: 'border-pink-200 text-pink-700 bg-pink-50/10' },
                    { key: 'patio', label: 'Patio/Ropas', icon: '🧺', activeCol: 'border-teal-200 text-teal-700 bg-teal-50/10' },
                    { key: 'garaje', label: 'Garajes', icon: '🚗', activeCol: 'border-slate-300 text-slate-800 bg-slate-50/20' },
                    { key: 'local', label: 'Local Comercial', icon: '🏢', activeCol: 'border-indigo-200 text-indigo-755 bg-indigo-50/10' },
                    { key: 'terreno', label: 'Terrenos / Lote', icon: '🌱', activeCol: 'border-lime-200 text-lime-855 bg-lime-50/10' },
                  ].map((item) => {
                    const currentVal = qeCounts[item.key as keyof typeof qeCounts] || 0;
                    return (
                      <div
                        key={item.key} 
                        className={`flex items-center justify-between border ${currentVal > 0 ? item.activeCol : 'border-slate-200 bg-white'} rounded-lg px-2.5 py-1.5 text-xs`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm shrink-0">{item.icon}</span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-gray-500 leading-none truncate capitalize">{item.label}</span>
                            <span className="text-[11px] font-bold font-mono text-slate-900 mt-0.5">{currentVal}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-0.5 ml-2">
                          <button
                            type="button"
                            onClick={() => setQeCounts({ ...qeCounts, [item.key]: currentVal + 1 })}
                            className="w-4.5 h-4.5 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold rounded flex items-center justify-center text-slate-800 cursor-pointer"
                          >
                            +
                          </button>
                          {currentVal > 0 && (
                            <button
                              type="button"
                              onClick={() => setQeCounts({ ...qeCounts, [item.key]: Math.max(0, currentVal - 1) })}
                              className="w-4.5 h-4.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded flex items-center justify-center text-[10px] font-bold cursor-pointer"
                            >
                              -
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Extra notes */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-650">Comentarios o Comodidades Adicionales</label>
                <input
                  type="text"
                  placeholder="Ej: vista panorámica, closets completos, calentador a gas"
                  value={qeExtraText}
                  onChange={(e) => setQeExtraText(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:outline-none text-slate-900 font-medium"
                />
              </div>

              {/* Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={qeAccesoZonasComunes}
                    onChange={(e) => setQeAccesoZonasComunes(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-550 h-4 w-4"
                  />
                  <span className="text-xs text-slate-700 font-bold">¿Acceso a zonas comunes?</span>
                </label>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-5">
                <button
                  type="button"
                  onClick={() => { setEditingSubParte(null); setEditingSubParteParentProperty(null); setIsAddingNewUnit(false); }}
                  className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                  disabled={qeLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                  disabled={qeLoading}
                >
                  {qeLoading ? 'Guardando...' : isAddingNewUnit ? '✓ Registrar Unidad' : 'Guardar Cambios de Unidad'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
