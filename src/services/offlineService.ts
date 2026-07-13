import { db, auth } from './firebase';
import { 
  collection, 
  getDocs, 
  getDoc,
  setDoc, 
  doc, 
  deleteDoc, 
  writeBatch,
  query,
  orderBy,
  where,
  onSnapshot
} from 'firebase/firestore';
import { Booking, Payment, PendingOperation, CollectionName } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
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

const DB_NAME = 'asmaul_production_db';
const DB_VERSION = 1;

class OfflineService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private syncListeners: (() => void)[] = [];
  private isSyncing = false;
  private bookingsUnsubscribe: (() => void) | null = null;
  private paymentsUnsubscribe: (() => void) | null = null;
  private settingsUnsubscribe: (() => void) | null = null;

  constructor() {
    this.initDb();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      // Try initial sync after a short delay
      setTimeout(() => this.syncAll(), 2000);
    }
  }

  // Initialize IndexedDB
  private initDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const idb = (event.target as IDBOpenDBRequest).result;
        
        if (!idb.objectStoreNames.contains('bookings')) {
          idb.createObjectStore('bookings', { keyPath: 'id' });
        }
        if (!idb.objectStoreNames.contains('payments')) {
          idb.createObjectStore('payments', { keyPath: 'id' });
        }
        if (!idb.objectStoreNames.contains('outbox')) {
          idb.createObjectStore('outbox', { keyPath: 'id' });
        }
        if (!idb.objectStoreNames.contains('metadata')) {
          idb.createObjectStore('metadata', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        const idbInstance = (event.target as IDBOpenDBRequest).result;
        idbInstance.onclose = () => {
          this.dbPromise = null;
        };
        idbInstance.onversionchange = () => {
          idbInstance.close();
          this.dbPromise = null;
        };
        resolve(idbInstance);
      };

      request.onerror = (event) => {
        console.error('IndexedDB opening error:', request.error);
        this.dbPromise = null;
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // Observer Pattern for updates
  public subscribe(listener: () => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.syncListeners.forEach(l => l());
  }

  private handleNetworkChange(isOnline: boolean) {
    this.notifyListeners();
    if (isOnline) {
      this.syncAll();
    }
  }

  public getOnlineStatus(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  private isDemoUser(): boolean {
    return false;
  }

  // Raw IndexedDB read helpers
  public async getStoreData<T>(storeName: string): Promise<T[]> {
    try {
      const idb = await this.initDb();
      return await new Promise((resolve, reject) => {
        const transaction = idb.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error: any) {
      if (error?.name === 'InvalidStateError' || error?.message?.includes('closing') || error?.message?.includes('closed')) {
        console.warn('IDB connection closing/closed. Reinitializing...', error);
        this.dbPromise = null;
        const idb = await this.initDb();
        return new Promise((resolve, reject) => {
          const transaction = idb.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.getAll();

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }
      throw error;
    }
  }

  private async saveToStore<T>(storeName: string, item: T): Promise<void> {
    try {
      const idb = await this.initDb();
      return await new Promise((resolve, reject) => {
        const transaction = idb.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error: any) {
      if (error?.name === 'InvalidStateError' || error?.message?.includes('closing') || error?.message?.includes('closed')) {
        console.warn('IDB connection closing/closed. Reinitializing...', error);
        this.dbPromise = null;
        const idb = await this.initDb();
        return new Promise((resolve, reject) => {
          const transaction = idb.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.put(item);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      throw error;
    }
  }

  private async deleteFromStore(storeName: string, id: string): Promise<void> {
    try {
      const idb = await this.initDb();
      return await new Promise((resolve, reject) => {
        const transaction = idb.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error: any) {
      if (error?.name === 'InvalidStateError' || error?.message?.includes('closing') || error?.message?.includes('closed')) {
        console.warn('IDB connection closing/closed. Reinitializing...', error);
        this.dbPromise = null;
        const idb = await this.initDb();
        return new Promise((resolve, reject) => {
          const transaction = idb.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.delete(id);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      throw error;
    }
  }

  private async clearStore(storeName: string): Promise<void> {
    try {
      const idb = await this.initDb();
      return await new Promise((resolve, reject) => {
        const transaction = idb.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error: any) {
      if (error?.name === 'InvalidStateError' || error?.message?.includes('closing') || error?.message?.includes('closed')) {
        console.warn('IDB connection closing/closed. Reinitializing...', error);
        this.dbPromise = null;
        const idb = await this.initDb();
        return new Promise((resolve, reject) => {
          const transaction = idb.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      throw error;
    }
  }

  // --- Metadata Helper ---
  public async getMetadata(key: string): Promise<any> {
    try {
      const idb = await this.initDb();
      return await new Promise((resolve) => {
        const transaction = idb.transaction('metadata', 'readonly');
        const store = transaction.objectStore('metadata');
        const request = store.get(key);
        request.onsuccess = () => {
          resolve(request.result ? request.result.value : null);
        };
        request.onerror = () => resolve(null);
      });
    } catch (error: any) {
      if (error?.name === 'InvalidStateError' || error?.message?.includes('closing') || error?.message?.includes('closed')) {
        console.warn('IDB connection closing/closed. Reinitializing...', error);
        this.dbPromise = null;
        try {
          const idb = await this.initDb();
          return new Promise((resolve) => {
            const transaction = idb.transaction('metadata', 'readonly');
            const store = transaction.objectStore('metadata');
            const request = store.get(key);
            request.onsuccess = () => {
              resolve(request.result ? request.result.value : null);
            };
            request.onerror = () => resolve(null);
          });
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  public async setMetadata(key: string, value: any): Promise<void> {
    try {
      const idb = await this.initDb();
      return await new Promise<void>((resolve) => {
        const transaction = idb.transaction('metadata', 'readwrite');
        const store = transaction.objectStore('metadata');
        store.put({ key, value });
        transaction.oncomplete = () => resolve();
      });
    } catch (error: any) {
      if (error?.name === 'InvalidStateError' || error?.message?.includes('closing') || error?.message?.includes('closed')) {
        console.warn('IDB connection closing/closed. Reinitializing...', error);
        this.dbPromise = null;
        try {
          const idb = await this.initDb();
          return new Promise<void>((resolve) => {
            const transaction = idb.transaction('metadata', 'readwrite');
            const store = transaction.objectStore('metadata');
            store.put({ key, value });
            transaction.oncomplete = () => resolve();
          });
        } catch {
          return;
        }
      }
    }
  }

  // --- Outbox Queue Helpers ---
  public async getOutbox(): Promise<PendingOperation[]> {
    return this.getStoreData<PendingOperation>('outbox');
  }

  private async queueOperation(collection: CollectionName, type: 'create' | 'update' | 'delete', data: any): Promise<void> {
    const id: string = `${collection}_${type}_${data.id || data}_${Date.now()}`;
    const op: PendingOperation = {
      id,
      collection,
      type,
      data,
      timestamp: Date.now()
    };
    await this.saveToStore('outbox', op);
    this.notifyListeners();
  }

  // --- Booking Operations ---
  public async getBookings(): Promise<Booking[]> {
    const data = await this.getStoreData<Booking>('bookings');
    // Sort by weddingDate descending
    return data.sort((a, b) => b.weddingDate.localeCompare(a.weddingDate));
  }

  public async addBooking(booking: Booking): Promise<void> {
    const userId = auth.currentUser?.uid || 'no_auth';
    booking.userId = userId;
    booking.createdAt = booking.createdAt || Date.now();
    booking.updatedAt = Date.now();

    // 1. Save locally
    await this.saveToStore('bookings', booking);
    
    // 2. Queue or write
    if (this.getOnlineStatus() && auth.currentUser && !this.isDemoUser()) {
      try {
        await setDoc(doc(db, 'bookings', booking.id), booking);
      } catch (error: any) {
        if (error?.code === 'permission-denied' || error?.message?.includes('permission') || error?.message?.includes('Permission')) {
          handleFirestoreError(error, OperationType.WRITE, 'bookings');
        }
        console.warn('Failed to write directly to Firestore, queuing instead:', error);
        await this.queueOperation('bookings', 'create', booking);
      }
    } else {
      await this.queueOperation('bookings', 'create', booking);
    }
    this.notifyListeners();
  }

  public async updateBooking(booking: Booking): Promise<void> {
    const userId = auth.currentUser?.uid || 'no_auth';
    booking.userId = userId;
    booking.updatedAt = Date.now();

    // 1. Save locally
    await this.saveToStore('bookings', booking);

    // 2. Queue or write
    if (this.getOnlineStatus() && auth.currentUser && !this.isDemoUser()) {
      try {
        await setDoc(doc(db, 'bookings', booking.id), booking);
      } catch (error: any) {
        if (error?.code === 'permission-denied' || error?.message?.includes('permission') || error?.message?.includes('Permission')) {
          handleFirestoreError(error, OperationType.WRITE, 'bookings');
        }
        console.warn('Failed to update directly to Firestore, queuing instead:', error);
        await this.queueOperation('bookings', 'update', booking);
      }
    } else {
      await this.queueOperation('bookings', 'update', booking);
    }
    this.notifyListeners();
  }

  public async deleteBooking(id: string): Promise<void> {
    // 1. Delete locally
    await this.deleteFromStore('bookings', id);

    // 2. Queue or write
    if (this.getOnlineStatus() && auth.currentUser && !this.isDemoUser()) {
      try {
        await deleteDoc(doc(db, 'bookings', id));
      } catch (error: any) {
        if (error?.code === 'permission-denied' || error?.message?.includes('permission') || error?.message?.includes('Permission')) {
          handleFirestoreError(error, OperationType.DELETE, `bookings/${id}`);
        }
        console.warn('Failed to delete directly from Firestore, queuing instead:', error);
        await this.queueOperation('bookings', 'delete', id);
      }
    } else {
      await this.queueOperation('bookings', 'delete', id);
    }
    this.notifyListeners();
  }

  // --- Payment Operations ---
  public async getPayments(): Promise<Payment[]> {
    const data = await this.getStoreData<Payment>('payments');
    return data.sort((a, b) => b.date.localeCompare(a.date));
  }

  public async addPayment(payment: Payment): Promise<void> {
    const userId = auth.currentUser?.uid || 'no_auth';
    payment.userId = userId;
    payment.createdAt = payment.createdAt || Date.now();
    payment.updatedAt = Date.now();

    // 1. Save locally
    await this.saveToStore('payments', payment);

    // Update paidAmount in the associated booking locally
    await this.recalculateBookingPaidAmount(payment.bookingId);

    // 2. Queue or write
    if (this.getOnlineStatus() && auth.currentUser && !this.isDemoUser()) {
      try {
        await setDoc(doc(db, 'payments', payment.id), payment);
      } catch (error: any) {
        if (error?.code === 'permission-denied' || error?.message?.includes('permission') || error?.message?.includes('Permission')) {
          handleFirestoreError(error, OperationType.WRITE, 'payments');
        }
        console.warn('Failed to save payment to Firestore, queuing instead:', error);
        await this.queueOperation('payments', 'create', payment);
      }
    } else {
      await this.queueOperation('payments', 'create', payment);
    }
    this.notifyListeners();
  }

  public async updatePayment(payment: Payment): Promise<void> {
    const userId = auth.currentUser?.uid || 'no_auth';
    payment.userId = userId;
    payment.updatedAt = Date.now();

    // 1. Save locally
    await this.saveToStore('payments', payment);

    // Update paidAmount in the associated booking locally
    await this.recalculateBookingPaidAmount(payment.bookingId);

    // 2. Queue or write
    if (this.getOnlineStatus() && auth.currentUser && !this.isDemoUser()) {
      try {
        await setDoc(doc(db, 'payments', payment.id), payment);
      } catch (error: any) {
        if (error?.code === 'permission-denied' || error?.message?.includes('permission') || error?.message?.includes('Permission')) {
          handleFirestoreError(error, OperationType.WRITE, 'payments');
        }
        console.warn('Failed to update payment to Firestore, queuing instead:', error);
        await this.queueOperation('payments', 'update', payment);
      }
    } else {
      await this.queueOperation('payments', 'update', payment);
    }
    this.notifyListeners();
  }

  public async deletePayment(id: string, bookingId: string): Promise<void> {
    // 1. Delete locally
    await this.deleteFromStore('payments', id);

    // Update paidAmount in the associated booking locally
    await this.recalculateBookingPaidAmount(bookingId);

    // 2. Queue or write
    if (this.getOnlineStatus() && auth.currentUser && !this.isDemoUser()) {
      try {
        await deleteDoc(doc(db, 'payments', id));
      } catch (error: any) {
        if (error?.code === 'permission-denied' || error?.message?.includes('permission') || error?.message?.includes('Permission')) {
          handleFirestoreError(error, OperationType.DELETE, `payments/${id}`);
        }
        console.warn('Failed to delete payment from Firestore, queuing instead:', error);
        await this.queueOperation('payments', 'delete', { id, bookingId });
      }
    } else {
      await this.queueOperation('payments', 'delete', { id, bookingId });
    }
    this.notifyListeners();
  }

  // Helper to sync booking paidAmount based on payments locally
  private async recalculateBookingPaidAmount(bookingId: string) {
    const bookings = await this.getStoreData<Booking>('bookings');
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      const payments = await this.getStoreData<Payment>('payments');
      const bookingPayments = payments.filter(p => p.bookingId === bookingId && p.status === 'completed');
      const sum = bookingPayments.reduce((total, p) => total + p.amount, 0);
      booking.paidAmount = sum;
      booking.updatedAt = Date.now();
      await this.saveToStore('bookings', booking);
      
      // Sync booking update to Firestore/queue
      if (this.getOnlineStatus() && auth.currentUser && !this.isDemoUser()) {
        try {
          await setDoc(doc(db, 'bookings', bookingId), booking);
        } catch {
          await this.queueOperation('bookings', 'update', booking);
        }
      } else {
        await this.queueOperation('bookings', 'update', booking);
      }
    }
  }

  // Recalculates booking paidAmount based on payments locally without pushing to Firestore again
  private async recalculateBookingPaidAmountLocally(bookingId: string) {
    const bookings = await this.getStoreData<Booking>('bookings');
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      const payments = await this.getStoreData<Payment>('payments');
      const bookingPayments = payments.filter(p => p.bookingId === bookingId && p.status === 'completed');
      const sum = bookingPayments.reduce((total, p) => total + p.amount, 0);
      if (booking.paidAmount !== sum) {
        booking.paidAmount = sum;
        booking.updatedAt = Date.now();
        await this.saveToStore('bookings', booking);
        this.notifyListeners();
      }
    }
  }

  // --- Real-time Sync Listeners ---
  public setupRealtimeListeners() {
    const currentUser = auth.currentUser;
    if (!currentUser || this.isDemoUser()) {
      this.cleanupRealtimeListeners();
      return;
    }

    const userId = currentUser.uid;
    this.cleanupRealtimeListeners();

    // Real-time bookings listener
    const bookingsCol = collection(db, 'bookings');
    const bookingsQuery = query(bookingsCol, where('userId', '==', userId));
    this.bookingsUnsubscribe = onSnapshot(bookingsQuery, async (snapshot) => {
      const outbox = await this.getOutbox();
      const bookingOutboxIds = new Set(
        outbox.filter(op => op.collection === 'bookings').map(op => {
          if (op.type === 'delete') return typeof op.data === 'string' ? op.data : op.data.id;
          return op.data.id;
        })
      );

      const localBookings = await this.getStoreData<Booking>('bookings');

      for (const change of snapshot.docChanges()) {
        const remote = change.doc.data() as Booking;

        if (change.type === 'removed') {
          if (!bookingOutboxIds.has(remote.id)) {
            await this.deleteFromStore('bookings', remote.id);
          }
        } else {
          // added or modified
          if (!bookingOutboxIds.has(remote.id)) {
            // Unconditionally save remote if not in outbox
            await this.saveToStore('bookings', remote);
          } else {
            // Only compare timestamp if there is a pending local change
            const local = localBookings.find(l => l.id === remote.id);
            if (local) {
              const localUpdated = local.updatedAt || local.createdAt || 0;
              const remoteUpdated = remote.updatedAt || remote.createdAt || 0;
              if (remoteUpdated > localUpdated) {
                await this.saveToStore('bookings', remote);
              }
            } else {
              const isDeletedLocally = outbox.some(op => op.collection === 'bookings' && op.type === 'delete' && (op.data === remote.id || op.data.id === remote.id));
              if (!isDeletedLocally) {
                await this.saveToStore('bookings', remote);
              }
            }
          }
        }
      }

      // Handle server deletions
      if (localBookings.length > 0) {
        const allRemoteIds = new Set(snapshot.docs.map(doc => doc.id));
        for (const local of localBookings) {
          if (!allRemoteIds.has(local.id) && !bookingOutboxIds.has(local.id)) {
            await this.deleteFromStore('bookings', local.id);
          }
        }
      }

      this.notifyListeners();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'bookings');
    });

    // Real-time payments listener
    const paymentsCol = collection(db, 'payments');
    const paymentsQuery = query(paymentsCol, where('userId', '==', userId));
    this.paymentsUnsubscribe = onSnapshot(paymentsQuery, async (snapshot) => {
      const outbox = await this.getOutbox();
      const paymentOutboxIds = new Set(
        outbox.filter(op => op.collection === 'payments').map(op => {
          if (op.type === 'delete') return typeof op.data === 'string' ? op.data : op.data.id;
          return op.data.id;
        })
      );

      const localPayments = await this.getStoreData<Payment>('payments');

      for (const change of snapshot.docChanges()) {
        const remote = change.doc.data() as Payment;

        if (change.type === 'removed') {
          if (!paymentOutboxIds.has(remote.id)) {
            await this.deleteFromStore('payments', remote.id);
            await this.recalculateBookingPaidAmountLocally(remote.bookingId);
          }
        } else {
          if (!paymentOutboxIds.has(remote.id)) {
            // Unconditionally save remote if not in outbox
            await this.saveToStore('payments', remote);
            await this.recalculateBookingPaidAmountLocally(remote.bookingId);
          } else {
            // Only compare timestamp if there is a pending local change
            const local = localPayments.find(l => l.id === remote.id);
            if (local) {
              const localUpdated = local.updatedAt || local.createdAt || 0;
              const remoteUpdated = remote.updatedAt || remote.createdAt || 0;
              if (remoteUpdated > localUpdated) {
                await this.saveToStore('payments', remote);
                await this.recalculateBookingPaidAmountLocally(remote.bookingId);
              }
            } else {
              const isDeletedLocally = outbox.some(op => op.collection === 'payments' && op.type === 'delete' && (op.data === remote.id || op.data.id === remote.id));
              if (!isDeletedLocally) {
                await this.saveToStore('payments', remote);
                await this.recalculateBookingPaidAmountLocally(remote.bookingId);
              }
            }
          }
        }
      }

      // Handle server deletions
      if (localPayments.length > 0) {
        const allRemoteIds = new Set(snapshot.docs.map(doc => doc.id));
        for (const local of localPayments) {
          if (!allRemoteIds.has(local.id) && !paymentOutboxIds.has(local.id)) {
            await this.deleteFromStore('payments', local.id);
            await this.recalculateBookingPaidAmountLocally(local.bookingId);
          }
        }
      }

      this.notifyListeners();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'payments');
    });

    // Real-time settings listener
    const settingsDocRef = doc(db, 'settings', userId);
    this.settingsUnsubscribe = onSnapshot(settingsDocRef, async (snapshot) => {
      if (snapshot.exists()) {
        const remote = snapshot.data();
        const local = await this.getMetadata('brand_settings');
        const outbox = await this.getOutbox();
        const isPendingSettingsUpdate = outbox.some(op => op.collection === 'settings');

        if (!isPendingSettingsUpdate) {
          const merged = this.mergeSettingsData(local, remote);
          await this.setMetadata('brand_settings', merged);
          
          const localUpdated = local?.updatedAt || 0;
          const remoteUpdated = remote?.updatedAt || 0;
          if (localUpdated > remoteUpdated) {
            try {
              await setDoc(doc(db, 'settings', userId), merged);
            } catch (error) {
              console.error('Failed to upload local settings during snapshot:', error);
            }
          }
          
          this.notifyListeners();
        }
      }
    }, (error) => {
      console.error('Error in settings real-time listener:', error);
    });
  }

  public cleanupRealtimeListeners() {
    if (this.bookingsUnsubscribe) {
      this.bookingsUnsubscribe();
      this.bookingsUnsubscribe = null;
    }
    if (this.paymentsUnsubscribe) {
      this.paymentsUnsubscribe();
      this.paymentsUnsubscribe = null;
    }
    if (this.settingsUnsubscribe) {
      this.settingsUnsubscribe();
      this.settingsUnsubscribe = null;
    }
  }

  private mergeSettingsData(local: any, remote: any): any {
    if (!local) return remote;
    if (!remote) return local;
    
    const localUpdated = local.updatedAt || 0;
    const remoteUpdated = remote.updatedAt || 0;
    
    if (localUpdated > remoteUpdated) {
      return { ...remote, ...local };
    } else {
      return { ...local, ...remote };
    }
  }

  public async getSettings(): Promise<any> {
    return this.getMetadata('brand_settings');
  }

  public async saveSettings(settings: any): Promise<void> {
    settings.updatedAt = Date.now();
    if (auth.currentUser) {
      settings.userId = auth.currentUser.uid;
    }
    await this.setMetadata('brand_settings', settings);
    
    if (this.getOnlineStatus() && auth.currentUser) {
      try {
        await setDoc(doc(db, 'settings', auth.currentUser.uid), settings);
      } catch (error) {
        console.error('Failed to save settings directly to Firestore, queueing:', error);
        await this.queueOperation('settings', 'update', settings);
      }
    } else {
      await this.queueOperation('settings', 'update', settings);
    }
    this.notifyListeners();
  }

  // --- Synchronization Engine ---
  public async syncAll(): Promise<void> {
    if (this.isSyncing) return;
    if (!this.getOnlineStatus()) return;
    if (!auth.currentUser || this.isDemoUser()) {
      console.log('Skipping sync: No active cloud user session.');
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      // 1. Process Outbox
      const outbox = await this.getOutbox();
      if (outbox.length > 0) {
        // Sort by timestamp to ensure chronological order of sync
        outbox.sort((a, b) => a.timestamp - b.timestamp);

        for (const op of outbox) {
          try {
            if (op.collection === 'bookings') {
              if (op.type === 'delete') {
                const docId = typeof op.data === 'string' ? op.data : op.data.id;
                await deleteDoc(doc(db, 'bookings', docId));
              } else {
                op.data.updatedAt = Date.now();
                if (auth.currentUser) {
                  op.data.userId = auth.currentUser.uid;
                  await this.saveToStore('bookings', op.data);
                }
                await setDoc(doc(db, 'bookings', op.data.id), op.data);
              }
            } else if (op.collection === 'payments') {
              if (op.type === 'delete') {
                const deleteData = op.data;
                const idToDelete = typeof deleteData === 'string' ? deleteData : deleteData.id;
                await deleteDoc(doc(db, 'payments', idToDelete));
              } else {
                op.data.updatedAt = Date.now();
                if (auth.currentUser) {
                  op.data.userId = auth.currentUser.uid;
                  await this.saveToStore('payments', op.data);
                }
                await setDoc(doc(db, 'payments', op.data.id), op.data);
              }
            } else if (op.collection === 'settings') {
              if (auth.currentUser) {
                const settingsData = op.data;
                settingsData.userId = auth.currentUser.uid;
                settingsData.updatedAt = Date.now();
                await this.setMetadata('brand_settings', settingsData);
                await setDoc(doc(db, 'settings', auth.currentUser.uid), settingsData);
              }
            }
            // Clear successfully synced outbox operation
            await this.deleteFromStore('outbox', op.id);
          } catch (error) {
            console.error('Failed to sync operation:', op, error);
            // Don't clear, will retry later
          }
        }
      }

      // 2. Fetch latest from Firestore and merge
      await this.pullFromFirestore();
      
      await this.setMetadata('lastSyncedAt', Date.now());
    } catch (error) {
      console.error('Sync process failed:', error);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  // Pull data from Firestore to update Local Cache
  private async pullFromFirestore(): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser || this.isDemoUser()) return;

    const userId = currentUser.uid;

    try {
      // 1. Pull bookings
      const bookingsCol = collection(db, 'bookings');
      const bookingsQuery = query(bookingsCol, where('userId', '==', userId));
      let bookingsSnap;
      try {
        bookingsSnap = await getDocs(bookingsQuery);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'bookings');
      }
      
      const remoteBookingsMap = new Map<string, Booking>();
      bookingsSnap.forEach(d => {
        remoteBookingsMap.set(d.id, d.data() as Booking);
      });

      const localBookings = await this.getStoreData<Booking>('bookings');
      const outbox = await this.getOutbox();
      const bookingOutboxIds = new Set(
        outbox.filter(op => op.collection === 'bookings').map(op => {
          if (op.type === 'delete') return typeof op.data === 'string' ? op.data : op.data.id;
          return op.data.id;
        })
      );

      // Recreate documents if remote is completely empty
      if (remoteBookingsMap.size === 0 && localBookings.length > 0) {
        console.log('Remote bookings are empty. Recreating bookings collection in new Firestore database...');
        for (const local of localBookings) {
          local.userId = userId;
          local.updatedAt = local.updatedAt || Date.now();
          await setDoc(doc(db, 'bookings', local.id), local);
          remoteBookingsMap.set(local.id, local);
        }
      }

      for (const local of localBookings) {
        const remote = remoteBookingsMap.get(local.id);
        if (remote) {
          const localUpdated = local.updatedAt || local.createdAt || 0;
          const remoteUpdated = remote.updatedAt || remote.createdAt || 0;

          if (remoteUpdated > localUpdated) {
            await this.saveToStore('bookings', remote);
          } else if (localUpdated > remoteUpdated) {
            if (!bookingOutboxIds.has(local.id)) {
              await this.queueOperation('bookings', 'update', local);
            }
          }
        } else {
          // Exists locally but not remotely. If not pending create/update, was deleted on server.
          const isPendingCreateOrUpdate = outbox.some(op => op.collection === 'bookings' && op.type !== 'delete' && op.data.id === local.id);
          if (!isPendingCreateOrUpdate && !bookingOutboxIds.has(local.id)) {
            await this.deleteFromStore('bookings', local.id);
          }
        }
      }

      for (const [id, remote] of remoteBookingsMap.entries()) {
        const localExists = localBookings.some(l => l.id === id);
        if (!localExists) {
          const isDeletedLocally = outbox.some(op => op.collection === 'bookings' && op.type === 'delete' && (op.data === id || op.data.id === id));
          if (!isDeletedLocally) {
            await this.saveToStore('bookings', remote);
          }
        }
      }

      // 2. Pull payments
      const paymentsCol = collection(db, 'payments');
      const paymentsQuery = query(paymentsCol, where('userId', '==', userId));
      let paymentsSnap;
      try {
        paymentsSnap = await getDocs(paymentsQuery);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'payments');
      }
      
      const remotePaymentsMap = new Map<string, Payment>();
      paymentsSnap.forEach(d => {
        remotePaymentsMap.set(d.id, d.data() as Payment);
      });

      const localPayments = await this.getStoreData<Payment>('payments');
      const paymentOutboxIds = new Set(
        outbox.filter(op => op.collection === 'payments').map(op => {
          if (op.type === 'delete') return typeof op.data === 'string' ? op.data : op.data.id;
          return op.data.id;
        })
      );

      // Recreate documents if remote is completely empty
      if (remotePaymentsMap.size === 0 && localPayments.length > 0) {
        console.log('Remote payments are empty. Recreating payments collection in new Firestore database...');
        for (const local of localPayments) {
          local.userId = userId;
          local.updatedAt = local.updatedAt || Date.now();
          await setDoc(doc(db, 'payments', local.id), local);
          remotePaymentsMap.set(local.id, local);
        }
      }

      for (const local of localPayments) {
        const remote = remotePaymentsMap.get(local.id);
        if (remote) {
          const localUpdated = local.updatedAt || local.createdAt || 0;
          const remoteUpdated = remote.updatedAt || remote.createdAt || 0;

          if (remoteUpdated > localUpdated) {
            await this.saveToStore('payments', remote);
          } else if (localUpdated > remoteUpdated) {
            if (!paymentOutboxIds.has(local.id)) {
              await this.queueOperation('payments', 'update', local);
            }
          }
        } else {
          // Exists locally but not remotely. If not pending create/update, was deleted on server.
          const isPendingCreateOrUpdate = outbox.some(op => op.collection === 'payments' && op.type !== 'delete' && op.data.id === local.id);
          if (!isPendingCreateOrUpdate && !paymentOutboxIds.has(local.id)) {
            await this.deleteFromStore('payments', local.id);
          }
        }
      }

      for (const [id, remote] of remotePaymentsMap.entries()) {
        const localExists = localPayments.some(l => l.id === id);
        if (!localExists) {
          const isDeletedLocally = outbox.some(op => op.collection === 'payments' && op.type === 'delete' && (op.data === id || op.data.id === id));
          if (!isDeletedLocally) {
            await this.saveToStore('payments', remote);
          }
        }
      }

      // 3. Pull settings
      const settingsDocRef = doc(db, 'settings', userId);
      const settingsSnap = await getDoc(settingsDocRef);
      if (settingsSnap.exists()) {
        const remote = settingsSnap.data();
        const local = await this.getMetadata('brand_settings');
        const merged = this.mergeSettingsData(local, remote);
        await this.setMetadata('brand_settings', merged);
        
        const localUpdated = local?.updatedAt || 0;
        const remoteUpdated = remote?.updatedAt || 0;
        if (localUpdated > remoteUpdated) {
          await setDoc(doc(db, 'settings', userId), merged);
        }
      } else {
        const local = await this.getMetadata('brand_settings');
        if (local) {
          local.userId = userId;
          local.updatedAt = local.updatedAt || Date.now();
          await setDoc(doc(db, 'settings', userId), local);
        }
      }
    } catch (error) {
      console.error('Error pulling from Firestore:', error);
      throw error;
    }
  }

  public getSyncState(outboxCount: number): { isOnline: boolean; isSyncing: boolean } {
    return {
      isOnline: this.getOnlineStatus(),
      isSyncing: this.isSyncing
    };
  }
}

export const offlineService = new OfflineService();
