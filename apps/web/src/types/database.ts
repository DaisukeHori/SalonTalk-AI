/**
 * Database Types
 * Supabaseデータベースの型定義
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      salons: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          phone: string | null;
          plan: string;
          seats_count: number | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          plan?: string;
          seats_count?: number | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          plan?: string;
          seats_count?: number | null;
          settings?: Json;
          created_at?: string;
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
          customer_info: Json | null;
          status: 'recording' | 'processing' | 'analyzing' | 'completed' | 'error';
          diarization_status: 'pending' | 'processing' | 'completed' | 'failed' | null;
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
          customer_info?: Json | null;
          status?: 'recording' | 'processing' | 'analyzing' | 'completed' | 'error';
          diarization_status?: 'pending' | 'processing' | 'completed' | 'failed' | null;
          started_at?: string;
          ended_at?: string | null;
          total_duration_ms?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          salon_id?: string;
          stylist_id?: string;
          customer_info?: Json | null;
          status?: 'recording' | 'processing' | 'analyzing' | 'completed' | 'error';
          diarization_status?: 'pending' | 'processing' | 'completed' | 'failed' | null;
          started_at?: string;
          ended_at?: string | null;
          total_duration_ms?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      speaker_segments: {
        Row: {
          id: string;
          session_id: string;
          chunk_index: number;
          speaker: 'stylist' | 'customer' | 'unknown';
          text: string;
          start_time_ms: number;
          end_time_ms: number;
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
          id?: string;
          session_id?: string;
          chunk_index?: number;
          speaker?: 'stylist' | 'customer' | 'unknown';
          text?: string;
          start_time_ms?: number;
          end_time_ms?: number;
          confidence?: number | null;
          created_at?: string;
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
          id?: string;
          session_id?: string;
          chunk_index?: number;
          text?: string;
          start_time_ms?: number;
          end_time_ms?: number;
          audio_url?: string | null;
          confidence?: number | null;
          created_at?: string;
        };
      };
      session_analyses: {
        Row: {
          id: string;
          session_id: string;
          chunk_index: number;
          indicator_type: 'talk_ratio' | 'question_analysis' | 'emotion_analysis' | 'concern_keywords' | 'proposal_timing' | 'proposal_quality' | 'conversion';
          value: number;
          score: number;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          chunk_index: number;
          indicator_type: 'talk_ratio' | 'question_analysis' | 'emotion_analysis' | 'concern_keywords' | 'proposal_timing' | 'proposal_quality' | 'conversion';
          value: number;
          score: number;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          chunk_index?: number;
          indicator_type?: 'talk_ratio' | 'question_analysis' | 'emotion_analysis' | 'concern_keywords' | 'proposal_timing' | 'proposal_quality' | 'conversion';
          value?: number;
          score?: number;
          details?: Json | null;
          created_at?: string;
        };
      };
      session_reports: {
        Row: {
          id: string;
          session_id: string;
          summary: string;
          overall_score: number;
          metrics: Json | null;
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
          matched_cases: Json | null;
          generated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          summary: string;
          overall_score: number;
          metrics?: Json | null;
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
          matched_cases?: Json | null;
          generated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          summary?: string;
          overall_score?: number;
          metrics?: Json | null;
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
          matched_cases?: Json | null;
          generated_at?: string;
        };
      };
      success_cases: {
        Row: {
          id: string;
          salon_id: string;
          session_id: string | null;
          stylist_id: string | null;
          concern_keywords: string[];
          customer_profile: Json | null;
          approach_text: string;
          successful_talk: string | null;
          key_tactics: string[] | null;
          result: string;
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
          customer_profile?: Json | null;
          approach_text: string;
          successful_talk?: string | null;
          key_tactics?: string[] | null;
          result: string;
          sold_product?: string | null;
          conversion_rate?: number | null;
          embedding?: number[] | null;
          is_active?: boolean;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          salon_id?: string;
          session_id?: string | null;
          stylist_id?: string | null;
          concern_keywords?: string[];
          customer_profile?: Json | null;
          approach_text?: string;
          successful_talk?: string | null;
          key_tactics?: string[] | null;
          result?: string;
          sold_product?: string | null;
          conversion_rate?: number | null;
          embedding?: number[] | null;
          is_active?: boolean;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      training_scenarios: {
        Row: {
          id: string;
          salon_id: string | null;
          title: string;
          description: string;
          difficulty: string;
          customer_persona: Json;
          objectives: string[];
          estimated_minutes: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          salon_id?: string | null;
          title: string;
          description: string;
          difficulty?: string;
          customer_persona: Json;
          objectives: string[];
          estimated_minutes?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          salon_id?: string | null;
          title?: string;
          description?: string;
          difficulty?: string;
          customer_persona?: Json;
          objectives?: string[];
          estimated_minutes?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      roleplay_sessions: {
        Row: {
          id: string;
          staff_id: string;
          scenario_id: string;
          status: string;
          messages: Json;
          evaluation: Json | null;
          started_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          staff_id: string;
          scenario_id: string;
          status?: string;
          messages?: Json;
          evaluation?: Json | null;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          staff_id?: string;
          scenario_id?: string;
          status?: string;
          messages?: Json;
          evaluation?: Json | null;
          started_at?: string;
          ended_at?: string | null;
        };
      };
      push_tokens: {
        Row: {
          id: string;
          staff_id: string;
          token: string;
          platform: string;
          device_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          token: string;
          platform: string;
          device_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          token?: string;
          platform?: string;
          device_id?: string | null;
          is_active?: boolean;
          created_at?: string;
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
          data: Json | null;
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
          data?: Json | null;
          status?: 'sent' | 'delivered' | 'failed' | 'read';
          sent_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          staff_id?: string;
          type?: string;
          title?: string;
          body?: string;
          data?: Json | null;
          status?: 'sent' | 'delivered' | 'failed' | 'read';
          sent_at?: string;
          read_at?: string | null;
        };
      };
      staff_training_stats: {
        Row: {
          id: string;
          staff_id: string;
          total_training_count: number;
          total_score_sum: number;
          average_score: number;
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
    };
    Views: {};
    Functions: {
      search_success_cases: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
          salon_id?: string | null;
        };
        Returns: Array<{
          id: string;
          concern_keywords: string[];
          approach_text: string;
          result: string;
          similarity: number;
        }>;
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
}
