import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Users, 
  FileText, 
  Receipt, 
  CircleDollarSign, 
  Wrench, 
  FileSignature, 
  LayoutDashboard, 
  LogIn, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck,
  CheckCircle,
  Cloud,
  Database,
  RefreshCw,
  AlertCircle,
  Smartphone,
  Settings
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';

import { 
  dbService, 
  auth, 
  googleProvider, 
  checkAndSeedDatabase,
  testConnection,
  isSystemOwnerOrAuthorized,
  refreshAuthorizedEmails
} from './lib/firebase';
import { Property, Tenant, Contract, Receipt as ReceiptType, Expense, Incident } from './types';

// Components
import DashboardHome from './components/DashboardHome';
import PropertyManager from './components/PropertyManager';
import TenantManager from './components/TenantManager';
import ContractManager from './components/ContractManager';
import ReceiptManager from './components/ReceiptManager';
import ExpenseManager from './components/ExpenseManager';
import IncidentManager from './components/IncidentManager';
import LiquidationManager from './components/LiquidationManager';
import SyncManager from './components/SyncManager';
import ConfigManager from './components/ConfigManager';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Application database lists
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [receipts, setReceipts] = useState<ReceiptType[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const [dbLoading, setDbLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [syncingState, setSyncingState] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [isDbConnected, setIsDbConnected] = useState(true);

  // Checks if they are one of the two root owners
  const isExactOwner = user?.email?.toLowerCase() === 'arias.guerraa@gmail.com' || user?.email?.toLowerCase() === 'arias.guerra@gmail.com';
  const isAuthOrOwner = isSystemOwnerOrAuthorized(user?.email);

  const sanitizeEmail = (email: string | null | undefined) => {
    if (!email) return '';
    const low = email.toLowerCase();
    if (low.includes('arias') || low.includes('guerra') || low.includes('gmail.com')) {
      return 'Administrador Inmobiliario';
    }
    return email;
  };

  // 1. Fetch all data lists from our robust dbService (handles Firestore vs localStorage fallbacks)
  const fetchAllData = useCallback(async () => {
    setDbLoading(true);
    setErrorMessage('');
    try {
      // Parallel execution for fast boot
      const [propsList, tenantsList, contractsList, receiptsList, expensesList, incidentsList] = await Promise.all([
        dbService.getProperties(),
        dbService.getTenants(),
        dbService.getContracts(),
        dbService.getReceipts(),
        dbService.getExpenses(),
        dbService.getIncidents()
      ]);

      // Dynamically align root estado of subdivided properties based on their subunits
      const synchronizedProperties = propsList.map(prop => {
        if (prop.subPartes && prop.subPartes.length > 0) {
          const allRentedOrMaint = prop.subPartes.every(sub => sub.estado === 'Arrendado' || sub.estado === 'Mantenimiento');
          const anyRented = prop.subPartes.some(sub => sub.estado === 'Arrendado');
          const allMaint = prop.subPartes.every(sub => sub.estado === 'Mantenimiento');
          
          let nextEstado: 'Disponible' | 'Arrendado' | 'Mantenimiento' = 'Disponible';
          if (allRentedOrMaint && anyRented) {
            nextEstado = 'Arrendado';
          } else if (allMaint) {
            nextEstado = 'Mantenimiento';
          } else {
            nextEstado = 'Disponible';
          }
          return {
            ...prop,
            estado: nextEstado
          };
        }
        return prop;
      });

      setProperties(synchronizedProperties);
      setTenants(tenantsList);
      setContracts(contractsList);
      setReceipts(receiptsList);
      setExpenses(expensesList);
      setIncidents(incidentsList);
    } catch (e: any) {
      setErrorMessage('Error al sincronizar datos: ' + (e.message || String(e)));
    } finally {
      setDbLoading(false);
    }
  }, []);

  const handleSyncLocalData = async () => {
    setSyncingState('running');
    setSyncStatusMsg('Verificando conexión con Firebase Cloud Firestore...');
    try {
      const res = await dbService.syncLocalDataToServer();
      if (res.success) {
        setSyncingState('success');
        setSyncStatusMsg(res.message);
        setIsDbConnected(true);
        await fetchAllData();
      } else {
        setSyncingState('failed');
        setSyncStatusMsg(res.message);
      }
    } catch (e: any) {
      setSyncingState('failed');
      setSyncStatusMsg('Error durante la sincronización: ' + (e.message || String(e)));
    }
  };

  const handleWipeDatabase = async () => {
    if (!window.confirm("¿Está seguro de que desea eliminar absolutamente TODOS los datos de la base de datos (tanto local como en la nube)? Esto restablecerá la aplicación a su estado inicial TOTALMENTE LIMPIO Y VACÍO para ingresar su información real.")) {
      return;
    }
    setDbLoading(true);
    setSyncingState('running');
    setSyncStatusMsg('Eliminando todos los registros de Firestore y caché local...');
    try {
      const res = await dbService.wipeAllData();
      if (res.success) {
        setSyncingState('idle');
        setSyncStatusMsg(res.message);
        setIsDbConnected(true);
        // Do not seed anymore, keep it completely clean!
        await fetchAllData();
        alert(res.message + " La base de datos y la caché han sido totalmente limpiadas. Ahora puedes comenzar a ingresar tus datos desde cero.");
      } else {
        setSyncingState('failed');
        setSyncStatusMsg(res.message);
        alert(res.message);
      }
    } catch (e: any) {
      setSyncingState('failed');
      setSyncStatusMsg('Error al borrar los datos: ' + (e.message || String(e)));
      alert('Error al borrar la base de datos: ' + (e.message || String(e)));
    } finally {
      setDbLoading(false);
    }
  };

  // 2. Initialize App, trigger Firebase connection and database seeder
  useEffect(() => {
    let active = true;
    const initApp = async () => {
      // Clear old browser local caches once to prevent displaying previous database demo/cached values
      if (localStorage.getItem('property_management_db_ver') !== 'v5') {
        localStorage.removeItem('local_properties');
        localStorage.removeItem('local_tenants');
        localStorage.removeItem('local_contracts');
        localStorage.removeItem('local_receipts');
        localStorage.removeItem('local_expenses');
        localStorage.removeItem('local_incidents');
        localStorage.removeItem('local_liquidations');
        localStorage.setItem('property_management_db_ver', 'v5');
        console.log("Old browser local caches successfully cleared for fresh v5 database!");
      }

      // 1. Fetch from local/offline caches immediately so the user doesn't wait
      if (active) {
        await fetchAllData();
      }

      // 2. Run Firestore seeding and connection check in the background
      try {
        await checkAndSeedDatabase();
        if (!active) return;
        const connected = await testConnection();
        if (!active) return;
        setIsDbConnected(connected);
        if (connected) {
          // Silent refresh of data now that we are connected to Firestore
          await fetchAllData();
        }
      } catch (err) {
        console.warn("Background cloud initialization issue ignored:", err);
      }
    };

    initApp();

    // Track user sign-in state via Firebase Auth according to skill guidelines safely
    let unsubscribe = () => {};
    if (auth) {
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!active) return;
        
        await refreshAuthorizedEmails();
        setUser(currentUser);
        setAuthLoading(false);
        
        // Re-verify cloud connection status based on current user privileges inside background
        try {
          const connected = await testConnection();
          if (!active) return;
          setIsDbConnected(connected);
          await fetchAllData();
        } catch (err) {
          console.warn("Background auth state refresh failed, keeping active cache:", err);
        }
      });
    } else {
      setAuthLoading(false);
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, [fetchAllData]);

  // Auth logins
  const handleLogin = async () => {
    if (!auth) {
      alert("La autenticación en la nube no está disponible porque el pool de autenticación o la base de datos no se inicializó correctamente.");
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      alert("Error al ingresar con Google Auth: " + (e.message || String(e)));
    }
  };

  const handleLogout = async () => {
    if (!auth) {
      setUser(null);
      await fetchAllData();
      return;
    }
    try {
      await signOut(auth);
      // Reset local cache clear triggers
      localStorage.removeItem('local_properties');
      localStorage.removeItem('local_tenants');
      localStorage.removeItem('local_contracts');
      localStorage.removeItem('local_receipts');
      localStorage.removeItem('local_expenses');
      localStorage.removeItem('local_incidents');
      await fetchAllData();
    } catch (e: any) {
      alert("Error al desconectar: " + (e.message || String(e)));
    }
  };

  // State handlers to send updates straight to the database service
  const handleAddProperty = async (prop: Property) => {
    try {
      setErrorMessage('');
      const fresh = await dbService.saveProperty(prop);
      setProperties(prev => [...prev, fresh]);
    } catch (e: any) {
      setErrorMessage('Error al guardar el inmueble: ' + (e.message || String(e)));
    }
  };

  const handleUpdateProperty = async (id: string, prop: Partial<Property>) => {
    try {
      setErrorMessage('');
      await dbService.updateProperty(id, prop);
      setProperties(prev => prev.map(p => (p.id === id || p.codigo === id) ? { ...p, ...prop } : p));
    } catch (e: any) {
      setErrorMessage('Error al actualizar el inmueble: ' + (e.message || String(e)));
    }
  };

  const handleAddTenant = async (tenant: Tenant) => {
    try {
      setErrorMessage('');
      const fresh = await dbService.saveTenant(tenant);
      setTenants(prev => [...prev, fresh]);
    } catch (e: any) {
      setErrorMessage('Error al guardar el inquilino: ' + (e.message || String(e)));
    }
  };

  const handleUpdateTenant = async (id: string, tenant: Partial<Tenant>) => {
    try {
      setErrorMessage('');
      await dbService.updateTenant(id, tenant);
      setTenants(prev => prev.map(t => (t.id === id || t.documento === id) ? { ...t, ...tenant } : t));
    } catch (e: any) {
      setErrorMessage('Error al actualizar el inquilino: ' + (e.message || String(e)));
    }
  };

  const syncPropertyAndSubUnits = async (
    propertyCodigo: string,
    currentContracts: Contract[],
    currentProperties: Property[]
  ) => {
    try {
      const prop = currentProperties.find(p => p.codigo === propertyCodigo);
      if (!prop) return;

      // Filter contracts for this property that are active ("Vigente")
      const activeContracts = currentContracts.filter(
        c => c.codigoPropiedad === propertyCodigo && c.estado === 'Vigente'
      );

      // If there is any contract representing the entire property (no subParteId set)
      const rentsWholeProperty = activeContracts.some(c => !c.subParteId);

      let nextPropStatus: 'Disponible' | 'Arrendado' | 'Mantenimiento' = 'Disponible';
      let nextSubPartes = prop.subPartes ? [...prop.subPartes] : [];

      if (rentsWholeProperty) {
        nextPropStatus = 'Arrendado';
        nextSubPartes = nextSubPartes.map(sub => ({ ...sub, estado: 'Arrendado' as const }));
      } else if (nextSubPartes.length > 0) {
        // Manage sub-parts based on contract matches
        nextSubPartes = nextSubPartes.map(sub => {
          const subHasActiveContract = activeContracts.some(c => c.subParteId === sub.id);
          if (sub.estado === 'Mantenimiento' && !subHasActiveContract) {
            return sub;
          }
          return {
            ...sub,
            estado: subHasActiveContract ? ('Arrendado' as const) : ('Disponible' as const)
          };
        });

        // Property status is Rented if all subunits are rented
        const allRentedOrMaint = nextSubPartes.every(sub => sub.estado === 'Arrendado' || sub.estado === 'Mantenimiento');
        const anyRented = nextSubPartes.some(sub => sub.estado === 'Arrendado');
        if (allRentedOrMaint && anyRented) {
          nextPropStatus = 'Arrendado';
        } else {
          nextPropStatus = 'Disponible';
        }
      } else {
        // Single unit property
        const hasActiveWholeContract = activeContracts.some(c => !c.subParteId);
        if (hasActiveWholeContract) {
          nextPropStatus = 'Arrendado';
        } else if (prop.estado === 'Mantenimiento') {
          nextPropStatus = 'Mantenimiento';
        } else {
          nextPropStatus = 'Disponible';
        }
      }

      // Update database
      await dbService.updateProperty(prop.id || prop.codigo, {
        estado: nextPropStatus,
        subPartes: nextSubPartes
      });

      // Update local state
      setProperties(prev => prev.map(p => (p.id === prop.id || p.codigo === prop.codigo) ? {
        ...p,
        estado: nextPropStatus,
        subPartes: nextSubPartes
      } : p));
    } catch (e: any) {
      setErrorMessage('Error al sincronizar el inmueble: ' + (e.message || String(e)));
    }
  };

  const handleAddContract = async (contract: Contract) => {
    try {
      setErrorMessage('');
      const fresh = await dbService.saveContract(contract);
      setContracts(prev => {
        const updated = [...prev, fresh];
        syncPropertyAndSubUnits(contract.codigoPropiedad, updated, properties);
        return updated;
      });
    } catch (e: any) {
      setErrorMessage('Error al registrar el contrato: ' + (e.message || String(e)));
    }
  };

  const handleUpdateContract = async (id: string, contract: Partial<Contract>) => {
    try {
      setErrorMessage('');
      await dbService.updateContract(id, contract);
      setContracts(prev => {
        const updated = prev.map(c => c.id === id ? { ...c, ...contract } : c);
        const updatedContract = updated.find(c => c.id === id);
        if (updatedContract) {
          syncPropertyAndSubUnits(updatedContract.codigoPropiedad, updated, properties);
        }
        return updated;
      });
    } catch (e: any) {
      setErrorMessage('Error al actualizar el contrato: ' + (e.message || String(e)));
    }
  };

  const handleAddReceipt = async (receipt: ReceiptType) => {
    try {
      setErrorMessage('');
      const fresh = await dbService.saveReceipt(receipt);
      setReceipts(prev => [fresh, ...prev]);
    } catch (e: any) {
      setErrorMessage('Error al guardar el recibo: ' + (e.message || String(e)));
    }
  };

  const handleAddExpense = async (expense: Expense) => {
    try {
      setErrorMessage('');
      const fresh = await dbService.saveExpense(expense);
      setExpenses(prev => [...prev, fresh]);
    } catch (e: any) {
      setErrorMessage('Error al guardar el egreso: ' + (e.message || String(e)));
    }
  };

  const handleAddIncident = async (incident: Incident) => {
    try {
      setErrorMessage('');
      const fresh = await dbService.saveIncident(incident);
      setIncidents(prev => [...prev, fresh]);
      // Dynamically flag property state to maintenance
      await dbService.updateProperty(incident.codigoPropiedad, { estado: 'Mantenimiento' });
      setProperties(prev => prev.map(p => p.codigo === incident.codigoPropiedad ? { ...p, estado: 'Mantenimiento' } : p));
    } catch (e: any) {
      setErrorMessage('Error al reportar el daño: ' + (e.message || String(e)));
    }
  };

  const handleUpdateIncident = async (id: string, inc: Partial<Incident>) => {
    try {
      setErrorMessage('');
      await dbService.updateIncident(id, inc);
      setIncidents(prev => prev.map(item => item.id === id ? { ...item, ...inc } : item));
      
      // If resolved, restore state to Disponible
      if (inc.estado === 'Resuelto') {
        const ticket = incidents.find(i => i.id === id);
        if (ticket) {
          await dbService.updateProperty(ticket.codigoPropiedad, { estado: 'Disponible' });
          setProperties(prev => prev.map(p => p.codigo === ticket.codigoPropiedad ? { ...p, estado: 'Disponible' } : p));
        }
      }
    } catch (e: any) {
      setErrorMessage('Error al actualizar el reporte de daño: ' + (e.message || String(e)));
    }
  };

  const handleDeleteProperty = async (id: string) => {
    try {
      setErrorMessage('');
      await dbService.deleteProperty(id);
      setProperties(prev => prev.filter(p => p.id !== id && p.codigo !== id));
    } catch (e: any) {
      setErrorMessage('Error al eliminar el inmueble: ' + (e.message || String(e)));
    }
  };

  const handleDeleteTenant = async (id: string) => {
    try {
      setErrorMessage('');
      await dbService.deleteTenant(id);
      setTenants(prev => prev.filter(t => t.id !== id && t.documento !== id));
    } catch (e: any) {
      setErrorMessage('Error al eliminar el inquilino: ' + (e.message || String(e)));
    }
  };

  const handleDeleteContract = async (id: string) => {
    try {
      setErrorMessage('');
      const deletedC = contracts.find(c => c.id === id);
      await dbService.deleteContract(id);
      setContracts(prev => {
        const updated = prev.filter(c => c.id !== id);
        if (deletedC) {
          syncPropertyAndSubUnits(deletedC.codigoPropiedad, updated, properties);
        }
        return updated;
      });
    } catch (e: any) {
      setErrorMessage('Error al eliminar el contrato: ' + (e.message || String(e)));
    }
  };

  const handleDeleteReceipt = async (id: string) => {
    try {
      setErrorMessage('');
      await dbService.deleteReceipt(id);
      setReceipts(prev => prev.filter(r => r.id !== id));
    } catch (e: any) {
      setErrorMessage('Error al eliminar el recibo: ' + (e.message || String(e)));
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      setErrorMessage('');
      await dbService.deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (e: any) {
      setErrorMessage('Error al eliminar el egreso: ' + (e.message || String(e)));
    }
  };

  const handleDeleteIncident = async (id: string) => {
    try {
      setErrorMessage('');
      await dbService.deleteIncident(id);
      setIncidents(prev => prev.filter(i => i.id !== id));
    } catch (e: any) {
      setErrorMessage('Error al eliminar el reporte de daño: ' + (e.message || String(e)));
    }
  };

  // Rendering correct component based on active navigation tab
  const renderTabContent = () => {
    if (dbLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-16 space-y-4 text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600 border-r-2" />
          <span className="text-xs font-mono font-medium">Cargando registros de información...</span>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardHome 
            properties={properties} 
            tenants={tenants} 
            contracts={contracts} 
            receipts={receipts} 
            expenses={expenses} 
            incidents={incidents}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case 'config':
        return (
          <SyncManager 
            properties={properties} 
            tenants={tenants} 
            contracts={contracts} 
            receipts={receipts} 
            expenses={expenses} 
            incidents={incidents}
            onSyncLocalData={handleSyncLocalData}
            onWipeDatabase={handleWipeDatabase}
            syncingState={syncingState}
            syncStatusMsg={syncStatusMsg}
            isDbConnected={isDbConnected}
          />
        );
      case 'properties':
        return (
          <PropertyManager 
            properties={properties} 
            onAdd={handleAddProperty} 
            onUpdate={handleUpdateProperty} 
            onDelete={handleDeleteProperty}
          />
        );
      case 'tenants':
        return (
          <TenantManager 
            tenants={tenants} 
            onAdd={handleAddTenant} 
            onUpdate={handleUpdateTenant} 
            onDelete={handleDeleteTenant}
          />
        );
      case 'contracts':
        return (
          <ContractManager 
            contracts={contracts} 
            properties={properties} 
            tenants={tenants} 
            onAdd={handleAddContract} 
            onUpdate={handleUpdateContract} 
            onDelete={handleDeleteContract}
          />
        );
      case 'receipts':
        return (
          <ReceiptManager 
            receipts={receipts} 
            contracts={contracts} 
            properties={properties} 
            tenants={tenants} 
            onAdd={handleAddReceipt} 
            onDelete={handleDeleteReceipt}
          />
        );
      case 'expenses':
        return (
          <ExpenseManager 
            expenses={expenses} 
            properties={properties} 
            onAdd={handleAddExpense} 
            onDelete={handleDeleteExpense}
          />
        );
      case 'incidents':
        return (
          <IncidentManager 
            incidents={incidents} 
            properties={properties} 
            onAdd={handleAddIncident} 
            onUpdate={handleUpdateIncident} 
            onDelete={handleDeleteIncident}
          />
        );
      case 'liquidations':
        return (
          <LiquidationManager 
            contracts={contracts} 
            properties={properties} 
            tenants={tenants} 
          />
        );
      case 'access':
        return isExactOwner ? <ConfigManager /> : <div className="p-10 text-center">Acceso denegado.</div>;
      default:
        return <div className="text-sm p-10 text-center">Módulo de sistema no encontrado.</div>;
    }
  };

  const navMenuItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'properties', label: 'Inmuebles', icon: Building2 },
    { id: 'tenants', label: 'Arrendatarios', icon: Users },
    { id: 'contracts', label: 'Contratos', icon: FileText },
    { id: 'receipts', label: 'Recibos y Pagos', icon: Receipt },
    { id: 'expenses', label: 'Egresos y Servicios', icon: CircleDollarSign },
    { id: 'incidents', label: 'Daños y Averías', icon: Wrench },
    { id: 'liquidations', label: 'Liquidaciones', icon: FileSignature },
    ...(isExactOwner ? [
      { id: 'config', label: 'Sistema / Base de Datos', icon: Settings },
      { id: 'access', label: 'Acceso y Permisos', icon: ShieldCheck }
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-gray-800 antialiased font-sans transition-all">
      
      {/* 1. SIDEBAR NAVIGATION - DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 no-print">
        
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600 text-white rounded-xl">
            <Building2 size={18} />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white font-sans">Gestión</h1>
            <p className="text-[10px] text-indigo-400 font-mono tracking-wider font-semibold">INMOBILIARIA</p>
          </div>
        </div>

        {/* User Identity info bar */}
        <div className="p-4 mx-4 my-3 bg-slate-800/60 border border-slate-800 rounded-xl space-y-2">
          {authLoading ? (
            <span className="text-[10px] text-gray-500 font-mono">Buscando sesión...</span>
          ) : user ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-sans font-bold text-white uppercase tracking-wider block">Sesión Activa</span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono truncate" title={sanitizeEmail(user.email)}>{sanitizeEmail(user.email)}</p>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold text-rose-400 hover:text-rose-300 bg-slate-900 border border-slate-800 hover:border-slate-700 py-1 rounded-md transition-colors"
              >
                <LogOut size={10} /> Cerrar Sesión
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-slate-300 block">Invitado / Modo Demo</span>
              </div>
              <p className="text-[9px] text-slate-500 leading-normal">
                Ingrese con su cuenta para guardar el portafolio en su perfil seguro.
              </p>
              <button 
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 py-1.5 rounded-lg transition-colors shadow-xs"
              >
                <LogIn size={11} /> Ingresar con Google
              </button>
            </div>
          )}
        </div>

        {/* Regular Menu List */}
        <nav className="flex-1 px-4 py-2 space-y-1">
          {navMenuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <IconComponent size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info brand */}
        <div className="p-4 border-t border-slate-800/80 text-center font-mono text-[9px] text-slate-500 uppercase tracking-widest">
          SYSTEM V1.0.1 2026
        </div>

      </aside>

      {/* 2. MOBILE TOP BANNER HEADER */}
      <header className="md:hidden flex justify-between items-center bg-slate-900 text-white p-4 shrink-0 no-print">
        <div className="flex items-center gap-2">
          <Building2 className="text-indigo-400" size={18} />
          <span className="font-bold text-xs">Gestión Inmobiliaria</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1 text-slate-300 hover:text-white"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* MOBILE DRILLDOWN OVERLAY DRAW */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-900 text-slate-300 p-4 border-b border-slate-800 flex flex-col space-y-3 no-print">
          
          <div className="p-3 bg-slate-800 rounded-lg text-center">
            {user ? (
              <div className="text-center space-y-1.5">
                <span className="text-[9px] text-emerald-400 font-bold block block mb-0.5">SESIÓN ACTIVA</span>
                <span className="text-[10px] text-white block truncate">{sanitizeEmail(user.email)}</span>
                <button 
                  onClick={handleLogout}
                  className="text-[10px] font-semibold text-rose-400 underline block mx-auto pt-1"
                >
                  Cerrar Sesión Google
                </button>
              </div>
            ) : (
              <div className="text-center space-y-1.5">
                <span className="text-[9px] text-indigo-400 font-bold block">INVITADO / DEMO</span>
                <button 
                  onClick={handleLogin}
                  className="px-4 py-1.5 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
                >
                  Ingresar con Google
                </button>
              </div>
            )}
          </div>

          <nav className="flex flex-col space-y-1">
            {navMenuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-3 p-2.5 text-xs font-semibold rounded-lg ${
                    isActive 
                      ? 'bg-indigo-600 text-white' 
                      : 'hover:bg-slate-800'
                  }`}
                >
                  <IconComponent size={14} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* 3. MAIN WORKPLACE WORK AREA */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-0">

        {/* Sync loading alert */}
        {dbLoading && (
          <div className="mb-4 p-3 bg-amber-50 text-amber-800 b-amber-100 border text-xs flex items-center gap-2 rounded-xl">
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-amber-600 border-r-2" />
            <span>Cargando registros, espere por favor...</span>
          </div>
        )}

        {/* Global Error message flag */}
        {errorMessage && (
          <div className="mb-5 p-3 bg-red-50 text-red-700 border border-red-100 text-xs rounded-xl font-medium">
            {errorMessage}
          </div>
        )}

        {user && (
          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800 flex justify-between items-center">
            <span>Debug Email: <strong>{user?.email}</strong></span>
            <span>RootOwner: {isExactOwner ? 'Sí' : 'No'} | Autorizado: {isAuthOrOwner ? 'Sí' : 'No'}</span>
          </div>
        )}

        {/* Actual Dynamic Work Render */}
        <div className="fade-in">
          {renderTabContent()}
        </div>

      </main>

      {/* Automatic saving is active; no manual action button required */}

    </div>
  );
}
