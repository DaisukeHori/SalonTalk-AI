/**
 * ApiService
 * Handles API calls to Supabase Edge Functions
 */

import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';

export interface CreateSessionRequest {
  stylist_id: string;
  customer_info?: {
    age_group?: '10s' | '20s' | '30s' | '40s' | '50s' | '60s' | '70s_plus';
    gender?: 'male' | 'female' | 'other';
    visit_frequency?: 'first' | 'monthly' | 'bimonthly' | 'quarterly' | 'irregular';
    notes?: string;
  };
}

export interface CreateSessionResponse {
  session_id: string;
  status: 'recording';
  started_at: string;
  realtime_channel: string;
}

export interface ProcessAudioRequest {
  session_id: string;
  chunk_index: number;
  audio_uri: string;
  transcripts: {
    text: string;
    start_time: number;
    end_time: number;
  };
}

export interface ProcessAudioResponse {
  transcript_id: string;
  audio_url: string;
  diarization_triggered: boolean;
}

export interface EndSessionRequest {
  session_id: string;
}

export interface EndSessionResponse {
  session_id: string;
  status: 'processing' | 'completed';
  ended_at: string;
  total_duration_ms: number;
}

export interface GenerateReportResponse {
  report_id: string;
  overall_score: number;
  good_points: string[];
  improvement_points: string[];
  action_items: string[];
  transcript_summary: string;
  ai_feedback: string;
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
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
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
    formData.append('audio', blob as any);

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
    concern_keywords: string[],
    customer_info?: { age_group?: string; gender?: string }
  ): Promise<{
    cases: Array<{
      id: string;
      concern_keywords: string[];
      approach_text: string;
      result: string;
      similarity: number;
    }>;
    total: number;
  }> {
    return this.request('search-success-cases', {
      method: 'POST',
      body: JSON.stringify({ concern_keywords, customer_info }),
    });
  }

  /**
   * Analyze conversation (for manual trigger)
   */
  async analyzeConversation(
    session_id: string,
    segments: Array<{
      speaker: 'stylist' | 'customer' | 'unknown';
      text: string;
      start_time_ms: number;
      end_time_ms: number;
    }>
  ): Promise<{
    overall_score: number;
    metrics: Record<string, { score: number; value: number }>;
    suggestions: string[];
  }> {
    return this.request('analyze-conversation', {
      method: 'POST',
      body: JSON.stringify({ session_id, segments }),
    });
  }

  /**
   * Roleplay chat - get AI customer response
   */
  async roleplayChat(request: RoleplayChatRequest): Promise<RoleplayChatResponse> {
    return this.request<RoleplayChatResponse>('roleplay-chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Evaluate roleplay session
   */
  async evaluateRoleplay(request: EvaluateRoleplayRequest): Promise<RoleplayEvaluationResult> {
    return this.request<RoleplayEvaluationResult>('evaluate-roleplay', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get report details
   */
  async getReport(sessionId: string): Promise<ReportData> {
    return this.request<ReportData>(`get-report?sessionId=${sessionId}`, {
      method: 'GET',
    });
  }

  /**
   * Get all reports for the current user
   */
  async getReports(): Promise<Array<{
    id: string;
    session_id: string;
    created_at: string;
    overall_score: number;
    is_converted: boolean;
    duration_minutes: number;
    customer_info?: {
      age_group?: string;
      visit_type?: 'new' | 'repeat';
    };
  }>> {
    // This would ideally be a separate Edge Function
    // For now, we'll fetch from Supabase directly through the client
    // The actual implementation should be done via an Edge Function
    return [];
  }

  /**
   * Get training scenario details
   */
  async getTrainingScenario(scenarioId: string): Promise<TrainingScenario> {
    return this.request<TrainingScenario>(`get-training-scenario?id=${scenarioId}`, {
      method: 'GET',
    });
  }

  /**
   * Start a roleplay session
   */
  async startRoleplay(scenarioId: string): Promise<StartRoleplayResponse> {
    return this.request<StartRoleplayResponse>('start-roleplay', {
      method: 'POST',
      body: JSON.stringify({ scenarioId }),
    });
  }

  /**
   * Send a message in roleplay session
   */
  async sendRoleplayMessage(sessionId: string, message: string): Promise<RoleplayMessageResponse> {
    return this.request<RoleplayMessageResponse>('roleplay-chat', {
      method: 'POST',
      body: JSON.stringify({ sessionId, userMessage: message }),
    });
  }

  /**
   * End roleplay session and get evaluation
   */
  async endRoleplay(sessionId: string): Promise<RoleplayEndResult> {
    return this.request<RoleplayEndResult>('evaluate-roleplay', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  /**
   * Login with email and password
   * Note: This should use Supabase Auth directly in production
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('auth-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  /**
   * Logout the current user
   * Note: This should use Supabase Auth directly in production
   */
  async logout(): Promise<void> {
    try {
      await this.request('auth-logout', {
        method: 'POST',
      });
    } catch {
      // Ignore errors, just clear local state
    }
    this.accessToken = null;
  }

  /**
   * Refresh the access token
   * Note: This should use Supabase Auth directly in production
   */
  async refreshToken(): Promise<string | null> {
    try {
      const result = await this.request<{ accessToken: string }>('auth-refresh', {
        method: 'POST',
      });
      this.accessToken = result.accessToken;
      return result.accessToken;
    } catch {
      return null;
    }
  }

  /**
   * Register push notification token
   */
  async registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
    await this.request('register-push-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  }
}

// Roleplay types
export interface RoleplayMessage {
  role: 'customer' | 'stylist';
  content: string;
  timestamp: string;
}

export interface RoleplayChatRequest {
  scenario_id?: string;
  session_id?: string;
  user_message: string;
  conversation_history?: RoleplayMessage[];
}

export interface RoleplayChatResponse {
  ai_response: string;
  hint: string | null;
  is_completed: boolean;
  evaluation: RoleplayEvaluation | null;
  message_count: number;
}

export interface RoleplayEvaluation {
  overall_score: number;
  metrics: {
    talk_ratio?: { score: number; details: string };
    question_quality?: { score: number; details: string };
    emotion?: { score: number; details: string };
    proposal_timing?: { score: number; details: string };
    proposal_quality?: { score: number; details: string };
  };
  feedback: string;
  improvements: string[];
  model_answer: string;
}

export interface EvaluateRoleplayRequest {
  session_id?: string;
  scenario_id?: string;
  messages: RoleplayMessage[];
  objectives?: string[];
}

export interface RoleplayEvaluationResult {
  overall_score: number;
  metrics: {
    empathy: { score: number; details: string };
    product_knowledge: { score: number; details: string };
    questioning_skill: { score: number; details: string };
    objection_handling: { score: number; details: string };
    closing_skill: { score: number; details: string };
  };
  feedback: string;
  improvements: string[];
  strengths: string[];
  model_answers: Array<{
    situation: string;
    stylist_response: string;
    model_answer: string;
    reasoning: string;
  }>;
  session_id?: string;
  scenario_id?: string;
  message_count: number;
  evaluated_at: string;
}

export interface ReportData {
  id: string;
  session_id: string;
  summary: string;
  overall_score: number;
  metrics: {
    talk_ratio: { score: number; details: string; stylist_ratio: number; customer_ratio: number };
    question_quality: { score: number; details: string; open_count: number; closed_count: number };
    emotion: { score: number; details: string; positive_ratio: number };
    concern_keywords: { score: number; details: string; keywords: string[] };
    proposal_timing: { score: number; details: string };
    proposal_quality: { score: number; details: string; match_rate: number };
    conversion: { score: number; details: string; is_converted: boolean };
  };
  improvements: string[];
  strengths: string[];
  generated_at: string;
}

// Training scenario types
export interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  customer_persona: {
    name: string;
    age_group: string;
    personality: string;
    hair_concerns: string[];
  };
  objectives: string[];
}

export interface StartRoleplayResponse {
  id: string;
  initial_message: string | null;
}

export interface RoleplayMessageResponse {
  message: string;
  should_end: boolean;
}

export interface RoleplayEndResult {
  overall_score: number;
  feedback: string;
  improvements: string[];
  model_answers?: Array<{
    situation: string;
    your_response: string;
    model_answer: string;
    reasoning: string;
  }>;
}

// Auth types
export interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  salon: {
    id: string;
    name: string;
  } | null;
  access_token: string;
}

// Singleton instance
export const apiService = new ApiService();
