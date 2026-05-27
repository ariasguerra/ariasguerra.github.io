import React, { useState, useRef } from 'react';
import { Users, Plus, Edit2, Search, FileDown, Upload, FileSignature, CheckCircle, Trash2 } from 'lucide-react';
import { Tenant } from '../types';

interface TenantManagerProps {
  tenants: Tenant[];
  onAdd: (t: Tenant) => Promise<void>;
  onUpdate: (id: string, t: Partial<Tenant>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function TenantManager({ tenants, onAdd, onUpdate, onDelete }: TenantManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form Fields
  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  
  // Document simulated uploads
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = (t: Tenant) => {
    setEditingId(t.id || t.documento);
    setNombre(t.nombre);
    setDocumento(t.documento);
    setTelefono(t.telefono);
    setEmail(t.email);
    if (t.archivoCedulaNombre && t.archivoCedulaUrl) {
      setUploadedFile({ name: t.archivoCedulaNombre, url: t.archivoCedulaUrl });
    } else {
      setUploadedFile(null);
    }
    setShowForm(true);
    setSuccess('');
    setError('');
  };

  const handleReset = () => {
    setEditingId(null);
    setNombre('');
    setDocumento('');
    setTelefono('');
    setEmail('');
    setUploadedFile(null);
    setError('');
    setSuccess('');
  };

  // Drag and Drop handlers (Usability Pattern requirement)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.pdf') && !file.type.startsWith('image/')) {
      setError('Tipo de archivo no permitido. Suba un archivo PDF o una imagen legible de la Cédula/DNI.');
      return;
    }
    setError('');
    
    // Simulate uploading process
    const simUrl = `https://firebasestorage.api.local/cedulas/${Date.now()}_${file.name}`;
    setUploadedFile({
      name: file.name,
      url: simUrl
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !documento || !telefono || !email) {
      setError('Por favor complete todos los campos obligatorios.');
      return;
    }

    setLoading(true);
    setError('');

    const payload: Tenant = {
      nombre: nombre.trim(),
      documento: documento.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      archivoCedulaNombre: uploadedFile?.name || '',
      archivoCedulaUrl: uploadedFile?.url || ''
    };

    try {
      if (editingId) {
        await onUpdate(editingId, payload);
        setSuccess('Arrendatario actualizado de forma segura.');
      } else {
        // Check for duplicates
        if (tenants.some(t => t.documento === documento)) {
          setError('Ya existe un arrendatario registrado con este número de identificación.');
          setLoading(false);
          return;
        }
        await onAdd(payload);
        setSuccess('Arrendatario registrado correctamente en el sistema.');
      }
      setTimeout(() => {
        setShowForm(false);
        handleReset();
      }, 1000);
    } catch (e: any) {
      setError('Error al registrar arrendatario: ' + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.documento.includes(searchTerm) || 
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" id="tenant-manager">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 font-sans">Gestión de Arrendatarios</h2>
          <p className="text-gray-500 text-xs mt-1">Gabinete digital de perfiles, datos de contacto y archivo seguro de documentos de identidad.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { handleReset(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shrink-0"
          >
            <Plus size={14} /> Registrar Arrendatario
          </button>
        )}
      </div>

      {/* Editor Panel */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
            <h3 className="font-semibold text-sm text-gray-950 pb-2 border-b border-gray-100 mb-4">
              {editingId ? 'Modificar Información del Arrendatario' : 'Registrar Nuevo Arrendatario'}
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
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre Completo*</label>
                <input
                  type="text"
                  placeholder="Ej: Carlos Arturo Serrano Rodriguez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Documento de Identificación (Cédula)*</label>
                <input
                  type="text"
                  placeholder="Ej: 6759525"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  required
                  disabled={!!editingId}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono Móvil*</label>
                <input
                  type="text"
                  placeholder="Ej: 3107981224"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Correo Electrónico*</label>
                <input
                  type="email"
                  placeholder="Ej: csrodriguez2011@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Documental upload section with Drag and Drop (Mandatory Pattern) */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Documentación Segura (Cédula en PDF)</label>
              
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  isDragging 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : uploadedFile 
                    ? 'border-emerald-200 bg-emerald-50/30' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,image/*"
                  className="hidden"
                />

                {uploadedFile ? (
                  <div className="text-center space-y-1">
                    <FileSignature className="text-emerald-600 mx-auto" size={26} />
                    <span className="text-xs font-semibold text-emerald-800 block">Archivo cargado de forma segura</span>
                    <span className="text-[10px] text-gray-500 font-mono block">{uploadedFile.name}</span>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                      className="text-[10px] text-rose-600 hover:underline font-bold pt-1"
                    >
                      Remover archivo
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="text-gray-400 mx-auto mb-1.5" size={24} />
                    <span className="text-xs font-semibold text-gray-700 block">Arrastre aquí la cédula digital o haga clic</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Formatos permitidos: PDF, JPG, PNG legibles (Max 5MB)</span>
                  </div>
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
                {loading ? 'Procesando...' : editingId ? 'Actualizar Ficha' : 'Guardar Ficha'}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Tenants Table or Query Listing */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-3xs overflow-hidden">
        
        {/* Search header bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-9 pr-4 py-2 w-full border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white font-sans"
            />
          </div>
          <span className="text-xs text-gray-500 font-medium font-sans shrink-0">
            {filteredTenants.length} Arrendatarios
          </span>
        </div>

        {/* Desktop List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100/50 border-b border-gray-200 text-gray-600 font-semibold">
                <th className="p-4 font-sans text-gray-500">Nombre</th>
                <th className="p-4 font-sans text-gray-500">Documento Cédula</th>
                <th className="p-4 font-sans text-gray-500">Teléfono</th>
                <th className="p-4 font-sans text-gray-500">Email</th>
                <th className="p-4 font-sans text-gray-500">Expediente Cédula</th>
                <th className="p-4 font-sans text-gray-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredTenants.map((t) => (
                <tr key={t.documento} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-950 font-sans">{t.nombre}</td>
                  <td className="p-4 font-mono">{t.documento}</td>
                  <td className="p-4 text-gray-600">{t.telefono}</td>
                  <td className="p-4 text-gray-600">{t.email}</td>
                  <td className="p-4">
                    {t.archivoCedulaNombre ? (
                      <a 
                        href="#download" 
                        onClick={(e) => { e.preventDefault(); alert(`Descargando copia segura de ID: ${t.archivoCedulaNombre}`); }}
                        className="inline-flex items-center gap-1.5 font-sans font-semibold text-indigo-600 hover:text-indigo-800"
                        title={t.archivoCedulaNombre}
                      >
                        <FileDown size={14} /> ID_Digital.pdf
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">No cargada</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleEdit(t)}
                        className="p-1 px-2.5 inline-flex items-center gap-1.5 text-indigo-700 hover:bg-indigo-50 font-semibold rounded-lg transition-colors font-sans"
                      >
                        <Edit2 size={11} /> Editar
                      </button>

                      {confirmingDeleteId === (t.id || t.documento) ? (
                        <span className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              try {
                                await onDelete(t.id || t.documento);
                                setConfirmingDeleteId(null);
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="px-2 py-1 text-[10px] bg-rose-600 text-white rounded-md font-bold transition-colors hover:bg-rose-700"
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setConfirmingDeleteId(null)}
                            className="px-2 py-1 text-[10px] bg-gray-100 text-gray-500 rounded-md font-semibold transition-colors hover:bg-gray-200"
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmingDeleteId(t.id || t.documento)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar Arrendatario"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredTenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-400 font-sans">
                    <Users size={32} className="mx-auto text-gray-300 mb-2" />
                    <span className="text-xs font-semibold block">Ningún arrendatario coincide</span>
                    <span className="text-[10px] text-gray-400">Verifique los filtros introducidos</span>
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
