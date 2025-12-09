/**
 * Offline Queue Utility
 * Handles queuing and syncing of changes made while offline
 * Requirements: 9.4, 9.5
 */

// Types for pending changes
export type ChangeType = 'apartment' | 'room' | 'campaign' | 'business';
export type ChangeAction = 'create' | 'update' | 'delete';

export interface PendingChange {
  id: string;
  type: ChangeType;
  action: ChangeAction;
  entityId: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ changeId: string; error: string }>;
}

// Storage key for offline queue
const OFFLINE_QUEUE_KEY = 'doortodoor_offline_queue';
const MAX_RETRY_COUNT = 3;

// Connection state
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

// Listeners for connection state changes
const connectionListeners: Set<(online: boolean) => void> = new Set();

// Sync in progress flag
let syncInProgress = false;

/**
 * Generates a unique ID for a pending change
 */
function generateChangeId(): string {
  return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Gets the offline queue from localStorage
 */
function getQueue(): PendingChange[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }
  
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('Error reading offline queue:', err);
    return [];
  }
}


/**
 * Saves the offline queue to localStorage
 */
function saveQueue(queue: PendingChange[]): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Error saving offline queue:', err);
  }
}

/**
 * Queues a change for later sync when offline
 * Requirements: 9.4
 * 
 * @param change - The change to queue (without id, timestamp, retryCount)
 * @returns The queued change with generated id
 */
export function queueOfflineChange(
  change: Omit<PendingChange, 'id' | 'timestamp' | 'retryCount'>
): PendingChange {
  const pendingChange: PendingChange = {
    ...change,
    id: generateChangeId(),
    timestamp: Date.now(),
    retryCount: 0,
  };

  const queue = getQueue();
  queue.push(pendingChange);
  saveQueue(queue);

  console.log(`Queued offline change: ${pendingChange.type} ${pendingChange.action} ${pendingChange.entityId}`);
  
  return pendingChange;
}

/**
 * Gets all pending changes in the queue
 */
export function getPendingChanges(): PendingChange[] {
  return getQueue();
}

/**
 * Gets the count of pending changes
 */
export function getPendingChangeCount(): number {
  return getQueue().length;
}

/**
 * Removes a change from the queue
 * 
 * @param changeId - The ID of the change to remove
 */
export function removeChange(changeId: string): void {
  const queue = getQueue();
  const filtered = queue.filter(c => c.id !== changeId);
  saveQueue(filtered);
}

/**
 * Updates a change's retry count
 * 
 * @param changeId - The ID of the change to update
 */
function incrementRetryCount(changeId: string): void {
  const queue = getQueue();
  const change = queue.find(c => c.id === changeId);
  if (change) {
    change.retryCount++;
    saveQueue(queue);
  }
}

/**
 * Clears all pending changes from the queue
 */
export function clearQueue(): void {
  saveQueue([]);
}


/**
 * Sync handler type - must be provided by the application
 */
export type SyncHandler = (change: PendingChange) => Promise<{ success: boolean; error?: string }>;

// Registered sync handlers
const syncHandlers: Map<ChangeType, SyncHandler> = new Map();

/**
 * Registers a sync handler for a specific change type
 * 
 * @param type - The change type to handle
 * @param handler - The handler function
 */
export function registerSyncHandler(type: ChangeType, handler: SyncHandler): void {
  syncHandlers.set(type, handler);
}

/**
 * Syncs all offline changes when connection is restored
 * Requirements: 9.4, 9.5
 * 
 * @returns Result of the sync operation
 */
