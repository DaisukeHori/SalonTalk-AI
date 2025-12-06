/**
 * Supabase Types
 * Supabaseデータベース型定義
 *
 * 一貫性ルール:
 * - 時間カラム: start_time_ms / end_time_ms (INTEGER, ミリ秒)
 * - speaker値: 'stylist' | 'customer' | 'unknown'
 * - training: title / difficulty (NOT name / level)
 * - roleplay: messages / ended_at (NOT conversation_history / completed_at)
 * - レポート: session_reports のみ (reports テーブルは存在しない)
 * - 分析: session_analyses (正規化構造: indicator_type, value, score, details)
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
          id: string; // = auth.users(id)
          salon_id: string;
          email: string;
          name: string;
          role: 'stylist' | 'manager' | 'owner' | 'admin' | 'assistant';
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string; // = auth.users(id)
          salon_id: string;
          email: string;
          name: string;
          role?: 'stylist' | 'manager' | 'owner' | 'admin' | 'assistant';
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          salon_id?: string;
          email?: string;
          name?: string;
          role?: 'stylist' | 'manager' | 'owner' | 'admin' | 'assistant';
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
          diarization_status: 'pending' | 'processing' | 'completed' | 'failed' | null;
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
          diarization_status?: 'pending' | 'processing' | 'completed' | 'failed' | null;
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
          diarization_status?: 'pending' | 'processing' | 'completed' | 'failed' | null;
          customer_info?: Record<string, unknown> | null;
          ended_at?: string | null;
          total_duration_ms?: number | null;
          updated_at?: string;
        };
      };
      transcripts: {
        Row: {
          id: string;
          session_id: string;
          chunk_index: number;
          text: string;
          start_time_ms: number; // ミリ秒 (INTEGER)
          end_time_ms: number;   // ミリ秒 (INTEGER)
          audio_url: string | null;
          confidence: number | null;
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
          confidence?: number | null;
          created_at?: string;
        };
        Update: {
          session_id?: string;
          chunk_index?: number;
          text?: string;
          start_time_ms?: number;
          end_time_ms?: number;
          audio_url?: string | null;
          confidence?: number | null;
        };
      };
      speaker_segments: {
        Row: {
          id: string;
          session_id: string;
          chunk_index: number;
          speaker: 'stylist' | 'customer' | 'unknown'; // 'unknown' を含む
          text: string;
          start_time_ms: number; // ミリ秒 (INTEGER)
          end_time_ms: number;   // ミリ秒 (INTEGER)
          confidence: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          chunk_index: number;
          speaker: 'stylist' | 'customer' | 'unknown';
          text: string;
          start_time_ms: number;
          end_time_ms: number;
          confidence?: number | null;
          created_at?: string;
        };
        Update: {
          session_id?: string;
          chunk_index?: number;
          speaker?: 'stylist' | 'customer' | 'unknown';
          text?: string;
          start_time_ms?: number;
          end_time_ms?: number;
          confidence?: number | null;
        };
      };
      session_analyses: {
        // 正規化構造: indicator_type ごとに1行
        Row: {
          id: string;
          session_id: string;
          chunk_index: number;
          indicator_type: 'talk_ratio' | 'question_analysis' | 'emotion_analysis' | 'concern_keywords' | 'proposal_timing' | 'proposal_quality' | 'conversion';
          value: number;
          score: number; // 0-100
          details: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          chunk_index: number;
          indicator_type: 'talk_ratio' | 'question_analysis' | 'emotion_analysis' | 'concern_keywords' | 'proposal_timing' | 'proposal_quality' | 'conversion';
          value: number;
          score: number;
          details?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          session_id?: string;
          chunk_index?: number;
          indicator_type?: 'talk_ratio' | 'question_analysis' | 'emotion_analysis' | 'concern_keywords' | 'proposal_timing' | 'proposal_quality' | 'conversion';
          value?: number;
          score?: number;
          details?: Record<string, unknown> | null;
        };
      };
      session_reports: {
        Row: {
          id: string;
          session_id: string;
          summary: string;
          overall_score: number; // 0-100
          metrics: Record<string, unknown> | null;
          stylist_ratio: number | null;
          customer_ratio: number | null;
          open_question_count: number | null;
          closed_question_count: number | null;
          positive_ratio: number | null;
          concern_keywords: string[] | null;
          proposal_timing_ms: number | null;
          proposal_match_rate: number | null;
          is_converted: boolean | null;
          improvements: string[] | null;
          strengths: string[] | null;
          matched_cases: Record<string, unknown>[] | null;
          generated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          summary: string;
          overall_score: number;
          metrics?: Record<string, unknown> | null;
          stylist_ratio?: number | null;
          customer_ratio?: number | null;
          open_question_count?: number | null;
          closed_question_count?: number | null;
          positive_ratio?: number | null;
          concern_keywords?: string[] | null;
          proposal_timing_ms?: number | null;
          proposal_match_rate?: number | null;
          is_converted?: boolean | null;
          improvements?: string[] | null;
          strengths?: string[] | null;
          matched_cases?: Record<string, unknown>[] | null;
          generated_at?: string;
        };
        Update: {
          session_id?: string;
          summary?: string;
          overall_score?: number;
          metrics?: Record<string, unknown> | null;
          stylist_ratio?: number | null;
          customer_ratio?: number | null;
          open_question_count?: number | null;
          closed_question_count?: number | null;
          positive_ratio?: number | null;
          concern_keywords?: string[] | null;
          proposal_timing_ms?: number | null;
          proposal_match_rate?: number | null;
          is_converted?: boolean | null;
          improvements?: string[] | null;
          strengths?: string[] | null;
          matched_cases?: Record<string, unknown>[] | null;
        };
      };
      success_cases: {
        Row: {
          id: string;
          salon_id: string;
          session_id: string | null;
          stylist_id: string | null;
          concern_keywords: string[];
          customer_profile: Record<string, unknown> | null;
          approach_text: string;
          successful_talk: string | null;
          result: string;
          key_tactics: string[] | null;
          sold_product: string | null;
          conversion_rate: number | null;
          embedding: number[] | null;
          is_active: boolean;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          salon_id: string;
          session_id?: string | null;
          stylist_id?: string | null;
          concern_keywords: string[];
          customer_profile?: Record<string, unknown> | null;
          approach_text: string;
          successful_talk?: string | null;
          result: string;
          key_tactics?: string[] | null;
          sold_product?: string | null;
          conversion_rate?: number | null;
          embedding?: number[] | null;
          is_active?: boolean;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          salon_id?: string;
          session_id?: string | null;
          stylist_id?: string | null;
          concern_keywords?: string[];
          customer_profile?: Record<string, unknown> | null;
          approach_text?: string;
          successful_talk?: string | null;
          result?: string;
          key_tactics?: string[] | null;
          sold_product?: string | null;
          conversion_rate?: number | null;
          embedding?: number[] | null;
          is_active?: boolean;
          is_public?: boolean;
          updated_at?: string;
        };
      };
      training_scenarios: {
        // title / difficulty を使用 (NOT name / level)
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
        // messages / ended_at を使用 (NOT conversation_history / completed_at)
        Row: {
          id: string;
          staff_id: string;
          scenario_id: string;
          status: 'in_progress' | 'completed' | 'abandoned';
          messages: Record<string, unknown>[];
          evaluation: Record<string, unknown> | null;
          started_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          staff_id: string;
          scenario_id: string;
          status?: 'in_progress' | 'completed' | 'abandoned';
          messages?: Record<string, unknown>[];
          evaluation?: Record<string, unknown> | null;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: {
          staff_id?: string;
          scenario_id?: string;
          status?: 'in_progress' | 'completed' | 'abandoned';
          messages?: Record<string, unknown>[];
          evaluation?: Record<string, unknown> | null;
          ended_at?: string | null;
        };
      };
      staff_training_stats: {
        Row: {
          id: string;
          staff_id: string;
          total_training_count: number;
          total_score_sum: number;
          average_score: number; // GENERATED column
          highest_score: number;
          last_training_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          total_training_count?: number;
          total_score_sum?: number;
          highest_score?: number;
          last_training_at?: string | null;
          updated_at?: string;
        };
        Update: {
          total_training_count?: number;
          total_score_sum?: number;
          highest_score?: number;
          last_training_at?: string | null;
          updated_at?: string;
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
          data: Record<string, unknown> | null;
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
          data?: Record<string, unknown> | null;
          status?: 'sent' | 'delivered' | 'failed' | 'read';
          sent_at?: string;
          read_at?: string | null;
        };
        Update: {
          staff_id?: string;
          type?: string;
          title?: string;
          body?: string;
          data?: Record<string, unknown> | null;
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
