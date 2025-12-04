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
  transcriptId: string;
  audioUrl: string;
  diarizationTriggered: boolean;
}

export interface EndSessionRequest {
  sessionId: string;
}

export interface EndSessionResponse {
  sessionId: string;
  status: 'processing' | 'completed';
  endedAt: string;
  totalDurationMs: number;
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
    sessionId: string;
    createdAt: string;
    overallScore: number;
    isConverted: boolean;
    durationMinutes: number;
    customerInfo?: {
      ageGroup?: string;
      visitType?: 'new' | 'repeat';
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
  scenarioId?: string;
  sessionId?: string;
  userMessage: string;
  conversationHistory?: RoleplayMessage[];
}

export interface RoleplayChatResponse {
  aiResponse: string;
  hint: string | null;
  isCompleted: boolean;
  evaluation: RoleplayEvaluation | null;
  messageCount: number;
}

export interface RoleplayEvaluation {
  overallScore: number;
  metrics: {
    talkRatio?: { score: number; details: string };
    questionQuality?: { score: number; details: string };
    emotion?: { score: number; details: string };
    proposalTiming?: { score: number; details: string };
    proposalQuality?: { score: number; details: string };
  };
  feedback: string;
  improvements: string[];
  modelAnswer: string;
}

export interface EvaluateRoleplayRequest {
  sessionId?: string;
  scenarioId?: string;
  messages: RoleplayMessage[];
  objectives?: string[];
}

export interface RoleplayEvaluationResult {
  overallScore: number;
  metrics: {
    empathy: { score: number; details: string };
    productKnowledge: { score: number; details: string };
    questioningSkill: { score: number; details: string };
    objectionHandling: { score: number; details: string };
    closingSkill: { score: number; details: string };
  };
  feedback: string;
  improvements: string[];
  strengths: string[];
  modelAnswers: Array<{
    situation: string;
    stylistResponse: string;
    modelAnswer: string;
    reasoning: string;
  }>;
  sessionId?: string;
  scenarioId?: string;
  messageCount: number;
  evaluatedAt: string;
}

export interface ReportData {
  id: string;
  sessionId: string;
  summary: string;
  overallScore: number;
  metrics: {
    talkRatio: { score: number; details: string; stylistRatio: number; customerRatio: number };
    questionQuality: { score: number; details: string; openCount: number; closedCount: number };
    emotion: { score: number; details: string; positiveRatio: number };
    concernKeywords: { score: number; details: string; keywords: string[] };
    proposalTiming: { score: number; details: string };
    proposalQuality: { score: number; details: string; matchRate: number };
    conversion: { score: number; details: string; isConverted: boolean };
  };
  improvements: string[];
  strengths: string[];
  generatedAt: string;
}

// Training scenario types
export interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  customerPersona: {
    name: string;
    ageGroup: string;
    personality: string;
    hairConcerns: string[];
  };
  objectives: string[];
}

export interface StartRoleplayResponse {
  id: string;
  initialMessage: string | null;
}

export interface RoleplayMessageResponse {
  message: string;
  shouldEnd: boolean;
}

export interface RoleplayEndResult {
  overallScore: number;
  feedback: string;
  improvements: string[];
  modelAnswers?: Array<{
    situation: string;
    yourResponse: string;
    modelAnswer: string;
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
  accessToken: string;
}

// Singleton instance
export const apiService = new ApiService();
