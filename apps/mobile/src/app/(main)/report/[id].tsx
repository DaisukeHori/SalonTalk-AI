import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

interface MetricScore {
  score: number;
  details: string;
}

interface ReportData {
  id: string;
  sessionId: string;
  summary: string;
  overallScore: number;
  metrics: {
    talkRatio: MetricScore & { stylistRatio: number; customerRatio: number };
    questionQuality: MetricScore & { openCount: number; closedCount: number };
    emotion: MetricScore & { positiveRatio: number };
    concernKeywords: MetricScore & { keywords: string[] };
    proposalTiming: MetricScore;
    proposalQuality: MetricScore & { matchRate: number };
    conversion: MetricScore & { isConverted: boolean };
  };
  improvements: string[];
  strengths: string[];
  generatedAt: string;
}

const METRIC_LABELS: Record<string, string> = {
  talkRatio: 'トーク比率',
  questionQuality: '質問の質',
  emotion: '感情分析',
  concernKeywords: '悩みキーワード',
  proposalTiming: '提案タイミング',
  proposalQuality: '提案の質',
  conversion: '成約判定',
};

function ScoreGauge({ score, size = 'large' }: { score: number; size?: 'large' | 'small' }) {
  const color =
    score >= 80 ? 'text-green-600' : score >= 60 ? 'text-primary-600' : 'text-orange-500';
  const bgColor =
    score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-primary-100' : 'bg-orange-100';

  if (size === 'small') {
    return (
      <View className={`${bgColor} rounded-lg px-3 py-1`}>
        <Text className={`${color} font-bold`}>{score}点</Text>
      </View>
    );
  }

  return (
    <View className={`${bgColor} rounded-full w-32 h-32 items-center justify-center`}>
      <Text className={`${color} text-5xl font-bold`}>{score}</Text>
      <Text className="text-gray-500 text-sm">点</Text>
    </View>
  );
}

