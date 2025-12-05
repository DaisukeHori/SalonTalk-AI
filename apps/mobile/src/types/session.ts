/**
 * Session Types
 * セッション関連の型定義
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
  ageGroup?: string;
  gender?: 'male' | 'female' | 'other';
  visitType: 'new' | 'repeat';
  notes?: string;
}

/**
 * セッション基本情報
 */
export interface Session {
  id: string;
  salonId: string;
  stylistId: string;
  customerInfo: CustomerInfo;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  totalDurationMs: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * セッション詳細（レポート込み）
 */
export interface SessionDetail extends Session {
  stylistName: string;
  overallScore: number;
  metrics: SessionMetrics;
  transcript: TranscriptMessage[];
  improvements: string[];
  strengths: string[];
}

/**
 * セッション分析メトリクス
 */
export interface SessionMetrics {
  talkRatio: TalkRatioMetric;
  questionQuality: QuestionQualityMetric;
  emotion: EmotionMetric;
  concernKeywords: ConcernKeywordsMetric;
  proposalTiming: BaseMetric;
  proposalQuality: ProposalQualityMetric;
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
  stylistRatio: number;
  customerRatio: number;
}

/**
 * 質問品質メトリクス
 */
export interface QuestionQualityMetric extends BaseMetric {
  openCount: number;
  closedCount: number;
}

/**
 * 感情分析メトリクス
 */
export interface EmotionMetric extends BaseMetric {
  positiveRatio: number;
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
  matchRate: number;
}

/**
 * 成約メトリクス
 */
export interface ConversionMetric extends BaseMetric {
  isConverted: boolean;
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
  stylistId: string;
  customerInfo?: Partial<CustomerInfo>;
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
  customerInfo?: {
    ageGroup?: string;
    visitType?: string;
  };
}

/**
 * リアルタイムセッション状態
 */
export interface RealtimeSessionState {
  isRecording: boolean;
  currentScore: number;
  elapsedTime: number;
  lastTranscript: string;
  metrics: {
    talkRatio: number;
    questionQuality: number;
    emotion: number;
  };
}
