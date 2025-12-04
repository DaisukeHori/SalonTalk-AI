/**
 * ScoreChart Component
 * スコアチャートコンポーネント（7指標レーダーチャート風）
 */
import { View, Text } from 'react-native';

interface MetricScore {
  label: string;
  score: number;
  maxScore?: number;
}

interface ScoreChartProps {
  metrics: MetricScore[];
  overallScore: number;
}

const DEFAULT_METRICS = [
  { key: 'talkRatio', label: 'トーク比率' },
  { key: 'questionAnalysis', label: '質問分析' },
  { key: 'emotionAnalysis', label: '感情分析' },
  { key: 'concernKeywords', label: '悩みKW' },
  { key: 'proposalTiming', label: '提案タイミング' },
  { key: 'proposalQuality', label: '提案品質' },
  { key: 'conversion', label: '成約' },
];

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function MetricBar({ label, score, maxScore = 100 }: MetricScore) {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const color = getScoreColor(score);

  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-gray-600 text-sm">{label}</Text>
        <Text className="text-gray-800 font-medium text-sm">{Math.round(score)}</Text>
      </View>
      <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <View className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} />
      </View>
    </View>
  );
}

export function ScoreChart({ metrics, overallScore }: ScoreChartProps) {
  return (
    <View className="bg-white rounded-xl p-4">
      {/* Overall Score */}
      <View className="items-center mb-6">
        <Text className="text-gray-500 text-sm mb-1">総合スコア</Text>
        <View className="flex-row items-end">
          <Text className="text-5xl font-bold text-gray-900">{Math.round(overallScore)}</Text>
          <Text className="text-gray-500 text-lg mb-2 ml-1">/ 100</Text>
        </View>
      </View>

      {/* Metric Bars */}
      <View>
        {metrics.map((metric, index) => (
          <MetricBar key={index} {...metric} />
        ))}
      </View>
    </View>
  );
}

export default ScoreChart;