export async function syncOfflineChanges(): Promise<SyncResult> {
  if (syncInProgress) {
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: [{ changeId: '', error: 'Sync already in progress' }],
    };
  }

  if (!isOnline) {
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: [{ changeId: '', error: 'Device is offline' }],
    };
  }

  syncInProgress = true;
  const result: SyncResult = {
    success: true,
    syncedCount: 0,
    failedCount: 0,
    errors: [],
  };

  try {
    const queue = getQueue();
    
    if (queue.length === 0) {
      return result;
    }

    // Sort by timestamp to process in order
    queue.sort((a, b) => a.timestamp - b.timestamp);

    for (const change of queue) {
      const handler = syncHandlers.get(change.type);
      
      if (!handler) {
        console.warn(`No sync handler registered for type: ${change.type}`);
        result.errors.push({ changeId: change.id, error: `No handler for type: ${change.type}` });
        result.failedCount++;
        continue;
      }

      try {
        const syncResult = await handler(change);
        
        if (syncResult.success) {
          removeChange(change.id);
          result.syncedCount++;
        } else {
          incrementRetryCount(change.id);
          
          // Remove if max retries exceeded
          if (change.retryCount >= MAX_RETRY_COUNT) {
            removeChange(change.id);
            result.errors.push({ 
              changeId: change.id, 
              error: `Max retries exceeded: ${syncResult.error}` 
            });
          } else {
            result.errors.push({ changeId: change.id, error: syncResult.error || 'Unknown error' });
          }
          result.failedCount++;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        incrementRetryCount(change.id);
        result.errors.push({ changeId: change.id, error: errorMessage });
        result.failedCount++;
      }
    }

    result.success = result.failedCount === 0;
  } finally {
    syncInProgress = false;
  }

  return result;
}


/**
 * Gets the current online status
 */
export function getOnlineStatus(): boolean {
  return isOnline;
}

/**
 * Updates the online status
 * Requirements: 9.4
 * 
 * @param online - Whether the device is online
 */
export function setOnlineStatus(online: boolean): void {
  const wasOffline = !isOnline;
  isOnline = online;
  
  // Notify listeners
  connectionListeners.forEach(listener => {
    try {
      listener(online);
    } catch (err) {
      console.error('Error in connection listener:', err);
    }
  });

  // Auto-sync when coming back online
  if (wasOffline && online) {
    console.log('Connection restored, syncing offline changes...');
    syncOfflineChanges().then(result => {
      if (result.syncedCount > 0) {
        console.log(`Synced ${result.syncedCount} offline changes`);
      }
      if (result.failedCount > 0) {
        console.warn(`Failed to sync ${result.failedCount} changes:`, result.errors);
      }
    });
  }
}

/**
 * Registers a listener for connection state changes
 * 
 * @param listener - Callback function for state changes
 * @returns Unsubscribe function
 */
export function onConnectionChange(listener: (online: boolean) => void): () => void {
  connectionListeners.add(listener);
  
  // Immediately call with current state
  listener(isOnline);
  
  return () => {
    connectionListeners.delete(listener);
  };
}

/**
 * Initializes connection state handling
 * Sets up browser event listeners for online/offline events
 * Requirements: 9.4
 */
export function initializeConnectionHandling(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => setOnlineStatus(true);
  const handleOffline = () => setOnlineStatus(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Set initial state
  isOnline = navigator.onLine;

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Checks if there are pending changes that need to be synced
 */
export function hasPendingChanges(): boolean {
  return getQueue().length > 0;
}

/**
 * Gets changes that have exceeded max retry count
 */
export function getFailedChanges(): PendingChange[] {
  return getQueue().filter(c => c.retryCount >= MAX_RETRY_COUNT);
}

/**
 * Retries a specific failed change
 * 
 * @param changeId - The ID of the change to retry
 */
export async function retryChange(changeId: string): Promise<{ success: boolean; error?: string }> {
  const queue = getQueue();
  const change = queue.find(c => c.id === changeId);
  
  if (!change) {
    return { success: false, error: 'Change not found' };
  }

  const handler = syncHandlers.get(change.type);
  
  if (!handler) {
    return { success: false, error: `No handler for type: ${change.type}` };
  }

  try {
    const result = await handler(change);
    
    if (result.success) {
      removeChange(changeId);
    }
    
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
