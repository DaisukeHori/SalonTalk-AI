/**
 * RealtimeService
 * Handles Supabase Realtime connection for live session updates
 */

import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get Supabase config from environment
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export interface AnalysisUpdate {
  chunkIndex: number;
  overallScore: number;
  indicators: {
    talk_ratio: { score: number; value: number };
    question_analysis: { score: number; value: number };
    emotion_analysis: { score: number; value: number };
    concern_keywords: { score: number; value: number };
    proposal_timing: { score: number; value: number };
    proposal_quality: { score: number; value: number };
    conversion: { score: number; value: number };
  };
}

export interface NotificationPayload {
  type: 'proposal_chance' | 'concern_detected' | 'achievement' | 'reminder';
  title: string;
  message: string;
  recommendedProduct?: string;
  approachText?: string;
  concernKeywords?: string[];
}

export type RealtimeEventListener = (event: RealtimeEvent) => void;

export type RealtimeEvent =
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'analysis'; payload: AnalysisUpdate }
  | { type: 'notification'; payload: NotificationPayload }
  | { type: 'error'; error: Error };

export class RealtimeService {
  private supabase: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private listeners: Set<RealtimeEventListener> = new Set();
  private currentSessionId: string | null = null;
  private isConnected = false;

  constructor() {
    this.initializeSupabase();
  }

  /**
   * Initialize Supabase client
   */
  private initializeSupabase(): void {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('Supabase credentials not configured');
      return;
    }

    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  /**
   * Add event listener
   */
  addListener(listener: RealtimeEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: RealtimeEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * Subscribe to a session channel
   */
  async subscribeToSession(sessionId: string): Promise<void> {
    if (!this.supabase) {
      this.emit({ type: 'error', error: new Error('Supabase not initialized') });
      return;
    }

    // Unsubscribe from previous session if any
    if (this.channel) {
      await this.unsubscribe();
    }

    this.currentSessionId = sessionId;
    const channelName = `session:${sessionId}`;

    this.channel = this.supabase.channel(channelName, {
      config: {
        broadcast: {
          self: true,
        },
      },
    });

    // Listen for analysis events
    this.channel.on('broadcast', { event: 'analysis' }, (payload) => {
      this.emit({
        type: 'analysis',
        payload: payload.payload as AnalysisUpdate,
      });
    });

    // Listen for notification events
    this.channel.on('broadcast', { event: 'notification' }, (payload) => {
      this.emit({
        type: 'notification',
        payload: payload.payload as NotificationPayload,
      });
    });

    // Subscribe to the channel
    const status = await this.channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.isConnected = true;
        this.emit({ type: 'connected' });
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        this.isConnected = false;
        this.emit({ type: 'disconnected' });
      }
    });
  }

  /**
   * Unsubscribe from current channel
   */
  async unsubscribe(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }
    this.currentSessionId = null;
    this.isConnected = false;
  }

  /**
   * Send a broadcast message to the channel
   */
  async broadcast(event: string, payload: unknown): Promise<void> {
    if (!this.channel) {
      throw new Error('Not subscribed to any channel');
    }

    await this.channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  }

  /**
   * Get connection status
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Get Supabase client for API calls
   */
  getSupabaseClient(): SupabaseClient | null {
    return this.supabase;
  }

  /**
   * Set authentication token
   */
  async setAuth(accessToken: string, refreshToken?: string): Promise<void> {
    if (!this.supabase) {
      return;
    }

    await this.supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });
  }

  /**
   * Sign out and cleanup
   */
  async signOut(): Promise<void> {
    await this.unsubscribe();
    if (this.supabase) {
      await this.supabase.auth.signOut();
    }
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();
