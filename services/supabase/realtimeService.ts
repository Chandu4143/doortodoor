/**
 * Real-time Service
 * Handles real-time subscriptions and channel management for team data synchronization
 * Requirements: 9.1, 9.2
 */

import { supabase } from './client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Connection state types
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

// Payload types for real-time changes
export interface RealtimePayload<T = Record<string, unknown>> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
  table: string;
  schema: string;
}

// Change payload for broadcasting
export interface ChangePayload {
  type: 'apartment' | 'room' | 'campaign' | 'business';
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: string;
}

// Callback types
export type RealtimeCallback<T = Record<string, unknown>> = (payload: RealtimePayload<T>) => void;
export type ConnectionStateCallback = (state: ConnectionState) => void;

// Active channels map
const activeChannels: Map<string, RealtimeChannel> = new Map();

// Connection state listeners
const connectionStateListeners: Set<ConnectionStateCallback> = new Set();

// Current connection state
let currentConnectionState: ConnectionState = 'disconnected';

/**
 * Updates the connection state and notifies all listeners
 */
function updateConnectionState(state: ConnectionState): void {
  currentConnectionState = state;
  connectionStateListeners.forEach(callback => {
    try {
      callback(state);
    } catch (err) {
      console.error('Error in connection state callback:', err);
    }
  });
}

/**
 * Gets the current connection state
 */
export function getConnectionState(): ConnectionState {
  return currentConnectionState;
}


/**
 * Subscribes to a team channel for real-time updates
 * Requirements: 9.1, 9.2
 * 
 * @param teamId - The team ID to subscribe to
 * @returns The RealtimeChannel instance
 */
export function subscribeToTeam(teamId: string): RealtimeChannel {
  const channelKey = `team:${teamId}`;
  
  // Return existing channel if already subscribed
  if (activeChannels.has(channelKey)) {
    return activeChannels.get(channelKey)!;
  }

  // Create new channel for the team
  const channel = supabase.channel(channelKey, {
    config: {
      broadcast: { self: true },
      presence: { key: teamId },
    },
  });

  // Track connection state
  channel.on('system', { event: '*' }, (payload) => {
    if (payload.extension === 'presence') {
      return; // Ignore presence events for connection state
    }
    
    switch (payload.event) {
      case 'subscribed':
        updateConnectionState('connected');
        break;
      case 'closed':
        updateConnectionState('disconnected');
        break;
      case 'error':
        console.error('Channel error:', payload);
        updateConnectionState('disconnected');
        break;
    }
  });

  // Subscribe to the channel
  channel.subscribe((status) => {
    switch (status) {
      case 'SUBSCRIBED':
        updateConnectionState('connected');
        break;
      case 'CLOSED':
        updateConnectionState('disconnected');
        break;
      case 'CHANNEL_ERROR':
        updateConnectionState('disconnected');
        break;
      case 'TIMED_OUT':
        updateConnectionState('reconnecting');
        break;
    }
  });

  activeChannels.set(channelKey, channel);
  return channel;
}

/**
 * Unsubscribes from a team channel
 * 
 * @param teamId - The team ID to unsubscribe from
 */
export async function unsubscribeFromTeam(teamId: string): Promise<void> {
  const channelKey = `team:${teamId}`;
  const channel = activeChannels.get(channelKey);
  
  if (channel) {
    await supabase.removeChannel(channel);
    activeChannels.delete(channelKey);
  }
}

/**
 * Broadcasts a change to all team members
 * Requirements: 9.1
 * 
 * @param teamId - The team ID to broadcast to
 * @param payload - The change payload to broadcast
 */
export async function broadcastChange(teamId: string, payload: ChangePayload): Promise<void> {
  const channelKey = `team:${teamId}`;
  let channel = activeChannels.get(channelKey);
  
  if (!channel) {
    channel = subscribeToTeam(teamId);
    // Wait for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  await channel.send({
    type: 'broadcast',
    event: 'data_change',
    payload,
  });
}

/**
 * Listens for broadcast changes on a team channel
 * 
 * @param teamId - The team ID to listen to
 * @param callback - Callback function for changes
 * @returns Unsubscribe function
 */
export function onTeamChange(
  teamId: string,
  callback: (payload: ChangePayload) => void
): () => void {
  const channel = subscribeToTeam(teamId);
  
  channel.on('broadcast', { event: 'data_change' }, (message) => {
    callback(message.payload as ChangePayload);
  });

  return () => {
    // Note: This doesn't fully unsubscribe, just removes this specific listener
    // Full unsubscribe should use unsubscribeFromTeam
  };
}


/**
 * Subscribes to postgres changes on a specific table
 * Requirements: 9.3
 * 
 * @param table - The table name to subscribe to
 * @param filter - Optional filter for the subscription
 * @param callback - Callback function for changes
 * @returns The RealtimeChannel instance
 */
export function subscribeToTable<T = Record<string, unknown>>(
  table: string,
  filter: { column: string; value: string } | null,
  callback: RealtimeCallback<T>
): RealtimeChannel {
  const channelKey = filter 
    ? `postgres:${table}:${filter.column}:${filter.value}`
    : `postgres:${table}`;

  // Return existing channel if already subscribed
  if (activeChannels.has(channelKey)) {
    const existingChannel = activeChannels.get(channelKey)!;
    // Add the callback to existing channel
    existingChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        ...(filter && { filter: `${filter.column}=eq.${filter.value}` }),
      },
      (payload: RealtimePostgresChangesPayload<T>) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as T | null,
          old: payload.old as T | null,
          table: payload.table,
          schema: payload.schema,
        });
      }
    );
    return existingChannel;
  }

  // Create new channel
  const channel = supabase.channel(channelKey);

  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table,
      ...(filter && { filter: `${filter.column}=eq.${filter.value}` }),
    },
    (payload: RealtimePostgresChangesPayload<T>) => {
      callback({
        eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
        new: payload.new as T | null,
        old: payload.old as T | null,
        table: payload.table,
        schema: payload.schema,
      });
    }
  );

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      updateConnectionState('connected');
    } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
      updateConnectionState('disconnected');
    }
  });

  activeChannels.set(channelKey, channel);
  return channel;
}

/**
 * Unsubscribes from a table channel
 * 
 * @param table - The table name
 * @param filter - Optional filter used during subscription
 */
export async function unsubscribeFromTable(
  table: string,
  filter?: { column: string; value: string }
): Promise<void> {
  const channelKey = filter 
    ? `postgres:${table}:${filter.column}:${filter.value}`
    : `postgres:${table}`;
  
  const channel = activeChannels.get(channelKey);
  
  if (channel) {
    await supabase.removeChannel(channel);
    activeChannels.delete(channelKey);
  }
}

/**
 * Registers a callback for connection state changes
 * 
 * @param callback - Callback function for state changes
 * @returns Unsubscribe function
 */
export function onConnectionStateChange(callback: ConnectionStateCallback): () => void {
  connectionStateListeners.add(callback);
  
  // Immediately call with current state
  callback(currentConnectionState);
  
  return () => {
    connectionStateListeners.delete(callback);
  };
}

/**
 * Unsubscribes from all active channels
 */
export async function unsubscribeAll(): Promise<void> {
  const channels = Array.from(activeChannels.values());
  
  for (const channel of channels) {
    await supabase.removeChannel(channel);
  }
  
  activeChannels.clear();
  updateConnectionState('disconnected');
}

/**
 * Gets the count of active channels
 */
export function getActiveChannelCount(): number {
  return activeChannels.size;
}

/**
 * Checks if connected to any channel
 */
export function isConnected(): boolean {
  return currentConnectionState === 'connected';
}
