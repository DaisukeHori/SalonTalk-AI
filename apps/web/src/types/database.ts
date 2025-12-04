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
          owner_email: string | null;
          plan: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_email?: string | null;
          plan?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_email?: string | null;
          plan?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      staffs: {
        Row: {
          id: string;
          salon_id: string;
          auth_user_id: string | null;
          name: string;
          email: string;
          role: string;
          position: string | null;
          profile_image_url: string | null;
          join_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          salon_id: string;
          auth_user_id?: string | null;
          name: string;
          email: string;
          role?: string;
          position?: string | null;
          profile_image_url?: string | null;
          join_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          salon_id?: string;
          auth_user_id?: string | null;
          name?: string;
          email?: string;
          role?: string;
          position?: string | null;
          profile_image_url?: string | null;
          join_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          salon_id: string;
          stylist_id: string;
          customer_info: Json | null;
          status: string;
          started_at: string;
          ended_at: string | null;
          total_duration_ms: number | null;
          realtime_channel: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          salon_id: string;
          stylist_id: string;
          customer_info?: Json | null;
          status?: string;
          started_at?: string;
          ended_at?: string | null;
          total_duration_ms?: number | null;
          realtime_channel?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          salon_id?: string;
          stylist_id?: string;
          customer_info?: Json | null;
          status?: string;
          started_at?: string;
          ended_at?: string | null;
          total_duration_ms?: number | null;
          realtime_channel?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      session_reports: {
        Row: {
          id: string;
          session_id: string;
          overall_score: number | null;
          indicator_scores: Json | null;
          good_points: string[] | null;
          improvement_points: string[] | null;
          action_items: string[] | null;
          transcript_summary: string | null;
          ai_feedback: string | null;
          metrics: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          overall_score?: number | null;
          indicator_scores?: Json | null;
          good_points?: string[] | null;
          improvement_points?: string[] | null;
          action_items?: string[] | null;
          transcript_summary?: string | null;
          ai_feedback?: string | null;
          metrics?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          overall_score?: number | null;
          indicator_scores?: Json | null;
          good_points?: string[] | null;
          improvement_points?: string[] | null;
          action_items?: string[] | null;
          transcript_summary?: string | null;
          ai_feedback?: string | null;
          metrics?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      audio_chunks: {
        Row: {
          id: string;
          session_id: string;
          chunk_index: number;
          storage_path: string | null;
          duration_ms: number | null;
          processed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          chunk_index: number;
          storage_path?: string | null;
          duration_ms?: number | null;
          processed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          chunk_index?: number;
          storage_path?: string | null;
          duration_ms?: number | null;
          processed?: boolean;
          created_at?: string;
        };
      };
      speaker_segments: {
        Row: {
          id: string;
          session_id: string;
          speaker: string;
          text: string;
          start_time_ms: number;
          end_time_ms: number;
          confidence: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          speaker: string;
          text: string;
          start_time_ms: number;
          end_time_ms: number;
          confidence?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          speaker?: string;
          text?: string;
          start_time_ms?: number;
          end_time_ms?: number;
          confidence?: number | null;
          created_at?: string;
        };
      };
      session_analyses: {
        Row: {
          id: string;
          session_id: string;
          chunk_index: number;
          indicator_type: string;
          score: number;
          value: number;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          chunk_index: number;
          indicator_type: string;
          score: number;
          value: number;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          chunk_index?: number;
          indicator_type?: string;
          score?: number;
          value?: number;
          details?: Json | null;
          created_at?: string;
        };
      };
      success_cases: {
        Row: {
          id: string;
          salon_id: string | null;
          concern_keywords: string[];
          customer_profile: Json | null;
          successful_talk: string;
          key_tactics: string[] | null;
          sold_product: string | null;
          embedding: number[] | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          salon_id?: string | null;
          concern_keywords: string[];
          customer_profile?: Json | null;
          successful_talk: string;
          key_tactics?: string[] | null;
          sold_product?: string | null;
          embedding?: number[] | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          salon_id?: string | null;
          concern_keywords?: string[];
          customer_profile?: Json | null;
          successful_talk?: string;
          key_tactics?: string[] | null;
          sold_product?: string | null;
          embedding?: number[] | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      training_scenarios: {
        Row: {
          id: string;
          title: string;
          description: string;
          difficulty: string;
          customer_persona: Json;
          objectives: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          difficulty?: string;
          customer_persona: Json;
          objectives: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          difficulty?: string;
          customer_persona?: Json;
          objectives?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      roleplay_sessions: {
        Row: {
          id: string;
          staff_id: string;
          scenario_id: string | null;
          messages: Json[];
          evaluation: Json | null;
          overall_score: number | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          staff_id: string;
          scenario_id?: string | null;
          messages?: Json[];
          evaluation?: Json | null;
          overall_score?: number | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          staff_id?: string;
          scenario_id?: string | null;
          messages?: Json[];
          evaluation?: Json | null;
          overall_score?: number | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
