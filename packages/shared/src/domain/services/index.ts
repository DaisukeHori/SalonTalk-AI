/**
 * Domain Services
 * ドメインサービス定義
 */

import type { AnalysisMetrics, TalkRatio, QuestionAnalysis, EmotionAnalysis } from '../valueObjects';

/**
 * トーク比率計算サービス
 */
export function calculateTalkRatio(
  stylistDurationMs: number,
  customerDurationMs: number
): TalkRatio {
  const totalDurationMs = stylistDurationMs + customerDurationMs;

  if (totalDurationMs === 0) {
    return {
      stylistRatio: 0,
      customerRatio: 0,
      score: 0,
      totalDurationMs: 0,
      stylistDurationMs: 0,
      customerDurationMs: 0,
    };
  }

  const stylistRatio = Math.round((stylistDurationMs / totalDurationMs) * 100);
  const customerRatio = 100 - stylistRatio;

  // 理想は 40:60 (美容師:お客様)
  // 40からの乖離度でスコア計算
  const idealStylistRatio = 40;
  const deviation = Math.abs(stylistRatio - idealStylistRatio);
  const score = Math.max(0, 100 - deviation * 2.5);

  return {
    stylistRatio,
    customerRatio,
    score: Math.round(score),
    totalDurationMs,
    stylistDurationMs,
    customerDurationMs,
  };
}

/**
 * 質問の質スコア計算
 * オープン質問が60%以上で高得点
 */
export function calculateQuestionScore(openCount: number, closedCount: number): number {
  const total = openCount + closedCount;
  if (total === 0) return 50; // 質問がない場合は中間点

  const openRatio = (openCount / total) * 100;
  const idealRatio = 60;

  if (openRatio >= idealRatio) {
    return Math.min(100, 80 + ((openRatio - idealRatio) / 40) * 20);
  } else {
    return Math.max(0, (openRatio / idealRatio) * 80);
  }
}

/**
 * 感情スコア計算
 * ポジティブ70%以上で高得点
 */
export function calculateEmotionScore(
  positiveRatio: number,
  neutralRatio: number,
  negativeRatio: number
): number {
  const idealPositive = 70;

  if (positiveRatio >= idealPositive) {
    return Math.min(100, 80 + ((positiveRatio - idealPositive) / 30) * 20);
  } else {
    // ネガティブが多いとペナルティ
    const negativePenalty = negativeRatio * 0.5;
    return Math.max(0, (positiveRatio / idealPositive) * 80 - negativePenalty);
  }
}

/**
 * 悩みキーワードスコア計算
 * 2個以上で高得点
 */
export function calculateConcernScore(keywordCount: number): number {
  if (keywordCount === 0) return 20;
  if (keywordCount === 1) return 60;
  if (keywordCount === 2) return 85;
  return Math.min(100, 85 + keywordCount * 5);
}

/**
 * 提案タイミングスコア計算
 * 悩み検出から3分以内が理想
 */
export function calculateProposalTimingScore(timingMs: number | undefined): number {
  if (timingMs === undefined) return 50; // 提案なしの場合は中間点

  const threeMinutesMs = 3 * 60 * 1000;
  const fiveMinutesMs = 5 * 60 * 1000;

  if (timingMs <= threeMinutesMs) {
    return 100;
  } else if (timingMs <= fiveMinutesMs) {
    // 3-5分は線形に減少
    return Math.round(100 - ((timingMs - threeMinutesMs) / (fiveMinutesMs - threeMinutesMs)) * 40);
  } else {
    // 5分以上はさらに減点
    return Math.max(0, 60 - ((timingMs - fiveMinutesMs) / 60000) * 10);
  }
}

/**
 * 分析結果のサマリー生成
 */
export function generateAnalysisSummary(metrics: AnalysisMetrics, overallScore: number): string {
  const summaryParts: string[] = [];

  // 総合評価
  if (overallScore >= 80) {
    summaryParts.push('素晴らしい接客でした！');
  } else if (overallScore >= 60) {
    summaryParts.push('良い接客ができています。');
  } else if (overallScore >= 40) {
    summaryParts.push('改善点がいくつかあります。');
  } else {
    summaryParts.push('基本的なスキルの向上が必要です。');
  }

  // トーク比率
  if (metrics.talkRatio.stylistRatio > 50) {
    summaryParts.push('お客様の話をもっと聞きましょう。');
  }

  // 質問の質
  if (metrics.questionQuality.openRatio < 50) {
    summaryParts.push('オープン質問を増やすと良いでしょう。');
  }

  // 悩みキーワード
  if (metrics.concernKeywords.count === 0) {
    summaryParts.push('お客様の悩みをもっと引き出しましょう。');
  }

  // 提案タイミング
  if (!metrics.proposalTiming.isOptimal && metrics.proposalTiming.timingMs !== undefined) {
    summaryParts.push('提案のタイミングを早めることを意識しましょう。');
  }

  return summaryParts.join(' ');
}

/**
 * 改善提案の生成
 */
