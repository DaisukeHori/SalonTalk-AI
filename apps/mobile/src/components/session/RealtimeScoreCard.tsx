/**
 * RealtimeScoreCard Component
 * リアルタイムスコア表示カードコンポーネント
 */
import { View, Text } from 'react-native';
import { Card } from '../common/Card';
import { ScoreGauge } from './ScoreGauge';
import { EmotionIndicator } from './EmotionIndicator';
import { KeywordList } from './KeywordBadge';

interface TalkRatio {
  stylist: number;
  customer: number;
}

interface RealtimeScoreCardProps {
  listeningScore: number;
  questionCount: number;
  emotion: 'positive' | 'neutral' | 'negative';
  talkRatio: TalkRatio;
  detectedConcerns: string[];
}

export function RealtimeScoreCard({
  listeningScore,
  questionCount,
  emotion,
  talkRatio,
  detectedConcerns,
}: RealtimeScoreCardProps) {
  return (
    <Card className="mb-4">
      <View className="flex-row justify-between items-start mb-4">
        {/* Listening Score */}
        <View className="flex-1 mr-4">
          <Text className="text-gray-600 text-sm mb-1">傾聴スコア</Text>
          <View className="flex-row items-center">
            <Text className="text-3xl font-bold text-gray-900 mr-2">
              {Math.round(listeningScore)}
            </Text>
            <ScoreGauge score={listeningScore} showPercentage={false} size="sm" />
          </View>
        </View>

        {/* Question Count */}
        <View className="items-center mr-4">
          <Text className="text-gray-600 text-sm mb-1">質問数</Text>
          <Text className="text-3xl font-bold text-gray-900">{questionCount}</Text>
          <Text className="text-gray-500 text-xs">回</Text>
        </View>

        {/* Emotion Indicator */}
        <View className="items-center">
          <Text className="text-gray-600 text-sm mb-1">感情</Text>
          <EmotionIndicator emotion={emotion} />
        </View>
      </View>

      {/* Talk Ratio */}
      <View className="mb-4">
        <Text className="text-gray-600 text-sm mb-2">トーク比率</Text>
        <View className="flex-row items-center">
          <View className="flex-1 bg-indigo-100 rounded-l-full h-6 overflow-hidden">
            <View
              className="h-full bg-indigo-500 rounded-l-full"
              style={{ width: `${talkRatio.stylist}%` }}
            />
          </View>
          <View className="flex-1 bg-pink-100 rounded-r-full h-6 overflow-hidden">
            <View
              className="h-full bg-pink-400 rounded-r-full"
              style={{ width: `${talkRatio.customer}%`, marginLeft: 'auto' }}
            />
          </View>
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className="text-indigo-600 text-xs">
            美容師 {talkRatio.stylist}%
          </Text>
          <Text className="text-pink-600 text-xs">
            お客様 {talkRatio.customer}%
          </Text>
        </View>
      </View>

      {/* Detected Concerns */}
      {detectedConcerns.length > 0 && (
        <View>
          <Text className="text-gray-600 text-sm mb-2">検出された悩み</Text>
          <KeywordList keywords={detectedConcerns} variant="concern" />
        </View>
      )}
    </Card>
  );
}

export default RealtimeScoreCard;
