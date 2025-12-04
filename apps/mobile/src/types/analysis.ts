/**
 * Analysis Types
 * 分析関連の型定義
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
  sessionId: string;
  chunkIndex: number;
  indicatorType: IndicatorType;
  score: number;
  value: number;
  details: Record<string, unknown>;
  createdAt: string;
}

/**
 * リアルタイム分析結果
 */
export interface RealtimeAnalysis {
  sessionId: string;
  chunkIndex: number;
  overallScore: number;
  metrics: {
    talkRatio: number;
    questionQuality: number;
    emotion: number;
  };
  timestamp: string;
}

/**
 * 提案タイミング通知
 */
export interface ProposalTimingNotification {
  sessionId: string;
  concernDetected: string;
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
  approachText: string;
  concernKeywords: string[];
}

/**
 * 成功事例提案
 */
export interface SuccessCaseSuggestion {
  sessionId: string;
  concernKeywords: string[];
  successCase: SuccessCaseMatch;
  timestamp: string;
}

/**
 * セッションレポート
 */
export interface SessionReport {
  id: string;
  sessionId: string;
  overallScore: number;
  transcriptSummary: string;
  indicatorScores: Record<string, unknown>;
  goodPoints: string[];
  improvementPoints: string[];
  actionItems: string[];
  aiFeedback: string;
  createdAt: string;
}

/**
 * レポート詳細
 */
export interface ReportDetail {
  id: string;
  sessionId: string;
  stylist: {
    id: string;
    name: string;
  };
  startedAt: string;
  endedAt: string;
  duration: number;
  status: string;
  customerInfo: Record<string, unknown>;
  summary: string;
  overallScore: number;
  metrics: Record<string, unknown>;
  improvements: string[];
  strengths: string[];
  actionItems: string[];
  aiFeedback: string;
  generatedAt: string;
}

/**
 * 週次統計
 */
export interface WeeklyStats {
  weeklyCount: number;
  avgScore: number;
  conversionRate: number;
}

/**
 * 分析サマリー
 */
export interface AnalysisSummary {
  totalSessions: number;
  averageScore: number;
  conversionRate: number;
  topStrengths: string[];
  areasToImprove: string[];
  recentTrend: 'improving' | 'stable' | 'declining';
}