export function generateImprovements(metrics: AnalysisMetrics): string[] {
  const improvements: string[] = [];

  // トーク比率
  if (metrics.talkRatio.score < 70) {
    if (metrics.talkRatio.stylistRatio > 50) {
      improvements.push(
        'お客様が話す時間を増やしましょう。理想的なトーク比率は美容師40%:お客様60%です。'
      );
    } else {
      improvements.push(
        'もう少しお客様との会話を増やしましょう。沈黙が多いと不安を感じさせることがあります。'
      );
    }
  }

  // 質問の質
  if (metrics.questionQuality.score < 70) {
    improvements.push(
      '「どのような」「なぜ」で始まるオープン質問を意識してみましょう。お客様の本当のニーズが見えてきます。'
    );
  }

  // 感情分析
  if (metrics.emotion.score < 70) {
    improvements.push(
      'ポジティブな言葉かけを意識しましょう。「素敵ですね」「お似合いです」などの声かけが効果的です。'
    );
  }

  // 悩みキーワード
  if (metrics.concernKeywords.score < 70) {
    improvements.push(
      'お客様の髪の悩みをもっと引き出しましょう。「普段のお手入れで困っていることはありますか？」などが有効です。'
    );
  }

  // 提案タイミング
  if (metrics.proposalTiming.score < 70) {
    improvements.push(
      '悩みを聞いたら早めに提案することを意識しましょう。理想は3分以内です。'
    );
  }

  // 提案の質
  if (metrics.proposalQuality.score < 70) {
    improvements.push(
      'お客様の悩みに合った商品を提案しましょう。悩みと商品の効果を結びつけて説明すると効果的です。'
    );
  }

  return improvements;
}

/**
 * 強みの抽出
 */
export function generateStrengths(metrics: AnalysisMetrics): string[] {
  const strengths: string[] = [];

  if (metrics.talkRatio.score >= 80) {
    strengths.push('お客様とのバランスの良い会話ができています。');
  }

  if (metrics.questionQuality.score >= 80) {
    strengths.push('効果的な質問でお客様のニーズを引き出せています。');
  }

  if (metrics.emotion.score >= 80) {
    strengths.push('ポジティブな雰囲気作りができています。');
  }

  if (metrics.concernKeywords.score >= 80) {
    strengths.push('お客様の悩みをしっかり把握できています。');
  }

  if (metrics.proposalTiming.score >= 80) {
    strengths.push('適切なタイミングで提案ができています。');
  }

  if (metrics.proposalQuality.score >= 80) {
    strengths.push('お客様の悩みに合った提案ができています。');
  }

  if (metrics.conversion.isConverted) {
    strengths.push('成約につなげることができました！');
  }

  return strengths;
}

// ===========================================
// Transcript Domain Services
// ===========================================

export interface TranscriptSegment {
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  confidence: number;
  speakerLabel?: string;
}

export interface SpeakerDiarizationSegment {
  speakerLabel: string;
  startTimeMs: number;
  endTimeMs: number;
  confidence: number;
}

export interface MergedSegment {
  speaker: 'stylist' | 'customer' | 'unknown';
  speakerLabel: string;
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  confidence: number;
}

/**
 * トランスクリプトと話者分離結果をマージ
 */
export function mergeTranscriptsWithDiarization(
  transcripts: TranscriptSegment[],
  speakers: SpeakerDiarizationSegment[],
  speakerMapping?: Record<string, 'stylist' | 'customer'>
): MergedSegment[] {
  const merged: MergedSegment[] = [];

  // デフォルトのスピーカーマッピング（SPEAKER_00 = 美容師、SPEAKER_01 = お客様）
  const mapping = speakerMapping || {
    SPEAKER_00: 'stylist' as const,
    SPEAKER_01: 'customer' as const,
  };

  for (const transcript of transcripts) {
    // 時間範囲がオーバーラップする話者セグメントを検索
    const overlappingSpeaker = speakers.find((s) => {
      const overlapStart = Math.max(s.startTimeMs, transcript.startTimeMs);
      const overlapEnd = Math.min(s.endTimeMs, transcript.endTimeMs);
      return overlapEnd > overlapStart; // オーバーラップがある
    });

    let speaker: 'stylist' | 'customer' | 'unknown' = 'unknown';
    let speakerLabel = '';

    if (overlappingSpeaker) {
      speakerLabel = overlappingSpeaker.speakerLabel;
      speaker = mapping[speakerLabel] || 'unknown';
    }

    merged.push({
      speaker,
      speakerLabel,
      text: transcript.text,
      startTimeMs: transcript.startTimeMs,
      endTimeMs: transcript.endTimeMs,
      confidence: transcript.confidence,
    });
  }

  // 開始時間でソート
  merged.sort((a, b) => a.startTimeMs - b.startTimeMs);

  return merged;
}

/**
 * 連続する同じ話者のセグメントを結合
 */
export function consolidateSegments(segments: MergedSegment[]): MergedSegment[] {
  if (segments.length === 0) return [];

  const consolidated: MergedSegment[] = [];
  let current = { ...segments[0] };

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];

    // 同じ話者で、時間的に近い場合は結合
    const timeDiff = segment.startTimeMs - current.endTimeMs;
    if (segment.speaker === current.speaker && timeDiff < 2000) {
      // 結合
      current.text = current.text + ' ' + segment.text;
      current.endTimeMs = segment.endTimeMs;
      current.confidence = (current.confidence + segment.confidence) / 2;
    } else {
      consolidated.push(current);
      current = { ...segment };
    }
  }
  consolidated.push(current);

  return consolidated;
}

