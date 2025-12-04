/**
 * Supabase Realtime Utilities for Edge Functions
 */
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface BroadcastPayload {
  sessionId: string;
  [key: string]: unknown;
}

type RealtimeEvent =
  | 'score_update'
  | 'transcript_update'
  | 'concern_detected'
  | 'proposal_suggestion'
  | 'similar_cases'
  | 'session_status'
  | 'analysis_complete'
  | 'notification';

/**
 * Get channel name for session
 */
export function getSessionChannel(sessionId: string): string {
  return `session:${sessionId}`;
}

/**
 * Get channel name for staff
 */
export function getStaffChannel(staffId: string): string {
  return `staff:${staffId}`;
}

/**
 * Get channel name for salon
 */
export function getSalonChannel(salonId: string): string {
  return `salon:${salonId}`;
}

/**
 * Broadcast event to session channel
 */
export async function broadcastToSession(
  supabase: SupabaseClient,
  sessionId: string,
  event: RealtimeEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const channel = supabase.channel(getSessionChannel(sessionId));

  await channel.send({
    type: 'broadcast',
    event,
    payload: {
      sessionId,
      timestamp: new Date().toISOString(),
      ...payload,
    },
  });
}

/**
 * Broadcast score update to session
 */
export async function broadcastScoreUpdate(
  supabase: SupabaseClient,
  sessionId: string,
  chunkIndex: number,
  overallScore: number,
  metrics: Record<string, number>
): Promise<void> {
  await broadcastToSession(supabase, sessionId, 'score_update', {
    chunkIndex,
    overallScore,
    metrics,
  });
}

/**
 * Broadcast transcript update to session
 */
export async function broadcastTranscriptUpdate(
  supabase: SupabaseClient,
  sessionId: string,
  chunkIndex: number,
  segments: Array<{ speaker: string; text: string; startTimeMs: number }>
): Promise<void> {
  await broadcastToSession(supabase, sessionId, 'transcript_update', {
    chunkIndex,
    segments,
  });
}

/**
 * Broadcast concern detection to session
 */
export async function broadcastConcernDetected(
  supabase: SupabaseClient,
  sessionId: string,
  keywords: string[],
  suggestion?: string
): Promise<void> {
  await broadcastToSession(supabase, sessionId, 'concern_detected', {
    keywords,
    suggestion,
  });
}

/**
 * Broadcast proposal suggestion to session
 */
export async function broadcastProposalSuggestion(
  supabase: SupabaseClient,
  sessionId: string,
  concernKeyword: string,
  suggestion: string,
  urgency: 'low' | 'medium' | 'high'
): Promise<void> {
  await broadcastToSession(supabase, sessionId, 'proposal_suggestion', {
    concernKeyword,
    suggestion,
    urgency,
  });
}

/**
 * Broadcast similar cases to session
 */
export async function broadcastSimilarCases(
  supabase: SupabaseClient,
  sessionId: string,
  keywords: string[],
  cases: Array<{
    id: string;
    similarity: number;
    approachText: string;
    concernKeywords: string[];
  }>
): Promise<void> {
  await broadcastToSession(supabase, sessionId, 'similar_cases', {
    keywords,
    cases,
  });
}

/**
 * Broadcast session status change
 */
export async function broadcastSessionStatus(
  supabase: SupabaseClient,
  sessionId: string,
  status: string,
  message?: string
): Promise<void> {
  await broadcastToSession(supabase, sessionId, 'session_status', {
    status,
    message,
  });
}

/**
 * Broadcast analysis complete event
 */
export async function broadcastAnalysisComplete(
  supabase: SupabaseClient,
  sessionId: string,
  reportId: string,
  overallScore: number
): Promise<void> {
  await broadcastToSession(supabase, sessionId, 'analysis_complete', {
    reportId,
    overallScore,
  });
}

/**
 * Broadcast notification to staff channel
 */
export async function broadcastToStaff(
  supabase: SupabaseClient,
  staffId: string,
  type: string,
  payload: Record<string, unknown>
): Promise<void> {
  const channel = supabase.channel(getStaffChannel(staffId));

  await channel.send({
    type: 'broadcast',
    event: 'notification',
    payload: {
      staffId,
      type,
      timestamp: new Date().toISOString(),
      ...payload,
    },
  });
}
