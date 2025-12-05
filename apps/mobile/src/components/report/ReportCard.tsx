/**
 * ReportCard Component
 * レポートカードコンポーネント
 */
import { View, Text } from 'react-native';
import { Card } from '../common/Card';

interface ReportCardProps {
  id: string;
  date: Date;
  overallScore: number;
  isConverted: boolean;
  customerInfo?: {
    ageGroup?: string;
    visitType?: 'new' | 'repeat';
  };
  durationMinutes: number;
  onPress?: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreRank(score: number): { rank: string; color: string } {
  if (score >= 90) return { rank: 'S', color: 'bg-purple-500' };
  if (score >= 80) return { rank: 'A', color: 'bg-green-500' };
  if (score >= 70) return { rank: 'B', color: 'bg-blue-500' };
  if (score >= 60) return { rank: 'C', color: 'bg-yellow-500' };
  return { rank: 'D', color: 'bg-red-500' };
}

function formatDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  return `${month}/${day} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export function ReportCard({
  date,
  overallScore,
  isConverted,
  customerInfo,
  durationMinutes,
  onPress,
}: ReportCardProps) {
  const scoreColor = getScoreColor(overallScore);
  const { rank, color: rankColor } = getScoreRank(overallScore);

  return (
    <Card onPress={onPress} className="mb-3">
      <View className="flex-row items-center">
        {/* Score Rank */}
        <View className={`w-12 h-12 rounded-xl ${rankColor} items-center justify-center mr-3`}>
          <Text className="text-white font-bold text-xl">{rank}</Text>
        </View>

        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-gray-500 text-sm">{formatDate(date)}</Text>
            <Text className={`font-bold text-lg ${scoreColor}`}>{overallScore}点</Text>
          </View>
          <View className="flex-row items-center">
            {customerInfo?.visitType && (
              <View className={`px-2 py-0.5 rounded mr-2 ${customerInfo.visitType === 'new' ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                <Text className={`text-xs ${customerInfo.visitType === 'new' ? 'text-indigo-700' : 'text-gray-600'}`}>
                  {customerInfo.visitType === 'new' ? '新規' : 'リピート'}
                </Text>
              </View>
            )}
            {customerInfo?.ageGroup && (
              <Text className="text-gray-500 text-sm mr-2">{customerInfo.ageGroup}</Text>
            )}
            <Text className="text-gray-400 text-sm">{durationMinutes}分</Text>
          </View>
        </View>

        {/* Conversion Badge */}
        <View className="ml-3 items-center">
          <Text className="text-2xl">{isConverted ? '✅' : '❌'}</Text>
          <Text className="text-gray-400 text-xs">成約</Text>
        </View>
      </View>
    </Card>
  );
}

export default ReportCard;