// ===========================================
// Speaker Segment Domain Services
// ===========================================

/**
 * 話者ラベルから役割を推測
 * 最初に話し始めた話者を美容師と仮定
 */
export function inferSpeakerRoles(
  segments: SpeakerDiarizationSegment[]
): Record<string, 'stylist' | 'customer'> {
  if (segments.length === 0) return {};

  // 最初のセグメントの話者を取得
  const sortedSegments = [...segments].sort((a, b) => a.startTimeMs - b.startTimeMs);
  const firstSpeaker = sortedSegments[0].speakerLabel;

  // ユニークな話者を取得
  const uniqueSpeakers = [...new Set(segments.map((s) => s.speakerLabel))];

  const mapping: Record<string, 'stylist' | 'customer'> = {};
  for (const speaker of uniqueSpeakers) {
    mapping[speaker] = speaker === firstSpeaker ? 'stylist' : 'customer';
  }

  return mapping;
}

/**
 * 話者ごとの発話時間を計算
 */
export function calculateSpeakerDurations(
  segments: MergedSegment[]
): { stylist: number; customer: number; unknown: number } {
  const durations = { stylist: 0, customer: 0, unknown: 0 };

  for (const segment of segments) {
    const duration = segment.endTimeMs - segment.startTimeMs;
    durations[segment.speaker] += duration;
  }

  return durations;
}

// ===========================================
// Session Analysis Domain Services
// ===========================================

/**
 * 7指標の重み付き総合スコアを計算
 */
export function calculateWeightedOverallScore(scores: {
  talkRatio: number;
  questionQuality: number;
  emotion: number;
  concernKeywords: number;
  proposalTiming: number;
  proposalQuality: number;
  conversion: number;
}): number {
  const weights = {
    talkRatio: 0.15,
    questionQuality: 0.15,
    emotion: 0.15,
    concernKeywords: 0.10,
    proposalTiming: 0.15,
    proposalQuality: 0.15,
    conversion: 0.15,
  };

  const weightedSum =
    scores.talkRatio * weights.talkRatio +
    scores.questionQuality * weights.questionQuality +
    scores.emotion * weights.emotion +
    scores.concernKeywords * weights.concernKeywords +
    scores.proposalTiming * weights.proposalTiming +
    scores.proposalQuality * weights.proposalQuality +
    scores.conversion * weights.conversion;

  return Math.round(weightedSum);
}

// ===========================================
// Keyword Dictionaries (設計書6.1準拠)
// ===========================================

/**
 * 質問検出パターン
 */
export const QUESTION_PATTERNS = [
  /[？?]$/,                    // 文末に疑問符
  /でしょうか[。]?$/,          // 〜でしょうか
  /ですか[。]?$/,              // 〜ですか
  /ますか[。]?$/,              // 〜ますか
  /ませんか[。]?$/,            // 〜ませんか
  /かな[。]?$/,                // 〜かな
  /かしら[。]?$/,              // 〜かしら
  /の[。]?$/,                  // 〜の？（上昇イントネーション想定）
] as const;

/**
 * オープンクエスチョンパターン
 * What, Why, How系の質問
 */
export const OPEN_QUESTION_PATTERNS = [
  /^(どう|どのよう|どんな)/,    // どう〜、どのような〜
  /^何(が|を|に)/,              // 何が〜
  /^なぜ/,                      // なぜ〜
  /^どこ/,                      // どこ〜
  /^いつ/,                      // いつ〜
  /について/,                   // 〜について
  /どう思/,                     // どう思いますか
  /感じ/,                       // どう感じますか
  /ご希望/,                     // ご希望は
  /お悩み/,                     // お悩みは
  /理由/,                       // 理由は
] as const;

/**
 * ポジティブキーワード辞書
 */
export const POSITIVE_KEYWORDS = [
  // 喜び・満足
  '嬉しい', 'うれしい', '楽しい', 'たのしい', '素敵', 'すてき',
  '良い', 'いい', '最高', 'さいこう', '完璧', 'かんぺき',
  'ありがとう', '感謝', 'かんしゃ', '助かる', 'たすかる',
  // 期待・興味
  '楽しみ', 'たのしみ', '気になる', 'きになる', '興味', 'きょうみ',
  'やってみたい', '試したい', 'ためしたい',
  // 肯定
  'そうですね', 'いいですね', '確かに', 'たしかに',
  'なるほど', 'わかります', 'おっしゃる通り',
  // 美容関連ポジティブ
  'サラサラ', 'さらさら', 'ツヤツヤ', 'つやつや', 'まとまる',
  '似合う', 'にあう', 'きれい', 'キレイ', '綺麗',
] as const;

/**
 * ネガティブキーワード辞書
 */
export const NEGATIVE_KEYWORDS = [
  // 不満・困り
  '困る', 'こまる', '嫌', 'いや', 'イヤ', '辛い', 'つらい',
  'ダメ', 'だめ', '駄目', '無理', 'むり',
  // 悩み関連
  '悩み', 'なやみ', '心配', 'しんぱい', '不安', 'ふあん',
  'ストレス', 'すとれす',
  // 髪の悩み
  'パサパサ', 'ぱさぱさ', 'ボサボサ', 'ぼさぼさ',
  'うねる', 'ひろがる', '広がる', 'まとまらない',
  // 否定
  'でも', 'ただ', 'ちょっと', '少し', 'すこし',
] as const;

