/**
 * ApiService
 * Handles API calls to Supabase Edge Functions
 */

import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';

export interface CreateSessionRequest {
  stylistId: string;
  customerInfo?: {
    ageGroup?: '10s' | '20s' | '30s' | '40s' | '50s' | '60s+';
    gender?: 'male' | 'female' | 'other';
    visitFrequency?: 'first' | 'monthly' | 'bimonthly' | 'quarterly' | 'irregular';
    notes?: string;
  };
}

export interface CreateSessionResponse {
  sessionId: string;
  status: 'recording';
  startedAt: string;
  realtimeChannel: string;
}

export interface ProcessAudioRequest {
  sessionId: string;
  chunkIndex: number;
  audioUri: string;
  transcripts: {
    text: string;
    startTime: number;
    endTime: number;
  };
}

export interface ProcessAudioResponse {
  segmentId: string;
  audioUrl: string;
  diarizationTriggered: boolean;
}

export interface EndSessionRequest {
  sessionId: string;
}

export interface EndSessionResponse {
  status: 'processing' | 'completed';
  endedAt: string;
}

export interface GenerateReportResponse {
  reportId: string;
  overallScore: number;
  goodPoints: string[];
  improvementPoints: string[];
  actionItems: string[];
  transcriptSummary: string;
  aiFeedback: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiService {
  private accessToken: string | null = null;

  /**
   * Set authentication token
   */
  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  /**
   * Get default headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  /**
   * Make API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${SUPABASE_URL}/functions/v1/${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const error: ApiError = data.error || {
        code: 'UNKNOWN',
        message: 'An unknown error occurred',
      };
      throw new Error(`${error.code}: ${error.message}`);
    }

    return data.data as T;
  }

  /**
   * Create a new session
   */
  async createSession(request: CreateSessionRequest): Promise<CreateSessionResponse> {
    return this.request<CreateSessionResponse>('create-session', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Process audio chunk
   */
  async processAudio(request: ProcessAudioRequest): Promise<ProcessAudioResponse> {
    const formData = new FormData();
    formData.append('sessionId', request.sessionId);
    formData.append('chunkIndex', request.chunkIndex.toString());
    formData.append('transcripts', JSON.stringify(request.transcripts));

    // Read audio file and append
    const audioInfo = await FileSystem.getInfoAsync(request.audioUri);
    if (!audioInfo.exists) {
      throw new Error('Audio file does not exist');
    }

    // Create blob from file
    const response = await fetch(request.audioUri);
    const blob = await response.blob();
    formData.append('audio', blob, `chunk_${request.chunkIndex}.wav`);

    const url = `${SUPABASE_URL}/functions/v1/process-audio`;

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      const error: ApiError = data.error || {
        code: 'UNKNOWN',
        message: 'An unknown error occurred',
      };
      throw new Error(`${error.code}: ${error.message}`);
    }

    return data.data as ProcessAudioResponse;
  }

  /**
   * End a session
   */
  async endSession(request: EndSessionRequest): Promise<EndSessionResponse> {
    return this.request<EndSessionResponse>('end-session', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Generate session report
   */
  async generateReport(sessionId: string): Promise<GenerateReportResponse> {
    return this.request<GenerateReportResponse>('generate-report', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  /**
   * Search success cases
   */
  async searchSuccessCases(
    concernKeywords: string[],
    customerInfo?: { ageGroup?: string; gender?: string }
  ): Promise<Array<{
    id: string;
    concernKeywords: string[];
    successfulTalk: string;
    keyTactics: string[];
    soldProduct: string | null;
    similarity: number | null;
  }>> {
    return this.request('search-success-cases', {
      method: 'POST',
      body: JSON.stringify({ concernKeywords, customerInfo }),
    });
  }

  /**
   * Analyze conversation (for manual trigger)
   */
  async analyzeConversation(
    sessionId: string,
    segments: Array<{
      speaker: 'stylist' | 'customer';
      text: string;
      startTimeMs: number;
      endTimeMs: number;
    }>
  ): Promise<{
    overallScore: number;
    metrics: Record<string, { score: number; value: number }>;
    suggestions: string[];
  }> {
    return this.request('analyze-conversation', {
      method: 'POST',
      body: JSON.stringify({ sessionId, segments }),
    });
  }
}

// Singleton instance
export const apiService = new ApiService();
