/**
 * EvaluationResult Component
 * ロールプレイ評価結果コンポーネント
 */
import { View, Text, ScrollView } from 'react-native';
import { Card } from '../common/Card';

interface EvaluationResultProps {
  overallScore: number;
  feedback: string;
  improvements: string[];
  modelAnswers?: Array<{
    situation: string;
    yourResponse: string;
    modelAnswer: string;
    reasoning: string;
  }>;
}

function getScoreRank(score: number): { rank: string; color: string; emoji: string } {
  if (score >= 90) return { rank: 'S', color: 'bg-purple-500', emoji: '🌟' };
  if (score >= 80) return { rank: 'A', color: 'bg-green-500', emoji: '⭐' };
  if (score >= 70) return { rank: 'B', color: 'bg-blue-500', emoji: '👍' };
  if (score >= 60) return { rank: 'C', color: 'bg-yellow-500', emoji: '💪' };
  return { rank: 'D', color: 'bg-red-500', emoji: '📚' };
}

export function EvaluationResult({
  overallScore,
  feedback,
  improvements,
  modelAnswers,
}: EvaluationResultProps) {
  const { rank, color, emoji } = getScoreRank(overallScore);

  return (
    <ScrollView className="flex-1">
      {/* Score Card */}
      <Card className="mb-4">
        <View className="items-center mb-4">
          <Text className="text-6xl mb-2">{emoji}</Text>
          <View className={`w-20 h-20 rounded-2xl ${color} items-center justify-center`}>
            <Text className="text-white font-bold text-3xl">{rank}</Text>
          </View>
          <Text className="text-gray-500 mt-2">スコア</Text>
          <Text className="text-4xl font-bold text-gray-900">{overallScore}点</Text>
        </View>

        {/* Feedback */}
        <View className="bg-gray-50 rounded-lg p-3">
          <Text className="text-gray-700">{feedback}</Text>
        </View>
      </Card>

      {/* Improvements */}
      {improvements.length > 0 && (
        <Card className="mb-4">
          <View className="flex-row items-center mb-3">
            <Text className="text-xl mr-2">📝</Text>
            <Text className="text-gray-900 font-bold text-lg">改善ポイント</Text>
          </View>
          {improvements.map((item, index) => (
            <View key={index} className="flex-row items-start mb-2">
              <View className="w-6 h-6 rounded-full bg-orange-100 items-center justify-center mr-2">
                <Text className="text-orange-600 text-xs font-bold">{index + 1}</Text>
              </View>
              <Text className="text-gray-700 flex-1">{item}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Model Answers */}
      {modelAnswers && modelAnswers.length > 0 && (
        <Card className="mb-4">
          <View className="flex-row items-center mb-3">
            <Text className="text-xl mr-2">💡</Text>
            <Text className="text-gray-900 font-bold text-lg">模範解答</Text>
          </View>
          {modelAnswers.map((item, index) => (
            <View key={index} className="mb-4 last:mb-0">
              {/* Situation */}
              <Text className="text-gray-500 text-sm mb-1">場面:</Text>
              <Text className="text-gray-700 mb-2">{item.situation}</Text>

              {/* Your Response */}
              <View className="bg-red-50 rounded-lg p-2 mb-2">
                <Text className="text-red-600 text-xs mb-1">あなたの回答:</Text>
                <Text className="text-red-800">{item.yourResponse}</Text>
              </View>

              {/* Model Answer */}
              <View className="bg-green-50 rounded-lg p-2 mb-2">
                <Text className="text-green-600 text-xs mb-1">模範解答:</Text>
                <Text className="text-green-800">{item.modelAnswer}</Text>
              </View>

              {/* Reasoning */}
              <View className="bg-blue-50 rounded-lg p-2">
                <Text className="text-blue-600 text-xs mb-1">解説:</Text>
                <Text className="text-blue-800">{item.reasoning}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

export default EvaluationResult;