/**
 * 悩みキーワードを検出（設計書6.1.4準拠の完全版）
 */
export const CONCERN_KEYWORDS = [
  // 乾燥系
  '乾燥', 'かんそう', 'パサパサ', 'ぱさぱさ', 'パサつき', 'ぱさつき',
  '潤いがない', 'うるおいがない', 'カサカサ', 'かさかさ',
  // 広がり系
  '広がる', 'ひろがる', '広がり', 'ひろがり', 'まとまらない',
  'ボワッと', 'ぼわっと', '爆発', 'ばくはつ',
  // ダメージ系
  'ダメージ', 'だめーじ', '傷んでる', 'いたんでる', '傷み', 'いたみ',
  '枝毛', 'えだげ', '切れ毛', 'きれげ', 'チリチリ', 'ちりちり',
  // うねり系
  'うねり', 'ウネリ', 'くせ毛', 'クセ毛', 'くせげ',
  'ハネる', 'はねる', 'ハネ', 'はね',
  // 薄毛系
  '薄毛', 'うすげ', 'ボリュームがない', 'ぺたんこ', 'ペタンコ',
  '抜け毛', 'ぬけげ', '細い', 'ほそい', 'コシがない',
  // 白髪系
  '白髪', 'しらが', 'グレイヘア', 'ぐれいへあ',
  // 頭皮系
  '頭皮', 'とうひ', 'かゆい', 'カユイ', 'フケ', 'ふけ',
  'べたつき', 'ベタつき', '臭い', 'におい',
  // その他
  '色落ち', 'いろおち', '退色', 'たいしょく',
  'パーマがとれる', 'カールが弱い',
  // ツヤ系
  'ツヤ', '艶', 'つや', 'パサ',
  // まとまり系
  'まとまり', '硬い', 'かたい', '柔らかすぎ',
  // 痛み系
  '痛み',
] as const;

/**
 * テキストから悩みキーワードを抽出
 */
export function extractConcernKeywords(text: string): string[] {
  const found: string[] = [];
  const normalizedText = text.toLowerCase();

  for (const keyword of CONCERN_KEYWORDS) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      found.push(keyword);
    }
  }

  // 重複を除去
  return [...new Set(found)];
}

/**
 * 質問かどうか判定（設計書6.1.2準拠）
 */
