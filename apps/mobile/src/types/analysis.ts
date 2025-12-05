/**
 * Analysis Types
 * 分析関連の型定義
 *
 * 方針: Supabase生成型と同じsnake_caseを使用
 * 詳細は docs/詳細設計書/12-付録.md を参照
 */

/**
 * 分析指標タイプ
 */
export type IndicatorType =
  | 'talk_ratio'
  | 'question_analysis'
  | 'emotion_analysis'
  | 'concern_keywords'
  | 'proposal_timing'
  | 'proposal_quality'
  | 'conversion';

/**
 * 分析結果
 */
export interface AnalysisResult {
  id: string;
  session_id: string;
  chunk_index: number;
  indicator_type: IndicatorType;
  score: number;
  value: number;
  details: Record<string, unknown>;
  created_at: string;
}

/**
 * リアルタイム分析結果
 */
export interface RealtimeAnalysis {
  session_id: string;
  chunk_index: number;
  overall_score: number;
  metrics: {
    talk_ratio: number;
    question_quality: number;
    emotion: number;
  };
  timestamp: string;
}

/**
 * 提案タイミング通知
 */
export interface ProposalTimingNotification {
  session_id: string;
  concern_detected: string;
  suggestion: string;
  urgency: 'low' | 'medium' | 'high';
  timestamp: string;
}

/**
 * 成功事例マッチ
 */
export interface SuccessCaseMatch {
  id: string;
  similarity: number;
  approach_text: string;
  concern_keywords: string[];
}

/**
 * 成功事例提案
 */
export interface SuccessCaseSuggestion {
  session_id: string;
  concern_keywords: string[];
  success_case: SuccessCaseMatch;
  timestamp: string;
}

/**
 * セッションレポート
 */
export interface SessionReport {
  id: string;
  session_id: string;
  overall_score: number;
  transcript_summary: string;
  indicator_scores: Record<string, unknown>;
  good_points: string[];
  improvement_points: string[];
  action_items: string[];
  ai_feedback: string;
  created_at: string;
}

/**
 * レポート詳細
 */
export interface ReportDetail {
  id: string;
  session_id: string;
  stylist: {
    id: string;
    name: string;
  };
  started_at: string;
  ended_at: string;
  duration: number;
  status: string;
  customer_info: Record<string, unknown>;
  summary: string;
  overall_score: number;
  metrics: Record<string, unknown>;
  improvements: string[];
  strengths: string[];
  action_items: string[];
  ai_feedback: string;
  generated_at: string;
}

/**
 * 週次統計
 */
export interface WeeklyStats {
  weekly_count: number;
  avg_score: number;
  conversion_rate: number;
}

/**
 * 分析サマリー
 */
export interface AnalysisSummary {
  total_sessions: number;
  average_score: number;
  conversion_rate: number;
  top_strengths: string[];
  areas_to_improve: string[];
  recent_trend: 'improving' | 'stable' | 'declining';
}
