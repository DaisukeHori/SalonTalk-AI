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

/**
 * 悩みキーワードを検出
 */
export const CONCERN_KEYWORDS = [
  // 乾燥・パサつき系
  '乾燥', 'パサつき', 'パサパサ', 'ぱさぱさ',
  // 広がり・うねり系
  '広がり', '広がる', 'うねり', 'くせ毛', 'クセ毛',
  // 白髪系
  '白髪', 'しらが', 'グレイヘア',
  // 薄毛・ボリューム系
  '薄毛', 'ボリューム', 'ぺたんこ', 'ペタンコ', '抜け毛',
  // ダメージ系
  'ダメージ', '痛み', '傷み', '切れ毛', '枝毛',
  // ツヤ系
  'ツヤ', '艶', 'つや', 'パサ',
  // まとまり系
  'まとまり', 'まとまらない', '硬い', 'かたい', '柔らかすぎ',
  // 頭皮系
  '頭皮', 'かゆみ', 'フケ', 'ふけ', 'べたつき', 'ベタつき',
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
 * オープン質問を検出（「何」「どう」「なぜ」「いつ」「どこ」「誰」で始まる質問）
 */
export function isOpenQuestion(text: string): boolean {
  const openPatterns = [
    /^何/, /^なに/, /^どう/, /^どの/, /^どれ/,
    /^なぜ/, /^どうして/, /^いつ/, /^どこ/, /^誰/,
    /どうですか/, /いかがですか/, /どんな/, /何か/,
  ];

  const hasQuestionMark = text.includes('?') || text.includes('？');
  const hasOpenPattern = openPatterns.some((pattern) => pattern.test(text));

  return hasQuestionMark || hasOpenPattern;
}

/**
 * テキストから質問を抽出してカウント
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

      // 質問っぽい文かどうか
      const isQuestion =
        trimmed.includes('?') ||
        trimmed.includes('？') ||
        trimmed.endsWith('か') ||
        /でしょうか|ですか|ますか/.test(trimmed);

      if (isQuestion) {
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
