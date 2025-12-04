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
