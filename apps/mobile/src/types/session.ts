/**
 * Session Types
 * セッション関連の型定義
 *
 * 方針: Supabase生成型と同じsnake_caseを使用
 * 詳細は docs/詳細設計書/12-付録.md を参照
 */

/**
 * セッションステータス
 * DBスキーマ: CHECK (status IN ('recording', 'processing', 'analyzing', 'completed', 'error'))
 */
export type SessionStatus = 'recording' | 'processing' | 'analyzing' | 'completed' | 'error';

/**
 * 顧客情報
 */
export interface CustomerInfo {
  name?: string;
  age_group?: string;
  gender?: 'male' | 'female' | 'other';
  visit_type: 'new' | 'repeat';
  notes?: string;
}

/**
 * セッション基本情報
 */
export interface Session {
  id: string;
  salon_id: string;
  stylist_id: string;
  customer_info: CustomerInfo;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  total_duration_ms: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * セッション詳細（レポート込み）
 */
export interface SessionDetail extends Session {
  stylist_name: string;
  overall_score: number;
  metrics: SessionMetrics;
  transcript: TranscriptMessage[];
  improvements: string[];
  strengths: string[];
}

/**
 * セッション分析メトリクス
 */
export interface SessionMetrics {
  talk_ratio: TalkRatioMetric;
  question_quality: QuestionQualityMetric;
  emotion: EmotionMetric;
  concern_keywords: ConcernKeywordsMetric;
  proposal_timing: BaseMetric;
  proposal_quality: ProposalQualityMetric;
  conversion: ConversionMetric;
}

/**
 * 基本メトリクス
 */
export interface BaseMetric {
  score: number;
  details: string;
}

/**
 * トーク比率メトリクス
 */
export interface TalkRatioMetric extends BaseMetric {
  stylist_ratio: number;
  customer_ratio: number;
}

/**
 * 質問品質メトリクス
 */
export interface QuestionQualityMetric extends BaseMetric {
  open_count: number;
  closed_count: number;
}

/**
 * 感情分析メトリクス
 */
export interface EmotionMetric extends BaseMetric {
  positive_ratio: number;
}

/**
 * 悩みキーワードメトリクス
 */
export interface ConcernKeywordsMetric extends BaseMetric {
  keywords: string[];
}

/**
 * 提案品質メトリクス
 */
export interface ProposalQualityMetric extends BaseMetric {
  match_rate: number;
}

/**
 * 成約メトリクス
 */
export interface ConversionMetric extends BaseMetric {
  is_converted: boolean;
}

/**
 * トランスクリプトメッセージ
 * speaker: DBスキーマでは 'unknown' も許容
 */
export interface TranscriptMessage {
  speaker: 'stylist' | 'customer' | 'unknown';
  text: string;
  timestamp: number;
}

/**
 * セッション作成パラメータ
 */
export interface CreateSessionParams {
  stylist_id: string;
  customer_info?: Partial<CustomerInfo>;
}

/**
 * セッション一覧項目
 */
export interface SessionListItem {
  id: string;
  date: string;
  time: string;
  duration: string;
  score: number;
  converted: boolean;
  customer_info?: {
    age_group?: string;
    visit_type?: string;
  };
}

/**
 * リアルタイムセッション状態
 */
export interface RealtimeSessionState {
  is_recording: boolean;
  current_score: number;
  elapsed_time: number;
  last_transcript: string;
  metrics: {
    talk_ratio: number;
    question_quality: number;
    emotion: number;
  };
}
