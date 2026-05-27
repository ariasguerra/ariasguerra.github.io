import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocFromServer,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';

import firebaseConfig from '../../firebase-applet-config.json';
import { 
  initialProperties, 
  initialTenants, 
  initialReceipts, 
  initialContracts, 
  initialExpenses 
} from './seedData';
import { Property, Tenant, Receipt, Contract, Expense, Incident } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error Handling according to Phase 3 of the firebase-integration skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Track last known firestore connection error for better user diagnostics
export let lastConnectionError: string | null = null;

// Helper to race a promise with a timeout to force fast offline/cache fallbacks
export function withTimeout<T>(promise: Promise<T>, ms = 6000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

// Test connection mandatory validation
export async function testConnection() {
  try {
    // Check against properties collection which is publicly readable, preventing rule-based permission-denied errors
    await withTimeout(getDocFromServer(doc(db, 'properties', 'test_connection')), 6000);
    console.log("Firebase Connection: OK");
    lastConnectionError = null;
    return true;
  } catch (error: any) {
    console.warn("Firestore connection test failed:", error);
    lastConnectionError = error instanceof Error ? error.message : String(error);
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration. Currently offline.");
    }
    return false;
  }
}

// Seeder function to auto-populate provided data when collections are empty or missing properties
export async function checkAndSeedDatabase() {
  const hasPurged = localStorage.getItem('property_management_seed_purged_v5') === 'true';
  if (!hasPurged) {
    console.log("One-time automatic purge of old mock/preset sample data initiated...");
    
    // Clear localStorage caches immediately
    localStorage.removeItem('local_properties');
    localStorage.removeItem('local_tenants');
    localStorage.removeItem('local_contracts');
    localStorage.removeItem('local_receipts');
    localStorage.removeItem('local_expenses');
    localStorage.removeItem('local_incidents');
    localStorage.removeItem('local_liquidations');
    
    localStorage.removeItem('sync_deleted_properties');
    localStorage.removeItem('sync_deleted_tenants');
    localStorage.removeItem('sync_deleted_contracts');
    localStorage.removeItem('sync_deleted_receipts');
    localStorage.removeItem('sync_deleted_expenses');
    localStorage.removeItem('sync_deleted_incidents');
    
    localStorage.setItem('property_management_bypass_seeding', 'true');
    localStorage.setItem('property_management_seed_purged_v5', 'true');

    // Wipe Firestore collections of any preloaded documents
    const collections = ['properties', 'tenants', 'contracts', 'receipts', 'expenses', 'incidents', 'liquidations'];
    for (const colName of collections) {
      try {
        const snap = await getDocs(collection(db, colName));
        for (const docSnap of snap.docs) {
          await deleteDoc(doc(db, colName, docSnap.id));
        }
      } catch (err) {
        console.warn(`Firestore automatic purge failed for ${colName}:`, err);
      }
    }
    
    try {
      await setDoc(doc(db, 'metadata', 'seeding_status'), { bypassed: true });
    } catch (err) {
      console.warn("Could not save server seeding status:", err);
    }
  }

  // Force bypass of any automatic backfills/reseeding
  localStorage.setItem('property_management_bypass_seeding', 'true');
}

/**
 * Robust Database Interface that handles Firestore with transparent localStorage fallback
 * so that both guests, offline browsers, and authenticated users get an absolute high fidelity experience.
 */