export function isQuestion(text: string): boolean {
  return QUESTION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * オープン質問を検出（設計書6.1.2準拠）
 */
export function isOpenQuestion(text: string): boolean {
  return OPEN_QUESTION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * 質問分析スコア計算（設計書6.1.2準拠）
 * 理想: 質問8-12回、オープンクエスチョン60%以上
 */
export function calculateQuestionAnalysisScore(
  totalQuestions: number,
  openRatio: number
): number {
  // 理想範囲: 8-12回 & オープン60%以上
  if (totalQuestions >= 8 && totalQuestions <= 12 && openRatio >= 60) {
    return 100;
  }
  // 良好範囲: 6-14回 & オープン50%以上
  if (totalQuestions >= 6 && totalQuestions <= 14 && openRatio >= 50) {
    return 80;
  }
  // 許容範囲: 4-16回 & オープン40%以上
  if (totalQuestions >= 4 && totalQuestions <= 16 && openRatio >= 40) {
    return 60;
  }
  // それ以外
  return 40;
}

// ===========================================
// Emotion Analysis (設計書6.1.3準拠)
// ===========================================

export interface EmotionAnalysisResult {
  score: number;
  value: number;
  details: {
    positiveRatio: number;
    keywords: string[];
    overall: 'positive' | 'neutral' | 'negative';
    timeline: Array<{
      time: number;
      sentiment: 'positive' | 'neutral' | 'negative';
      score: number;
    }>;
  };
}

export interface ConversationTurn {
  speaker: 'stylist' | 'customer' | 'unknown';
  text: string;
  startTime: number;
  endTime: number;
}

/**
 * ローカル感情分析（キーワードベース）
 */
export function analyzeEmotionLocal(
  utterances: ConversationTurn[]
): EmotionAnalysisResult {
  const timeline: EmotionAnalysisResult['details']['timeline'] = [];
  const detectedKeywords: string[] = [];
  let positiveCount = 0;
  let negativeCount = 0;

  for (const utterance of utterances) {
    const text = utterance.text;
    let utterancePositive = 0;
    let utteranceNegative = 0;

    // ポジティブキーワード検出
    for (const keyword of POSITIVE_KEYWORDS) {
      if (text.includes(keyword)) {
        utterancePositive++;
        if (!detectedKeywords.includes(keyword)) {
          detectedKeywords.push(keyword);
        }
      }
    }

    // ネガティブキーワード検出
    for (const keyword of NEGATIVE_KEYWORDS) {
      if (text.includes(keyword)) {
        utteranceNegative++;
        if (!detectedKeywords.includes(keyword)) {
          detectedKeywords.push(keyword);
        }
      }
    }

    positiveCount += utterancePositive;
    negativeCount += utteranceNegative;

    // 発話単位の感情判定
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let sentimentScore = 50;

    if (utterancePositive > utteranceNegative) {
      sentiment = 'positive';
      sentimentScore = 70 + Math.min(utterancePositive * 5, 30);
    } else if (utteranceNegative > utterancePositive) {
      sentiment = 'negative';
      sentimentScore = 30 - Math.min(utteranceNegative * 5, 30);
    }

    timeline.push({
      time: utterance.startTime,
      sentiment,
      score: sentimentScore,
    });
  }

  // 全体の感情比率計算
  const totalKeywords = positiveCount + negativeCount;
  const positiveRatio = totalKeywords > 0
    ? (positiveCount / totalKeywords) * 100
    : 50;

  // 全体判定
  let overall: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (positiveRatio >= 60) overall = 'positive';
  else if (positiveRatio <= 40) overall = 'negative';

  // スコア計算
  const score = calculateEmotionScoreFromRatio(positiveRatio);

  return {
    score,
    value: Math.round(positiveRatio * 100) / 100,
    details: {
      positiveRatio: Math.round(positiveRatio * 100) / 100,
      keywords: detectedKeywords,
      overall,
      timeline,
    },
  };
}

/**
 * ポジティブ比率からスコアを計算
 */
function calculateEmotionScoreFromRatio(positiveRatio: number): number {
  if (positiveRatio >= 70) return 100;
  if (positiveRatio >= 60) return 80 + ((positiveRatio - 60) / 10) * 20;
  if (positiveRatio >= 50) return 60 + ((positiveRatio - 50) / 10) * 20;
  return Math.max(20, positiveRatio);
}

// ===========================================
// Concern Keywords Analysis (設計書6.1.4準拠)
// ===========================================

export interface ConcernKeywordsResult {
  score: number;
  value: number;
  details: {
    detected: boolean;
    detectedKeywords: string[];
    detectedAt: number[];
    context: string;
    keywordOccurrences: Array<{
      keyword: string;
      time: number;
      context: string;
    }>;
  };
}

/**
 * 悩みキーワード検出（設計書6.1.4準拠）
 */
export function detectConcernKeywords(
  conversationData: ConversationTurn[],
  customKeywords?: readonly string[]
): ConcernKeywordsResult {
  const keywords = customKeywords && customKeywords.length > 0
    ? customKeywords
    : CONCERN_KEYWORDS;

  const customerUtterances = conversationData.filter(
    (turn) => turn.speaker === 'customer'
  );

  const detectedKeywords: string[] = [];
  const detectedAt: number[] = [];
  const keywordOccurrences: ConcernKeywordsResult['details']['keywordOccurrences'] = [];
  let contextText = '';

  for (const utterance of customerUtterances) {
    const text = utterance.text;

    for (const keyword of keywords) {
      if (text.includes(keyword) && !detectedKeywords.includes(keyword)) {
        detectedKeywords.push(keyword);
        detectedAt.push(utterance.startTime);

        // コンテキスト抽出（キーワード前後20文字）
        const keywordIndex = text.indexOf(keyword);
        const start = Math.max(0, keywordIndex - 20);
        const end = Math.min(text.length, keywordIndex + keyword.length + 20);
        const context = text.substring(start, end);

        keywordOccurrences.push({
          keyword,
          time: utterance.startTime,
          context: `...${context}...`,
        });

        // 初回検出時のコンテキスト保存
        if (!contextText && utterance.text.length > 0) {
          contextText = utterance.text;
        }
      }
    }
  }

  const detected = detectedKeywords.length > 0;

  return {
    score: detected ? 100 : 50,
    value: detected ? 1 : 0,
    details: {
      detected,
      detectedKeywords,
      detectedAt,
      context: contextText.substring(0, 200),
      keywordOccurrences,
    },
  };
}

/**
 * 悩みキーワードのカテゴリ分類
 */
export type ConcernCategory = '乾燥' | '広がり' | 'ダメージ' | 'うねり' | '薄毛' | '白髪' | '頭皮' | 'その他';

export function categorizeConcerns(
  keywords: string[]
): Record<ConcernCategory, string[]> {
  const categories: Record<ConcernCategory, string[]> = {
    '乾燥': [],
    '広がり': [],
    'ダメージ': [],
    'うねり': [],
    '薄毛': [],
    '白髪': [],
    '頭皮': [],
    'その他': [],
  };

  const categoryMapping: Record<string, ConcernCategory> = {
    '乾燥': '乾燥',
    'かんそう': '乾燥',
    'パサパサ': '乾燥',
    'ぱさぱさ': '乾燥',
    'パサつき': '乾燥',
    'ぱさつき': '乾燥',
    '潤いがない': '乾燥',
    'カサカサ': '乾燥',
    '広がる': '広がり',
    'ひろがる': '広がり',
    '広がり': '広がり',
    'ひろがり': '広がり',
    'まとまらない': '広がり',
    'ボワッと': '広がり',
    'ダメージ': 'ダメージ',
    'だめーじ': 'ダメージ',
    '傷んでる': 'ダメージ',
    'いたんでる': 'ダメージ',
    '傷み': 'ダメージ',
    'いたみ': 'ダメージ',
    '枝毛': 'ダメージ',
    '切れ毛': 'ダメージ',
    'チリチリ': 'ダメージ',
    'うねり': 'うねり',
    'ウネリ': 'うねり',
    'くせ毛': 'うねり',
    'クセ毛': 'うねり',
    'くせげ': 'うねり',
    'ハネる': 'うねり',
    'はねる': 'うねり',
    '薄毛': '薄毛',
    'うすげ': '薄毛',
    'ボリュームがない': '薄毛',
    'ぺたんこ': '薄毛',
    'ペタンコ': '薄毛',
    '抜け毛': '薄毛',
    '細い': '薄毛',
    'コシがない': '薄毛',
    '白髪': '白髪',
    'しらが': '白髪',
    'グレイヘア': '白髪',
    '頭皮': '頭皮',
    'とうひ': '頭皮',
    'かゆい': '頭皮',
    'カユイ': '頭皮',
    'フケ': '頭皮',
    'ふけ': '頭皮',
    'べたつき': '頭皮',
    'ベタつき': '頭皮',
  };

  for (const keyword of keywords) {
    const category = categoryMapping[keyword] || 'その他';
    if (!categories[category].includes(keyword)) {
      categories[category].push(keyword);
    }
  }

  return categories;
}

/**
 * 質問分析結果
 */
export interface QuestionAnalysisResult {
  score: number;
  value: number;
  details: {
    totalQuestions: number;
    openQuestions: number;
    closedQuestions: number;
    openRatio: number;
    questionList: Array<{
      text: string;
      type: 'open' | 'closed';
      time: number;
    }>;
  };
}

/**
 * テキストから質問を抽出してカウント（MergedSegment版）
 */
export function analyzeQuestions(
  segments: MergedSegment[]
): { openCount: number; closedCount: number; questions: string[] } {
  let openCount = 0;
  let closedCount = 0;
  const questions: string[] = [];

  // 美容師のセグメントのみ分析
  const stylistSegments = segments.filter((s) => s.speaker === 'stylist');

  for (const segment of stylistSegments) {
    // 文を分割（「。」「？」「?」で区切る）
    const sentences = segment.text.split(/[。？?]/);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      // 質問かどうか判定（設計書パターン使用）
      const questionDetected = isQuestion(trimmed) ||
        trimmed.includes('?') ||
        trimmed.includes('？') ||
        trimmed.endsWith('か');

      if (questionDetected) {
        questions.push(trimmed);
        if (isOpenQuestion(trimmed)) {
          openCount++;
        } else {
          closedCount++;
        }
      }
    }
  }

  return { openCount, closedCount, questions };
}

/**
 * 質問分析（ConversationTurn版、設計書6.1.2準拠）
 */
export function analyzeQuestionsFromConversation(
  conversationData: ConversationTurn[]
): QuestionAnalysisResult {
  const stylistUtterances = conversationData.filter(
    (turn) => turn.speaker === 'stylist'
  );

  const questionList: QuestionAnalysisResult['details']['questionList'] = [];
  let totalQuestions = 0;
  let openQuestions = 0;

  for (const utterance of stylistUtterances) {
    // 質問かどうか判定
    const questionDetected = isQuestion(utterance.text);

    if (questionDetected) {
      totalQuestions++;

      // オープンクエスチョンかどうか判定
      const isOpen = isOpenQuestion(utterance.text);

      if (isOpen) {
        openQuestions++;
      }

      questionList.push({
        text: utterance.text,
        type: isOpen ? 'open' : 'closed',
        time: utterance.startTime,
      });
    }
  }

  const closedQuestions = totalQuestions - openQuestions;
  const openRatio = totalQuestions > 0
    ? (openQuestions / totalQuestions) * 100
    : 0;

  const score = calculateQuestionAnalysisScore(totalQuestions, openRatio);

  return {
    score,
    value: totalQuestions,
    details: {
      totalQuestions,
      openQuestions,
      closedQuestions,
      openRatio: Math.round(openRatio * 100) / 100,
      questionList,
    },
  };
}

// ===========================================
// Proposal Analysis (設計書6.1.5-6.1.6準拠)
// ===========================================

/**
 * 提案検出パターン
 */
export const PROPOSAL_PATTERNS = [
  /シャンプー|トリートメント|オイル|ミスト|ワックス|スプレー/,
  /おすすめ|オススメ|お勧め/,
  /使ってみ|試してみ/,
  /こちらの商品/,
  /ホームケア/,
] as const;

/**
 * ベネフィット（効果・メリット）パターン
 */
export const BENEFIT_PATTERNS = [
  // 効果・結果
  /サラサラ|さらさら/,
  /ツヤツヤ|つやつや|ツヤ|艶/,
  /まとまり|まとまる/,
  /しっとり/,
  /やわらか|柔らか/,
  /ハリ|コシ/,
  // 改善・解決
  /改善|かいぜん/,
  /解消|かいしょう/,
  /抑え|おさえ/,
  /防ぐ|ふせぐ/,
  // お客様目線
  /楽に|らくに/,
  /簡単に|かんたんに/,
  /時短/,
  /朝.*(楽|簡単)/,
  // 感情的ベネフィット
  /自信/,
  /喜/,
  /褒め/,
] as const;

/**
 * スペック（成分・機能）パターン
 */
export const SPEC_PATTERNS = [
  // 成分
  /成分/,
  /配合/,
  /オイル|エキス/,
  /ヒアルロン|コラーゲン|ケラチン/,
  /アミノ酸/,
  // 機能・仕様
  /ml|ミリリットル/,
  /プロ仕様/,
  /サロン専売/,
  /持続|もつ/,
  // 価格
  /円|¥/,
  /コスパ/,
] as const;

export interface ProposalTimingResult {
  score: number;
  value: number;
  details: {
    concernDetectedAt: number | null;
    proposalAt: number | null;
    timingMinutes: number | null;
    timingEvaluation: 'optimal' | 'good' | 'too_early' | 'late' | 'no_concern' | 'no_proposal';
  };
}

/**
 * 提案タイミング分析（設計書6.1.5準拠）
 */
export function analyzeProposalTiming(
  conversationData: ConversationTurn[],
  concernKeywords: string[]
): ProposalTimingResult {
  // 悩みキーワードが検出された最初のタイミングを取得
  let concernDetectedAt: number | null = null;

  const customerUtterances = conversationData.filter(
    (turn) => turn.speaker === 'customer'
  );

  for (const utterance of customerUtterances) {
    for (const keyword of concernKeywords) {
      if (utterance.text.includes(keyword)) {
        concernDetectedAt = utterance.startTime;
        break;
      }
    }
    if (concernDetectedAt !== null) break;
  }

  // 悩みキーワードが検出されなかった場合
  if (concernDetectedAt === null) {
    return {
      score: 50,
      value: 0,
      details: {
        concernDetectedAt: null,
        proposalAt: null,
        timingMinutes: null,
        timingEvaluation: 'no_concern',
      },
    };
  }

  // 提案タイミングを検出
  let proposalAt: number | null = null;
  const stylistUtterances = conversationData.filter(
    (turn) => turn.speaker === 'stylist' && turn.startTime > concernDetectedAt!
  );

  for (const utterance of stylistUtterances) {
    const isProposal = PROPOSAL_PATTERNS.some((pattern) =>
      pattern.test(utterance.text)
    );
    if (isProposal) {
      proposalAt = utterance.startTime;
      break;
    }
  }

  // 提案がなかった場合
  if (proposalAt === null) {
    return {
      score: 40,
      value: 0,
      details: {
        concernDetectedAt,
        proposalAt: null,
        timingMinutes: null,
        timingEvaluation: 'no_proposal',
      },
    };
  }

  // タイミング計算（分）
  const timingMinutes = (proposalAt - concernDetectedAt) / 60;
  const { score, evaluation } = evaluateProposalTiming(timingMinutes);

  return {
    score,
    value: Math.round(timingMinutes * 100) / 100,
    details: {
      concernDetectedAt,
      proposalAt,
      timingMinutes: Math.round(timingMinutes * 100) / 100,
      timingEvaluation: evaluation,
    },
  };
}

/**
 * 提案タイミング評価
 */
function evaluateProposalTiming(
  minutes: number
): { score: number; evaluation: 'optimal' | 'good' | 'too_early' | 'late' } {
  if (minutes >= 2 && minutes <= 5) {
    return { score: 100, evaluation: 'optimal' };
  }
  if ((minutes >= 1 && minutes < 2) || (minutes > 5 && minutes <= 7)) {
    return { score: 80, evaluation: 'good' };
  }
  if (minutes < 1) {
    return { score: 60, evaluation: 'too_early' };
  }
  if (minutes > 7 && minutes <= 10) {
    return { score: 60, evaluation: 'late' };
  }
  // 10分以上
  return { score: 40, evaluation: 'late' };
}

export interface ProposalQualityResult {
  score: number;
  value: number;
  details: {
    hasProposal: boolean;
    benefitRatio: number;
    proposalDetails: Array<{
      text: string;
      type: 'benefit' | 'spec' | 'mixed';
      time: number;
    }>;
    benefitExamples: string[];
    specExamples: string[];
  };
}

/**
 * 提案品質分析（設計書6.1.6準拠）
 */
export function analyzeProposalQuality(
  conversationData: ConversationTurn[]
): ProposalQualityResult {
  const stylistUtterances = conversationData.filter(
    (turn) => turn.speaker === 'stylist'
  );

  // 提案を含む発話を検出
  const proposalUtterances = stylistUtterances.filter((utterance) => {
    return PROPOSAL_PATTERNS.some((pattern) => pattern.test(utterance.text)) ||
      BENEFIT_PATTERNS.some((pattern) => pattern.test(utterance.text)) ||
      SPEC_PATTERNS.some((pattern) => pattern.test(utterance.text));
  });

  if (proposalUtterances.length === 0) {
    return {
      score: 40,
      value: 0,
      details: {
        hasProposal: false,
        benefitRatio: 0,
        proposalDetails: [],
        benefitExamples: [],
        specExamples: [],
      },
    };
  }

  const proposalDetails: ProposalQualityResult['details']['proposalDetails'] = [];
  const benefitExamples: string[] = [];
  const specExamples: string[] = [];
  let benefitCount = 0;
  let specCount = 0;

  for (const utterance of proposalUtterances) {
    const hasBenefit = BENEFIT_PATTERNS.some((p) => p.test(utterance.text));
    const hasSpec = SPEC_PATTERNS.some((p) => p.test(utterance.text));

    let type: 'benefit' | 'spec' | 'mixed' = 'spec';
    if (hasBenefit && hasSpec) {
      type = 'mixed';
      benefitCount += 0.5;
      specCount += 0.5;
    } else if (hasBenefit) {
      type = 'benefit';
      benefitCount++;
      if (benefitExamples.length < 3) {
        benefitExamples.push(utterance.text.substring(0, 50));
      }
    } else {
      specCount++;
      if (specExamples.length < 3) {
        specExamples.push(utterance.text.substring(0, 50));
      }
    }

    proposalDetails.push({
      text: utterance.text,
      type,
      time: utterance.startTime,
    });
  }

  const total = benefitCount + specCount;
  const benefitRatio = total > 0 ? (benefitCount / total) * 100 : 0;
  const score = calculateProposalQualityScore(benefitRatio);

  return {
    score,
    value: Math.round(benefitRatio * 100) / 100,
    details: {
      hasProposal: true,
      benefitRatio: Math.round(benefitRatio * 100) / 100,
      proposalDetails,
      benefitExamples,
      specExamples,
    },
  };
}

/**
 * 提案品質スコア計算
 */
function calculateProposalQualityScore(benefitRatio: number): number {
  if (benefitRatio >= 70) return 100;
  if (benefitRatio >= 50) return 80;
  if (benefitRatio >= 30) return 60;
  return 40;
}

// ===========================================
// Conversion Detection (設計書6.1.7準拠)
// ===========================================

/**
 * 成約シグナルパターン
 */
export const CONVERSION_SIGNALS = {
  // 購入意思表明（お客様）
  customerBuy: [
    /買い(ます|たい)/,
    /購入(し|したい)/,
    /もらい(ます|たい)/,
    /お願い(し|します)/,
    /それ.*(ください|下さい)/,
    /これ.*(ください|下さい)/,
    /いただ(け|き)/,
  ],
  // 決定表現（お客様）
  customerDecision: [
    /じゃあ.*それ/,
    /それに(します|しよう)/,
    /決め(まし|た)/,
  ],
  // 購入確認（スタイリスト）
  stylistConfirm: [
    /ありがとうございます.*お買い上げ/,
    /では.*こちら/,
    /お会計/,
    /レジ/,
    /包み/,
  ],
} as const;

/**
 * 商品名検出パターン
 */
export const PRODUCT_NAME_PATTERNS = [
  /([\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+)(シャンプー|トリートメント|オイル|ミスト|ワックス|スプレー)/,
  /「([^」]+)」(を|が|は)/,
] as const;

export interface ConversionResult {
  score: number;
  value: number;
  details: {
    converted: boolean;
    productName: string | null;
    conversionSignals: string[];
    detectedAt: number | null;
  };
}

/**
 * 成約判定（設計書6.1.7準拠）
 */
export function detectConversion(
  conversationData: ConversationTurn[]
): ConversionResult {
  const conversionSignals: string[] = [];
  let converted = false;
  let productName: string | null = null;
  let detectedAt: number | null = null;

  // お客様の発話から購入意思を検出
  const customerUtterances = conversationData.filter(
    (turn) => turn.speaker === 'customer'
  );

  for (const utterance of customerUtterances) {
    // 購入意思パターン
    for (const pattern of CONVERSION_SIGNALS.customerBuy) {
      if (pattern.test(utterance.text)) {
        converted = true;
        detectedAt = detectedAt || utterance.startTime;
        conversionSignals.push(`購入意思: "${utterance.text.substring(0, 30)}..."`);
        break;
      }
    }

    // 決定パターン
    for (const pattern of CONVERSION_SIGNALS.customerDecision) {
      if (pattern.test(utterance.text)) {
        converted = true;
        detectedAt = detectedAt || utterance.startTime;
        conversionSignals.push(`購入決定: "${utterance.text.substring(0, 30)}..."`);
        break;
      }
    }

    // 商品名検出
    if (productName === null) {
      for (const pattern of PRODUCT_NAME_PATTERNS) {
        const match = utterance.text.match(pattern);
        if (match) {
          productName = match[1] || match[0];
          break;
        }
      }
    }
  }

  // スタイリストの発話から購入確認を検出
  const stylistUtterances = conversationData.filter(
    (turn) => turn.speaker === 'stylist'
  );

  for (const utterance of stylistUtterances) {
    for (const pattern of CONVERSION_SIGNALS.stylistConfirm) {
      if (pattern.test(utterance.text)) {
        converted = true;
        detectedAt = detectedAt || utterance.startTime;
        conversionSignals.push(`購入確認: "${utterance.text.substring(0, 30)}..."`);
        break;
      }
    }

    // 商品名検出
    if (productName === null) {
      for (const pattern of PRODUCT_NAME_PATTERNS) {
        const match = utterance.text.match(pattern);
        if (match) {
          productName = match[1] || match[0];
          break;
        }
      }
    }
  }

  return {
    score: converted ? 100 : 0,
    value: converted ? 1 : 0,
    details: {
      converted,
      productName,
      conversionSignals,
      detectedAt,
    },
  };
}
