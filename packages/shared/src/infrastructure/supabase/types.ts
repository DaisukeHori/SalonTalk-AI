/**
 * Supabase Types
 * Supabaseデータベース型定義
 */

export interface Database {
  public: {
    Tables: {
      salons: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          phone: string | null;
          plan: 'free' | 'standard' | 'premium' | 'enterprise';
          seats_count: number | null;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          plan?: 'free' | 'standard' | 'premium' | 'enterprise';
          seats_count?: number | null;
          settings?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          plan?: 'free' | 'standard' | 'premium' | 'enterprise';
          seats_count?: number | null;
          settings?: Record<string, unknown>;
          updated_at?: string;
        };
      };
      staffs: {
        Row: {
          id: string;
          salon_id: string;
          email: string;
          name: string;
          role: 'stylist' | 'manager' | 'owner' | 'admin';
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          salon_id: string;
          email: string;
          name: string;
          role?: 'stylist' | 'manager' | 'owner' | 'admin';
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          salon_id?: string;
          email?: string;
          name?: string;
          role?: 'stylist' | 'manager' | 'owner' | 'admin';
          avatar_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          salon_id: string;
          stylist_id: string;
          status: 'recording' | 'processing' | 'analyzing' | 'completed' | 'error';
          customer_info: Record<string, unknown> | null;
          started_at: string;
          ended_at: string | null;
          total_duration_ms: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          salon_id: string;
          stylist_id: string;
          status?: 'recording' | 'processing' | 'analyzing' | 'completed' | 'error';
          customer_info?: Record<string, unknown> | null;
          started_at?: string;
          ended_at?: string | null;
          total_duration_ms?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          salon_id?: string;
          stylist_id?: string;
          status?: 'recording' | 'processing' | 'analyzing' | 'completed' | 'error';
          customer_info?: Record<string, unknown> | null;
          ended_at?: string | null;
          total_duration_ms?: number | null;
          updated_at?: string;
        };
      };
      speaker_segments: {
        Row: {
          id: string;
          session_id: string;
          chunk_index: number;
          speaker: 'stylist' | 'customer';
          speaker_label: string | null;
          text: string;
          start_time_ms: number;
          end_time_ms: number;
          confidence: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          chunk_index: number;
          speaker: 'stylist' | 'customer';
          speaker_label?: string | null;
          text: string;
          start_time_ms: number;
          end_time_ms: number;
          confidence?: number;
          created_at?: string;
        };
        Update: {
          session_id?: string;
          chunk_index?: number;
          speaker?: 'stylist' | 'customer';
          speaker_label?: string | null;
          text?: string;
          start_time_ms?: number;
          end_time_ms?: number;
          confidence?: number;
        };
      };
      analysis_results: {
        Row: {
          id: string;
          session_id: string;
          chunk_index: number;
          overall_score: number;
          metrics: Record<string, unknown>;
          suggestions: string[];
          highlights: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          chunk_index: number;
          overall_score: number;
          metrics: Record<string, unknown>;
          suggestions?: string[];
          highlights?: string[];
          created_at?: string;
        };
        Update: {
          session_id?: string;
          chunk_index?: number;
          overall_score?: number;
          metrics?: Record<string, unknown>;
          suggestions?: string[];
          highlights?: string[];
        };
      };
      session_analyses: {
        Row: {
          id: string;
          session_id: string;
          chunk_index: number;
          overall_score: number;
          talk_ratio_score: number | null;
          talk_ratio_detail: Record<string, unknown>;
          question_score: number | null;
          question_detail: Record<string, unknown>;
          emotion_score: number | null;
          emotion_detail: Record<string, unknown>;
          concern_keywords_score: number | null;
          concern_keywords_detail: Record<string, unknown>;
          proposal_timing_score: number | null;
          proposal_timing_detail: Record<string, unknown>;
          proposal_quality_score: number | null;
          proposal_quality_detail: Record<string, unknown>;
          conversion_score: number | null;
          conversion_detail: Record<string, unknown>;
          suggestions: string[];
          highlights: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          chunk_index: number;
          overall_score: number;
          talk_ratio_score?: number | null;
          talk_ratio_detail?: Record<string, unknown>;
          question_score?: number | null;
          question_detail?: Record<string, unknown>;
          emotion_score?: number | null;
          emotion_detail?: Record<string, unknown>;
          concern_keywords_score?: number | null;
          concern_keywords_detail?: Record<string, unknown>;
          proposal_timing_score?: number | null;
          proposal_timing_detail?: Record<string, unknown>;
          proposal_quality_score?: number | null;
          proposal_quality_detail?: Record<string, unknown>;
          conversion_score?: number | null;
          conversion_detail?: Record<string, unknown>;
          suggestions?: string[];
          highlights?: string[];
          created_at?: string;
        };
        Update: {
          overall_score?: number;
          talk_ratio_score?: number | null;
          talk_ratio_detail?: Record<string, unknown>;
          question_score?: number | null;
          question_detail?: Record<string, unknown>;
          emotion_score?: number | null;
          emotion_detail?: Record<string, unknown>;
          concern_keywords_score?: number | null;
          concern_keywords_detail?: Record<string, unknown>;
          proposal_timing_score?: number | null;
          proposal_timing_detail?: Record<string, unknown>;
          proposal_quality_score?: number | null;
          proposal_quality_detail?: Record<string, unknown>;
          conversion_score?: number | null;
          conversion_detail?: Record<string, unknown>;
          suggestions?: string[];
          highlights?: string[];
        };
      };
      success_cases: {
        Row: {
          id: string;
          salon_id: string;
          session_id: string | null;
          staff_id: string | null;
          concern_keywords: string[];
          approach_text: string;
          result: string;
          conversion_rate: number | null;
          embedding: number[] | null;
          content: string | null;
          metadata: Record<string, unknown>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          salon_id: string;
          session_id?: string | null;
          staff_id?: string | null;
          concern_keywords: string[];
          approach_text: string;
          result: string;
          conversion_rate?: number | null;
          embedding?: number[] | null;
          content?: string | null;
          metadata?: Record<string, unknown>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          salon_id?: string;
          session_id?: string | null;
          staff_id?: string | null;
          concern_keywords?: string[];
          approach_text?: string;
          result?: string;
          conversion_rate?: number | null;
          embedding?: number[] | null;
          content?: string | null;
          metadata?: Record<string, unknown>;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          session_id: string;
          summary: string;
          overall_score: number;
          metrics: Record<string, unknown>;
          improvements: string[];
          strengths: string[];
          comparison_with_average: Record<string, unknown>[];
          matched_success_cases: Record<string, unknown>[];
          generated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          summary: string;
          overall_score: number;
          metrics: Record<string, unknown>;
          improvements?: string[];
          strengths?: string[];
          comparison_with_average?: Record<string, unknown>[];
          matched_success_cases?: Record<string, unknown>[];
          generated_at?: string;
        };
        Update: {
          summary?: string;
          overall_score?: number;
          metrics?: Record<string, unknown>;
          improvements?: string[];
          strengths?: string[];
          comparison_with_average?: Record<string, unknown>[];
          matched_success_cases?: Record<string, unknown>[];
        };
      };
      training_scenarios: {
        Row: {
          id: string;
          salon_id: string | null;
          title: string;
          description: string;
          customer_persona: Record<string, unknown>;
          objectives: string[];
          difficulty: 'beginner' | 'intermediate' | 'advanced';
          estimated_minutes: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          salon_id?: string | null;
          title: string;
          description: string;
          customer_persona: Record<string, unknown>;
          objectives: string[];
          difficulty?: 'beginner' | 'intermediate' | 'advanced';
          estimated_minutes?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          salon_id?: string | null;
          title?: string;
          description?: string;
          customer_persona?: Record<string, unknown>;
          objectives?: string[];
          difficulty?: 'beginner' | 'intermediate' | 'advanced';
          estimated_minutes?: number;
          is_active?: boolean;
        };
      };
      roleplay_sessions: {
        Row: {
          id: string;
          staff_id: string;
          scenario_id: string;
          status: 'in_progress' | 'completed' | 'abandoned' | 'evaluated';
          messages: Record<string, unknown>[];
          evaluation: Record<string, unknown> | null;
          started_at: string;
          ended_at: string | null;
          evaluated_at: string | null;
        };
        Insert: {
          id?: string;
          staff_id: string;
          scenario_id: string;
          status?: 'in_progress' | 'completed' | 'abandoned' | 'evaluated';
          messages?: Record<string, unknown>[];
          evaluation?: Record<string, unknown> | null;
          started_at?: string;
          ended_at?: string | null;
          evaluated_at?: string | null;
        };
        Update: {
          staff_id?: string;
          scenario_id?: string;
          status?: 'in_progress' | 'completed' | 'abandoned' | 'evaluated';
          messages?: Record<string, unknown>[];
          evaluation?: Record<string, unknown> | null;
          ended_at?: string | null;
          evaluated_at?: string | null;
        };
      };
      transcripts: {
        Row: {
          id: string;
          session_id: string;
          chunk_index: number;
          text: string;
          start_time_ms: number;
          end_time_ms: number;
          audio_url: string | null;
          confidence: number;
          speaker_label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          chunk_index: number;
          text: string;
          start_time_ms: number;
          end_time_ms: number;
          audio_url?: string | null;
          confidence?: number;
          speaker_label?: string | null;
          created_at?: string;
        };
        Update: {
          session_id?: string;
          chunk_index?: number;
          text?: string;
          start_time_ms?: number;
          end_time_ms?: number;
          audio_url?: string | null;
          confidence?: number;
          speaker_label?: string | null;
        };
      };
      push_tokens: {
        Row: {
          id: string;
          staff_id: string;
          token: string;
          platform: 'ios' | 'android' | 'web';
          device_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          token: string;
          platform: 'ios' | 'android' | 'web';
          device_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          staff_id?: string;
          token?: string;
          platform?: 'ios' | 'android' | 'web';
          device_id?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      notification_logs: {
        Row: {
          id: string;
          staff_id: string;
          type: string;
          title: string;
          body: string;
          data: Record<string, unknown>;
          status: 'sent' | 'delivered' | 'failed' | 'read';
          sent_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          staff_id: string;
          type: string;
          title: string;
          body: string;
          data?: Record<string, unknown>;
          status?: 'sent' | 'delivered' | 'failed' | 'read';
          sent_at?: string;
          read_at?: string | null;
        };
        Update: {
          staff_id?: string;
          type?: string;
          title?: string;
          body?: string;
          data?: Record<string, unknown>;
          status?: 'sent' | 'delivered' | 'failed' | 'read';
          read_at?: string | null;
        };
      };
    };
    Functions: {
      search_success_cases: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
          salon_id?: string | null;
        };
        Returns: {
          id: string;
          concern_keywords: string[];
          approach_text: string;
          result: string;
          similarity: number;
        }[];
      };
      get_staff_statistics: {
        Args: {
          p_staff_id: string;
          p_start_date?: string | null;
          p_end_date?: string | null;
        };
        Returns: {
          staff_id: string;
          staff_name: string;
          salon_name: string;
          total_sessions: number;
          completed_sessions: number;
          total_duration_hours: number;
          avg_session_duration_minutes: number;
          avg_overall_score: number;
          avg_talk_ratio_score: number;
          avg_question_score: number;
          avg_emotion_score: number;
          avg_concern_keywords_score: number;
          avg_proposal_timing_score: number;
          avg_proposal_quality_score: number;
          avg_conversion_score: number;
          conversion_count: number;
          conversion_rate: number;
          training_count: number;
          avg_training_score: number;
          score_trend: Record<string, unknown>[];
          period_start: string;
          period_end: string;
        }[];
      };
      get_salon_statistics: {
        Args: {
          p_salon_id: string;
          p_start_date?: string | null;
          p_end_date?: string | null;
        };
        Returns: {
          salon_id: string;
          salon_name: string;
          total_staff: number;
          active_staff: number;
          total_sessions: number;
          completed_sessions: number;
          avg_sessions_per_staff: number;
          avg_overall_score: number;
          conversion_count: number;
          conversion_rate: number;
          total_training_count: number;
          avg_training_score: number;
          top_performers: Record<string, unknown>[];
          period_start: string;
          period_end: string;
        }[];
      };
      increment_training_count: {
        Args: {
          p_staff_id: string;
          p_score: number;
        };
        Returns: void;
      };
    };
  };
}