export const dbService = {
  // Properties CRUD
  async getProperties(): Promise<Property[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'properties')), 1500);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Property));
      localStorage.setItem('local_properties', JSON.stringify(list));
      return list;
    } catch (e) {
      console.warn("Firestore fetch failed, falling back to local properties", e);
    }
    
    // Fallback
    const local = localStorage.getItem('local_properties');
    const bypass = localStorage.getItem('property_management_bypass_seeding') === 'true';
    if (local) {
      const parsed = JSON.parse(local) as Property[];
      if (bypass) {
        return parsed;
      }
      // Self-healing for local storage
      const existingCodigos = new Set(parsed.map(x => x.codigo));
      let modified = false;
      const updatedList = [...parsed];
      for (const p of initialProperties) {
        if (!existingCodigos.has(p.codigo)) {
          updatedList.push({
            ...p,
            id: `prop_seed_${p.codigo}`
          });
          modified = true;
        }
      }
      if (modified) {
        localStorage.setItem('local_properties', JSON.stringify(updatedList));
      }
      return updatedList;
    }
    if (bypass) {
      return [];
    }
    const withIds = initialProperties.map((p, i) => ({
      ...p,
      id: p.id || `prop_seed_${p.codigo || i}`
    }));
    localStorage.setItem('local_properties', JSON.stringify(withIds));
    return withIds;
  },

  async saveProperty(p: Property): Promise<Property> {
    try {
      const ref = await withTimeout(addDoc(collection(db, 'properties'), p), 2000);
      return { id: ref.id, ...p };
    } catch (e) {
      console.warn("Firestore saveProperty failed, using local storage", e);
      const list = await this.getProperties();
      const newP = { ...p, id: 'prop_' + Date.now() };
      list.push(newP);
      localStorage.setItem('local_properties', JSON.stringify(list));
      return newP;
    }
  },

  async updateProperty(id: string, p: Partial<Property>): Promise<void> {
    try {
      if (!id.startsWith('prop_') && !id.startsWith('prop_seed_')) {
        await withTimeout(updateDoc(doc(db, 'properties', id), p), 2000);
      }
    } catch (e) {
      console.warn("Firestore updateProperty failed, using local storage", e);
    }
    // Local fallback
    const list = await this.getProperties();
    const idx = list.findIndex(item => item.id === id || item.codigo === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...p };
      localStorage.setItem('local_properties', JSON.stringify(list));
    }
  },

  async deleteProperty(id: string): Promise<void> {
    try {
      if (id && !id.startsWith('prop_') && !id.startsWith('prop_seed_')) {
        await withTimeout(deleteDoc(doc(db, 'properties', id)), 2000);
      }
    } catch (e: any) {
      console.warn("Firestore deleteProperty failed, using local storage", e);
      const isAuthError = e instanceof Error && (e.message.includes('permission') || e.message.includes('Rule'));
      if (isAuthError) throw e;
    }
    // Track deleted ID for syncing
    if (id && !id.startsWith('prop_') && !id.startsWith('prop_seed_')) {
      const deleted = JSON.parse(localStorage.getItem('sync_deleted_properties') || '[]');
      if (!deleted.includes(id)) {
        deleted.push(id);
        localStorage.setItem('sync_deleted_properties', JSON.stringify(deleted));
      }
    }
    // Local fallback
    const list = await this.getProperties();
    const filtered = list.filter(item => item.id !== id && item.codigo !== id);
    localStorage.setItem('local_properties', JSON.stringify(filtered));
  },

  // Tenants CRUD
  async getTenants(): Promise<Tenant[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'tenants')), 1500);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Tenant));
      localStorage.setItem('local_tenants', JSON.stringify(list));
      return list;
    } catch (e) {
      console.warn("Firestore fetch tenants failed, falling back to local tenants", e);
    }
    
    // Fallback
    const local = localStorage.getItem('local_tenants');
    const bypass = localStorage.getItem('property_management_bypass_seeding') === 'true';
    if (local) {
      const parsed = JSON.parse(local);
      const withIds = parsed.map((t: any, i: number) => ({
        ...t,
        id: t.id || `ten_seed_${t.documento || i}`
      }));
      return withIds;
    }
    if (bypass) {
      return [];
    }
    const withIds = initialTenants.map((t, i) => ({
      ...t,
      id: t.id || `ten_seed_${t.documento || i}`
    }));
    localStorage.setItem('local_tenants', JSON.stringify(withIds));
    return withIds;
  },

  async saveTenant(t: Tenant): Promise<Tenant> {
    try {
      const ref = await withTimeout(addDoc(collection(db, 'tenants'), t), 2000);
      return { id: ref.id, ...t };
    } catch (e) {
      console.warn("Firestore saveTenant failed, using local storage", e);
      const list = await this.getTenants();
      const newT = { ...t, id: 'ten_' + Date.now() };
      list.push(newT);
      localStorage.setItem('local_tenants', JSON.stringify(list));
      return newT;
    }
  },

  async updateTenant(id: string, t: Partial<Tenant>): Promise<void> {
    try {
      if (!id.startsWith('ten_') && !id.startsWith('ten_seed_')) {
        await withTimeout(updateDoc(doc(db, 'tenants', id), t), 2000);
      }
    } catch (e) {
      console.warn("Firestore updateTenant failed, using local storage", e);
    }
    // Local fallback
    const list = await this.getTenants();
    const idx = list.findIndex(item => item.id === id || item.documento === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...t };
      localStorage.setItem('local_tenants', JSON.stringify(list));
    }
  },

  async deleteTenant(id: string): Promise<void> {
    try {
      if (id && !id.startsWith('ten_') && !id.startsWith('ten_seed_')) {
        await withTimeout(deleteDoc(doc(db, 'tenants', id)), 2000);
      }
    } catch (e: any) {
      console.warn("Firestore deleteTenant failed, using local storage", e);
      const isAuthError = e instanceof Error && (e.message.includes('permission') || e.message.includes('Rule'));
      if (isAuthError) throw e;
    }
    // Track deleted ID for syncing
    if (id && !id.startsWith('ten_') && !id.startsWith('ten_seed_')) {
      const deleted = JSON.parse(localStorage.getItem('sync_deleted_tenants') || '[]');
      if (!deleted.includes(id)) {
        deleted.push(id);
        localStorage.setItem('sync_deleted_tenants', JSON.stringify(deleted));
      }
    }
    // Local fallback
    const list = await this.getTenants();
    const filtered = list.filter(item => item.id !== id && item.documento !== id);
    localStorage.setItem('local_tenants', JSON.stringify(filtered));
  },

  // Receipts CRUD
  async getReceipts(): Promise<Receipt[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'receipts')), 1500);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Receipt));
      const sorted = list.sort((a,b) => b.fechaPago.localeCompare(a.fechaPago));
      localStorage.setItem('local_receipts', JSON.stringify(sorted));
      return sorted;
    } catch (e) {
      console.warn("Firestore fetch receipts failed, falling back to local receipts", e);
    }
    
    // Fallback
    const local = localStorage.getItem('local_receipts');
    if (local) return JSON.parse(local);
    const bypass = localStorage.getItem('property_management_bypass_seeding') === 'true';
    if (bypass) {
      return [];
    }
    localStorage.setItem('local_receipts', JSON.stringify(initialReceipts));
    return initialReceipts;
  },

  async saveReceipt(r: Receipt): Promise<Receipt> {
    try {
      const ref = await withTimeout(addDoc(collection(db, 'receipts'), r), 2000);
      return { id: ref.id, ...r };
    } catch (e) {
      console.warn("Firestore saveReceipt failed, using local storage", e);
      const list = await this.getReceipts();
      const newR = { ...r, id: 'rec_' + Date.now() };
      list.unshift(newR);
      localStorage.setItem('local_receipts', JSON.stringify(list));
      return newR;
    }
  },

  async deleteReceipt(id: string): Promise<void> {
    try {
      if (id && !id.startsWith('rec_')) {
        await withTimeout(deleteDoc(doc(db, 'receipts', id)), 2000);
      }
    } catch (e: any) {
      console.warn("Firestore deleteReceipt failed, using local storage", e);
      const isAuthError = e instanceof Error && (e.message.includes('permission') || e.message.includes('Rule'));
      if (isAuthError) throw e;
    }
    // Track deleted ID for syncing
    if (id && !id.startsWith('rec_')) {
      const deleted = JSON.parse(localStorage.getItem('sync_deleted_receipts') || '[]');
      if (!deleted.includes(id)) {
        deleted.push(id);
        localStorage.setItem('sync_deleted_receipts', JSON.stringify(deleted));
      }
    }
    // Local fallback
    const list = await this.getReceipts();
    const filtered = list.filter(item => item.id !== id);
    localStorage.setItem('local_receipts', JSON.stringify(filtered));
  },

  // Contracts CRUD
  async getContracts(): Promise<Contract[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'contracts')), 1500);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Contract));
      localStorage.setItem('local_contracts', JSON.stringify(list));
      return list;
    } catch (e) {
      console.warn("Firestore fetch contracts failed, falling back to local contracts", e);
    }
    
    // Fallback
    const local = localStorage.getItem('local_contracts');
    if (local) return JSON.parse(local);
    const bypass = localStorage.getItem('property_management_bypass_seeding') === 'true';
    if (bypass) {
      return [];
    }
    localStorage.setItem('local_contracts', JSON.stringify(initialContracts));
    return initialContracts;
  },

  async saveContract(c: Contract): Promise<Contract> {
    try {
      const ref = await withTimeout(addDoc(collection(db, 'contracts'), c), 2000);
      return { id: ref.id, ...c };
    } catch (e) {
      console.warn("Firestore saveContract failed, using local storage", e);
      const list = await this.getContracts();
      const newC = { ...c, id: 'con_' + Date.now() };
      list.push(newC);
      localStorage.setItem('local_contracts', JSON.stringify(list));
      return newC;
    }
  },

  async updateContract(id: string, c: Partial<Contract>): Promise<void> {
    try {
      if (!id.startsWith('con_')) {
        await withTimeout(updateDoc(doc(db, 'contracts', id), c), 2000);
      }
    } catch (e) {
      console.warn("Firestore updateContract failed, using local storage", e);
    }
    // Local fallback
    const list = await this.getContracts();
    const idx = list.findIndex(item => item.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...c };
      localStorage.setItem('local_contracts', JSON.stringify(list));
    }
  },

  async deleteContract(id: string): Promise<void> {
    try {
      if (id && !id.startsWith('con_')) {
        await withTimeout(deleteDoc(doc(db, 'contracts', id)), 2000);
      }
    } catch (e: any) {
      console.warn("Firestore deleteContract failed, using local storage", e);
      const isAuthError = e instanceof Error && (e.message.includes('permission') || e.message.includes('Rule'));
      if (isAuthError) throw e;
    }
    // Track deleted ID for syncing
    if (id && !id.startsWith('con_')) {
      const deleted = JSON.parse(localStorage.getItem('sync_deleted_contracts') || '[]');
      if (!deleted.includes(id)) {
        deleted.push(id);
        localStorage.setItem('sync_deleted_contracts', JSON.stringify(deleted));
      }
    }
    // Local fallback
    const list = await this.getContracts();
    const filtered = list.filter(item => item.id !== id);
    localStorage.setItem('local_contracts', JSON.stringify(filtered));
  },

  // Expenses CRUD
  async getExpenses(): Promise<Expense[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'expenses')), 1500);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
      localStorage.setItem('local_expenses', JSON.stringify(list));
      return list;
    } catch (e) {
      console.warn("Firestore fetch expenses failed, falling back to local expenses", e);
    }
    
    // Fallback
    const local = localStorage.getItem('local_expenses');
    if (local) return JSON.parse(local);
    const bypass = localStorage.getItem('property_management_bypass_seeding') === 'true';
    if (bypass) {
      return [];
    }
    localStorage.setItem('local_expenses', JSON.stringify(initialExpenses));
    return initialExpenses;
  },

  async saveExpense(ex: Expense): Promise<Expense> {
    try {
      const ref = await withTimeout(addDoc(collection(db, 'expenses'), ex), 2000);
      return { id: ref.id, ...ex };
    } catch (e) {
      console.warn("Firestore saveExpense failed, using local storage", e);
      const list = await this.getExpenses();
      const newEx = { ...ex, id: 'exp_' + Date.now() };
      list.push(newEx);
      localStorage.setItem('local_expenses', JSON.stringify(list));
      return newEx;
    }
  },

  async deleteExpense(id: string): Promise<void> {
    try {
      if (id && !id.startsWith('exp_')) {
        await withTimeout(deleteDoc(doc(db, 'expenses', id)), 2000);
      }
    } catch (e: any) {
      console.warn("Firestore deleteExpense failed, using local storage", e);
      const isAuthError = e instanceof Error && (e.message.includes('permission') || e.message.includes('Rule'));
      if (isAuthError) throw e;
    }
    // Track deleted ID for syncing
    if (id && !id.startsWith('exp_')) {
      const deleted = JSON.parse(localStorage.getItem('sync_deleted_expenses') || '[]');
      if (!deleted.includes(id)) {
        deleted.push(id);
        localStorage.setItem('sync_deleted_expenses', JSON.stringify(deleted));
      }
    }
    // Local fallback
    const list = await this.getExpenses();
    const filtered = list.filter(item => item.id !== id);
    localStorage.setItem('local_expenses', JSON.stringify(filtered));
  },

  // Incidents CRUD
  async getIncidents(): Promise<Incident[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'incidents')), 1500);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Incident));
      localStorage.setItem('local_incidents', JSON.stringify(list));
      return list;
    } catch (e) {
      console.warn("Firestore fetch incidents failed, falling back to local incidents", e);
    }
    
    // Fallback
    const local = localStorage.getItem('local_incidents');
    if (local) return JSON.parse(local);
    const bypass = localStorage.getItem('property_management_bypass_seeding') === 'true';
    if (bypass) {
      return [];
    }
    
    // Default mock incidents
    const initialIncidents: Incident[] = [];
    localStorage.setItem('local_incidents', JSON.stringify(initialIncidents));
    return initialIncidents;
  },

  async saveIncident(inc: Incident): Promise<Incident> {
    try {
      const ref = await withTimeout(addDoc(collection(db, 'incidents'), inc), 2000);
      return { id: ref.id, ...inc };
    } catch (e) {
      console.warn("Firestore saveIncident failed, using local storage", e);
      const list = await this.getIncidents();
      const newInc = { ...inc, id: 'inc_' + Date.now() };
      list.push(newInc);
      localStorage.setItem('local_incidents', JSON.stringify(list));
      return newInc;
    }
  },

  async updateIncident(id: string, inc: Partial<Incident>): Promise<void> {
    try {
      if (!id.startsWith('inc_')) {
        await withTimeout(updateDoc(doc(db, 'incidents', id), inc), 2000);
      }
    } catch (e) {
      console.warn("Firestore updateIncident failed, using local storage", e);
    }
    // Local fallback
    const list = await this.getIncidents();
    const idx = list.findIndex(item => item.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...inc };
      localStorage.setItem('local_incidents', JSON.stringify(list));
    }
  },

  async deleteIncident(id: string): Promise<void> {
    try {
      if (id && !id.startsWith('inc_')) {
        await withTimeout(deleteDoc(doc(db, 'incidents', id)), 2000);
      }
    } catch (e: any) {
      console.warn("Firestore deleteIncident failed, using local storage", e);
      const isAuthError = e instanceof Error && (e.message.includes('permission') || e.message.includes('Rule'));
      if (isAuthError) throw e;
    }
    // Track deleted ID for syncing
    if (id && !id.startsWith('inc_')) {
      const deleted = JSON.parse(localStorage.getItem('sync_deleted_incidents') || '[]');
      if (!deleted.includes(id)) {
        deleted.push(id);
        localStorage.setItem('sync_deleted_incidents', JSON.stringify(deleted));
      }
    }
    // Local fallback
    const list = await this.getIncidents();
    const filtered = list.filter(item => item.id !== id);
    localStorage.setItem('local_incidents', JSON.stringify(filtered));
  },

  async syncLocalDataToServer(): Promise<{ success: boolean; syncedCount: number; message: string }> {
    try {
      const isOk = await testConnection();
      if (!isOk) {
        const detail = lastConnectionError ? ` (Detalle: ${lastConnectionError})` : '';
        return { success: false, syncedCount: 0, message: `No hay conexión activa con la base de datos de Firestore en la nube.${detail}` };
      }

      let syncedCount = 0;

      // 0. Sync Deletions
      const deletedProps = JSON.parse(localStorage.getItem('sync_deleted_properties') || '[]');
      for (const dId of deletedProps) {
        try {
          await deleteDoc(doc(db, 'properties', dId));
          syncedCount++;
        } catch (err) {
          console.warn("Could not sync deletion of property:", dId, err);
        }
      }
      localStorage.removeItem('sync_deleted_properties');

      const deletedTenants = JSON.parse(localStorage.getItem('sync_deleted_tenants') || '[]');
      for (const dId of deletedTenants) {
        try {
          await deleteDoc(doc(db, 'tenants', dId));
          syncedCount++;
        } catch (err) {
          console.warn("Could not sync deletion of tenant:", dId, err);
        }
      }
      localStorage.removeItem('sync_deleted_tenants');

      const deletedContracts = JSON.parse(localStorage.getItem('sync_deleted_contracts') || '[]');
      for (const dId of deletedContracts) {
        try {
          await deleteDoc(doc(db, 'contracts', dId));
          syncedCount++;
        } catch (err) {
          console.warn("Could not sync deletion of contract:", dId, err);
        }
      }
      localStorage.removeItem('sync_deleted_contracts');

      const deletedReceipts = JSON.parse(localStorage.getItem('sync_deleted_receipts') || '[]');
      for (const dId of deletedReceipts) {
        try {
          await deleteDoc(doc(db, 'receipts', dId));
          syncedCount++;
        } catch (err) {
          console.warn("Could not sync deletion of receipt:", dId, err);
        }
      }
      localStorage.removeItem('sync_deleted_receipts');

      const deletedExpenses = JSON.parse(localStorage.getItem('sync_deleted_expenses') || '[]');
      for (const dId of deletedExpenses) {
        try {
          await deleteDoc(doc(db, 'expenses', dId));
          syncedCount++;
        } catch (err) {
          console.warn("Could not sync deletion of expense:", dId, err);
        }
      }
      localStorage.removeItem('sync_deleted_expenses');

      const deletedIncidents = JSON.parse(localStorage.getItem('sync_deleted_incidents') || '[]');
      for (const dId of deletedIncidents) {
        try {
          await deleteDoc(doc(db, 'incidents', dId));
          syncedCount++;
        } catch (err) {
          console.warn("Could not sync deletion of incident:", dId, err);
        }
      }
      localStorage.removeItem('sync_deleted_incidents');

      // Local lists
      const localPropsRaw = localStorage.getItem('local_properties');
      const localTenantsRaw = localStorage.getItem('local_tenants');
      const localContractsRaw = localStorage.getItem('local_contracts');
      const localReceiptsRaw = localStorage.getItem('local_receipts');
      const localExpensesRaw = localStorage.getItem('local_expenses');
      const localIncidentsRaw = localStorage.getItem('local_incidents');

      const localProps: Property[] = localPropsRaw ? JSON.parse(localPropsRaw) : [];
      const localTenants: Tenant[] = localTenantsRaw ? JSON.parse(localTenantsRaw) : [];
      const localContracts: Contract[] = localContractsRaw ? JSON.parse(localContractsRaw) : [];
      const localReceipts: Receipt[] = localReceiptsRaw ? JSON.parse(localReceiptsRaw) : [];
      const localExpenses: Expense[] = localExpensesRaw ? JSON.parse(localExpensesRaw) : [];
      const localIncidents: Incident[] = localIncidentsRaw ? JSON.parse(localIncidentsRaw) : [];

      const cleanData = (obj: any) => {
        const { id, ...copy } = obj;
        return copy;
      };

      // Helper to determine if fields have actually changed
      const isDifferent = (localObj: any, serverObj: any) => {
        const keys = new Set([...Object.keys(localObj), ...Object.keys(serverObj)]);
        for (const key of keys) {
          if (key === 'id') continue;
          const valLocal = localObj[key];
          const valServer = serverObj[key];
          // Treat empty/falsy values as equal
          if (!valLocal && !valServer) continue;
          if (JSON.stringify(valLocal) !== JSON.stringify(valServer)) {
            return true;
          }
        }
        return false;
      };

      // 1. Sync properties
      const serverPropsSnap = await getDocs(collection(db, 'properties'));
      const serverPropsMapById = new Map<string, { id: string; doc: Property }>();
      const serverPropsMapByCodigo = new Map<string, { id: string; doc: Property }>();
      
      serverPropsSnap.docs.forEach(d => {
        const data = d.data() as Property;
        const entry = { id: d.id, doc: data };
        serverPropsMapById.set(d.id, entry);
        if (data.codigo) serverPropsMapByCodigo.set(data.codigo, entry);
      });

      for (const p of localProps) {
        let matchedServer: { id: string; doc: Property } | undefined;
        if (p.id && serverPropsMapById.has(p.id)) {
          matchedServer = serverPropsMapById.get(p.id);
        } else if (p.codigo && serverPropsMapByCodigo.has(p.codigo)) {
          matchedServer = serverPropsMapByCodigo.get(p.codigo);
        }

        if (matchedServer) {
          if (isDifferent(p, matchedServer.doc)) {
            const { id, ...cleanReady } = p;
            await updateDoc(doc(db, 'properties', matchedServer.id), cleanReady);
            syncedCount++;
          }
        } else {
          await addDoc(collection(db, 'properties'), cleanData(p));
          syncedCount++;
        }
      }

      // 2. Sync Tenants
      const serverTenantsSnap = await getDocs(collection(db, 'tenants'));
      const serverTenantsMapById = new Map<string, { id: string; doc: Tenant }>();
      const serverTenantsMapByDoc = new Map<string, { id: string; doc: Tenant }>();
      
      serverTenantsSnap.docs.forEach(d => {
        const data = d.data() as Tenant;
        const entry = { id: d.id, doc: data };
        serverTenantsMapById.set(d.id, entry);
        if (data.documento) serverTenantsMapByDoc.set(data.documento, entry);
      });

      for (const t of localTenants) {
        let matchedServer: { id: string; doc: Tenant } | undefined;
        if (t.id && serverTenantsMapById.has(t.id)) {
          matchedServer = serverTenantsMapById.get(t.id);
        } else if (t.documento && serverTenantsMapByDoc.has(t.documento)) {
          matchedServer = serverTenantsMapByDoc.get(t.documento);
        }

        if (matchedServer) {
          if (isDifferent(t, matchedServer.doc)) {
            const { id, ...cleanReady } = t;
            await updateDoc(doc(db, 'tenants', matchedServer.id), cleanReady);
            syncedCount++;
          }
        } else {
          await addDoc(collection(db, 'tenants'), cleanData(t));
          syncedCount++;
        }
      }

      // 3. Sync Contracts
      const serverContractsSnap = await getDocs(collection(db, 'contracts'));
      const serverContractsMapById = new Map<string, { id: string; doc: Contract }>();
      const serverContractsMapByKey = new Map<string, { id: string; doc: Contract }>();
      
      serverContractsSnap.docs.forEach(d => {
        const data = d.data() as Contract;
        const entry = { id: d.id, doc: data };
        serverContractsMapById.set(d.id, entry);
        const key = `${data.codigoPropiedad}_${data.tenantDocumento}_${data.periodoInicio}`;
        serverContractsMapByKey.set(key, entry);
      });

      for (const c of localContracts) {
        let matchedServer: { id: string; doc: Contract } | undefined;
        const key = `${c.codigoPropiedad}_${c.tenantDocumento}_${c.periodoInicio}`;
        if (c.id && serverContractsMapById.has(c.id)) {
          matchedServer = serverContractsMapById.get(c.id);
        } else if (serverContractsMapByKey.has(key)) {
          matchedServer = serverContractsMapByKey.get(key);
        }

        if (matchedServer) {
          if (isDifferent(c, matchedServer.doc)) {
            const { id, ...cleanReady } = c;
            await updateDoc(doc(db, 'contracts', matchedServer.id), cleanReady);
            syncedCount++;
          }
        } else {
          await addDoc(collection(db, 'contracts'), cleanData(c));
          syncedCount++;
        }
      }

      // 4. Sync Receipts
      const serverReceiptsSnap = await getDocs(collection(db, 'receipts'));
      const serverReceiptsMapById = new Map<string, { id: string; doc: Receipt }>();
      const serverReceiptsMapByNum = new Map<string, { id: string; doc: Receipt }>();
      
      serverReceiptsSnap.docs.forEach(d => {
        const data = d.data() as Receipt;
        const entry = { id: d.id, doc: data };
        serverReceiptsMapById.set(d.id, entry);
        if (data.numeroRecibo) serverReceiptsMapByNum.set(data.numeroRecibo, entry);
      });

      for (const r of localReceipts) {
        let matchedServer: { id: string; doc: Receipt } | undefined;
        if (r.id && serverReceiptsMapById.has(r.id)) {
          matchedServer = serverReceiptsMapById.get(r.id);
        } else if (r.numeroRecibo && serverReceiptsMapByNum.has(r.numeroRecibo)) {
          matchedServer = serverReceiptsMapByNum.get(r.numeroRecibo);
        }

        if (matchedServer) {
          if (isDifferent(r, matchedServer.doc)) {
            const { id, ...cleanReady } = r;
            await updateDoc(doc(db, 'receipts', matchedServer.id), cleanReady);
            syncedCount++;
          }
        } else {
          await addDoc(collection(db, 'receipts'), cleanData(r));
          syncedCount++;
        }
      }

      // 5. Sync Expenses
      const serverExpensesSnap = await getDocs(collection(db, 'expenses'));
      const serverExpensesMapById = new Map<string, { id: string; doc: Expense }>();
      const serverExpensesMapByKey = new Map<string, { id: string; doc: Expense }>();
      
      serverExpensesSnap.docs.forEach(d => {
        const data = d.data() as Expense;
        const entry = { id: d.id, doc: data };
        serverExpensesMapById.set(d.id, entry);
        const key = `${data.codigoPropiedad}_${data.monto}_${data.fecha}_${data.concepto}`;
        serverExpensesMapByKey.set(key, entry);
      });

      for (const e of localExpenses) {
        let matchedServer: { id: string; doc: Expense } | undefined;
        const key = `${e.codigoPropiedad}_${e.monto}_${e.fecha}_${e.concepto}`;
        if (e.id && serverExpensesMapById.has(e.id)) {
          matchedServer = serverExpensesMapById.get(e.id);
        } else if (serverExpensesMapByKey.has(key)) {
          matchedServer = serverExpensesMapByKey.get(key);
        }

        if (matchedServer) {
          if (isDifferent(e, matchedServer.doc)) {
            const { id, ...cleanReady } = e;
            await updateDoc(doc(db, 'expenses', matchedServer.id), cleanReady);
            syncedCount++;
          }
        } else {
          await addDoc(collection(db, 'expenses'), cleanData(e));
          syncedCount++;
        }
      }

      // 6. Sync Incidents
      const serverIncidentsSnap = await getDocs(collection(db, 'incidents'));
      const serverIncidentsMapById = new Map<string, { id: string; doc: Incident }>();
      const serverIncidentsMapByKey = new Map<string, { id: string; doc: Incident }>();
      
      serverIncidentsSnap.docs.forEach(d => {
        const data = d.data() as Incident;
        const entry = { id: d.id, doc: data };
        serverIncidentsMapById.set(d.id, entry);
        const key = `${data.codigoPropiedad}_${data.descripcion}_${data.fechaReporte}`;
        serverIncidentsMapByKey.set(key, entry);
      });

      for (const i of localIncidents) {
        let matchedServer: { id: string; doc: Incident } | undefined;
        const key = `${i.codigoPropiedad}_${i.descripcion}_${i.fechaReporte}`;
        if (i.id && serverIncidentsMapById.has(i.id)) {
          matchedServer = serverIncidentsMapById.get(i.id);
        } else if (serverIncidentsMapByKey.has(key)) {
          matchedServer = serverIncidentsMapByKey.get(key);
        }

        if (matchedServer) {
          if (isDifferent(i, matchedServer.doc)) {
            const { id, ...cleanReady } = i;
            await updateDoc(doc(db, 'incidents', matchedServer.id), cleanReady);
            syncedCount++;
          }
        } else {
          await addDoc(collection(db, 'incidents'), cleanData(i));
          syncedCount++;
        }
      }

      return {
        success: true,
        syncedCount,
        message: syncedCount > 0 
          ? `Sincronización finalizada con éxito. Se actualizaron/guardaron ${syncedCount} cambios en Firestore central.`
          : `Sincronización finalizada. Toda la información ya está al día con la base de datos de la nube.`
      };

    } catch (e: any) {
      console.warn("Sync failed", e);
      return {
        success: false,
        syncedCount: 0,
        message: "Ocurrió un error al sincronizar con Firestore: " + (e.message || String(e))
      };
    }
  },

  async wipeAllData(): Promise<{ success: boolean; message: string }> {
    try {
      // Set local storage bypass keyword to permanently disable automatic backfill/seeding
      localStorage.setItem('property_management_bypass_seeding', 'true');
      
      // Set server bypass flag inside Firestore to ensure other clients or reloads preserve clean slate
      try {
        await setDoc(doc(db, 'metadata', 'seeding_status'), { bypassed: true });
      } catch (err) {
        console.warn("Could not write server metadata bypass flag, continuing locally:", err);
      }

      // Clear localStorage cache keys
      localStorage.removeItem('local_properties');
      localStorage.removeItem('local_tenants');
      localStorage.removeItem('local_contracts');
      localStorage.removeItem('local_receipts');
      localStorage.removeItem('local_expenses');
      localStorage.removeItem('local_incidents');
      localStorage.removeItem('sync_deleted_properties');
      localStorage.removeItem('sync_deleted_tenants');
      localStorage.removeItem('sync_deleted_contracts');
      localStorage.removeItem('sync_deleted_receipts');
      localStorage.removeItem('sync_deleted_expenses');
      localStorage.removeItem('sync_deleted_incidents');
      
      // Remove seed triggers to allow brand new clean seed/initial state if needed
      localStorage.removeItem('property_management_firestore_seeded_v3');

      const collections = ['properties', 'tenants', 'contracts', 'receipts', 'expenses', 'incidents'];
      let deletedCount = 0;

      for (const colName of collections) {
        try {
          const snap = await getDocs(collection(db, colName));
          for (const docSnap of snap.docs) {
            await deleteDoc(doc(db, colName, docSnap.id));
            deletedCount++;
          }
        } catch (err) {
          console.warn(`Could not clear collection ${colName}:`, err);
        }
      }

      return {
        success: true,
        message: `Se eliminaron con éxito ${deletedCount} documentos del servidor Firestore y se restableció el caché local.`
      };
    } catch (e: any) {
      return {
        success: false,
        message: "Error al borrar la base de datos: " + (e.message || String(e))
      };
    }
  }
};