function MetricCard({
  label,
  score,
  details,
  children,
}: {
  label: string;
  score: number;
  details: string;
  children?: React.ReactNode;
}) {
  const barColor =
    score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-primary-500' : 'bg-orange-500';

  return (
    <View className="bg-white rounded-xl p-4 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-gray-800 font-semibold">{label}</Text>
        <ScoreGauge score={score} size="small" />
      </View>
      <View className="h-2 bg-gray-200 rounded-full mb-2">
        <View className={`h-2 ${barColor} rounded-full`} style={{ width: `${score}%` }} />
      </View>
      <Text className="text-gray-500 text-sm">{details}</Text>
      {children}
    </View>
  );
}

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch report data from API
    // Mock data for now
    setReport({
      id: id || '1',
      sessionId: 'session-1',
      summary:
        'お客様の悩みをしっかり引き出し、適切な商品提案ができました。質問の質をさらに向上させることで、より高いスコアが期待できます。',
      overallScore: 78,
      metrics: {
        talkRatio: {
          score: 85,
          stylistRatio: 42,
          customerRatio: 58,
          details: '美容師42%・お客様58%と理想的な比率です',
        },
        questionQuality: {
          score: 70,
          openCount: 6,
          closedCount: 4,
          details: 'オープン質問6回・クローズド質問4回。オープン質問をもう少し増やしましょう',
        },
        emotion: {
          score: 82,
          positiveRatio: 75,
          details: 'お客様のポジティブな反応が75%と良好です',
        },
        concernKeywords: {
          score: 90,
          keywords: ['乾燥', 'パサつき', '広がり'],
          details: '3つの悩みキーワードを検出。しっかりヒアリングできています',
        },
        proposalTiming: {
          score: 75,
          details: '悩み検出から4分後に提案。もう少し早めの提案を心がけましょう',
        },
        proposalQuality: {
          score: 80,
          matchRate: 85,
          details: '悩みに対応した商品提案ができています',
        },
        conversion: {
          score: 0,
          isConverted: false,
          details: '今回は成約に至りませんでした',
        },
      },
      improvements: [
        'オープン質問（「どのように〜」「何が〜」など）を増やしましょう',
        '悩みを検出したら2-3分以内に提案するとより効果的です',
        '価格への異議に対する切り返しを準備しておきましょう',
      ],
      strengths: [
        'トーク比率が理想的で、お客様の話をしっかり聞けています',
        '複数の悩みキーワードを引き出せています',
        'お客様からポジティブな反応を得られています',
      ],
      generatedAt: new Date().toISOString(),
    });
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">読み込み中...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">レポートが見つかりません</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header with Score */}
      <View className="bg-primary-600 px-8 py-6 items-center">
        <Text className="text-white/80 mb-2">総合スコア</Text>
        <ScoreGauge score={report.overallScore} />
        <Text className="text-white mt-4 text-center px-4">{report.summary}</Text>
      </View>

      <View className="p-6">
        {/* Strengths */}
        <View className="bg-green-50 rounded-xl p-4 mb-6">
          <Text className="text-green-800 font-bold text-lg mb-3">💪 良かった点</Text>
          {report.strengths.map((strength, index) => (
            <View key={index} className="flex-row mb-2">
              <Text className="text-green-600 mr-2">✓</Text>
              <Text className="text-green-800 flex-1">{strength}</Text>
            </View>
          ))}
        </View>

        {/* Improvements */}
        <View className="bg-orange-50 rounded-xl p-4 mb-6">
          <Text className="text-orange-800 font-bold text-lg mb-3">📝 改善ポイント</Text>
          {report.improvements.map((improvement, index) => (
            <View key={index} className="flex-row mb-2">
              <Text className="text-orange-600 mr-2">•</Text>
              <Text className="text-orange-800 flex-1">{improvement}</Text>
            </View>
          ))}
        </View>

        {/* Detailed Metrics */}
        <Text className="text-xl font-bold text-gray-800 mb-4">詳細分析</Text>

        <MetricCard
          label={METRIC_LABELS.talkRatio}
          score={report.metrics.talkRatio.score}
          details={report.metrics.talkRatio.details}
        >
          <View className="flex-row mt-2">
            <View className="flex-1 mr-2">
              <View className="h-6 bg-primary-200 rounded-full overflow-hidden">
                <View
                  className="h-6 bg-primary-500 rounded-full items-center justify-center"
                  style={{ width: `${report.metrics.talkRatio.stylistRatio}%` }}
                >
                  <Text className="text-white text-xs font-bold">
                    美容師 {report.metrics.talkRatio.stylistRatio}%
                  </Text>
                </View>
              </View>
            </View>
            <View className="flex-1 ml-2">
              <View className="h-6 bg-green-200 rounded-full overflow-hidden">
                <View
                  className="h-6 bg-green-500 rounded-full items-center justify-center"
                  style={{ width: `${report.metrics.talkRatio.customerRatio}%` }}
                >
                  <Text className="text-white text-xs font-bold">
                    お客様 {report.metrics.talkRatio.customerRatio}%
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </MetricCard>

        <MetricCard
          label={METRIC_LABELS.questionQuality}
          score={report.metrics.questionQuality.score}
          details={report.metrics.questionQuality.details}
        >
          <View className="flex-row mt-2">
            <View className="bg-primary-100 rounded-lg px-3 py-1 mr-2">
              <Text className="text-primary-700 text-sm">
                オープン {report.metrics.questionQuality.openCount}回
              </Text>
            </View>
            <View className="bg-gray-100 rounded-lg px-3 py-1">
              <Text className="text-gray-700 text-sm">
                クローズド {report.metrics.questionQuality.closedCount}回
              </Text>
            </View>
          </View>
        </MetricCard>

        <MetricCard
          label={METRIC_LABELS.emotion}
          score={report.metrics.emotion.score}
          details={report.metrics.emotion.details}
        />

        <MetricCard
          label={METRIC_LABELS.concernKeywords}
          score={report.metrics.concernKeywords.score}
          details={report.metrics.concernKeywords.details}
        >
          <View className="flex-row flex-wrap mt-2">
            {report.metrics.concernKeywords.keywords.map((keyword, index) => (
              <View key={index} className="bg-red-100 rounded-full px-3 py-1 mr-2 mb-1">
                <Text className="text-red-700 text-sm">{keyword}</Text>
              </View>
            ))}
          </View>
        </MetricCard>

        <MetricCard
          label={METRIC_LABELS.proposalTiming}
          score={report.metrics.proposalTiming.score}
          details={report.metrics.proposalTiming.details}
        />

        <MetricCard
          label={METRIC_LABELS.proposalQuality}
          score={report.metrics.proposalQuality.score}
          details={report.metrics.proposalQuality.details}
        />

        <MetricCard
          label={METRIC_LABELS.conversion}
          score={report.metrics.conversion.score}
          details={report.metrics.conversion.details}
        >
          <View
            className={`mt-2 px-3 py-1 rounded-full self-start ${
              report.metrics.conversion.isConverted ? 'bg-green-100' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                report.metrics.conversion.isConverted ? 'text-green-700' : 'text-gray-600'
              }`}
            >
              {report.metrics.conversion.isConverted ? '✓ 成約' : '未成約'}
            </Text>
          </View>
        </MetricCard>

        {/* Action Buttons */}
        <View className="mt-6 mb-8">
          <Pressable
            onPress={() => router.push('/(main)/training')}
            className="bg-primary-600 rounded-xl p-4 mb-3"
          >
            <Text className="text-white text-center font-bold text-lg">
              🎯 トレーニングで練習する
            </Text>
          </Pressable>
          <Pressable onPress={() => router.back()} className="bg-gray-200 rounded-xl p-4">
            <Text className="text-gray-700 text-center font-bold">戻る</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
