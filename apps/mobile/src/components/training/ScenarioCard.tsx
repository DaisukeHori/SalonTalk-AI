/**
 * ScenarioCard Component
 * トレーニングシナリオカードコンポーネント
 */
import { View, Text } from 'react-native';
import { Card } from '../common/Card';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface ScenarioCardProps {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  customerPersona: {
    name: string;
    ageGroup: string;
    hairConcerns: string[];
  };
  onPress: () => void;
}

const difficultyStyles: Record<Difficulty, { bg: string; text: string; label: string }> = {
  beginner: { bg: 'bg-green-100', text: 'text-green-700', label: '初級' },
  intermediate: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '中級' },
  advanced: { bg: 'bg-red-100', text: 'text-red-700', label: '上級' },
};

export function ScenarioCard({
  title,
  description,
  difficulty,
  estimatedMinutes,
  customerPersona,
  onPress,
}: ScenarioCardProps) {
  const diffStyle = difficultyStyles[difficulty];

  return (
    <Card onPress={onPress} className="mb-3">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-gray-800 font-bold text-lg flex-1" numberOfLines={1}>
          {title}
        </Text>
        <View className={`${diffStyle.bg} px-2 py-1 rounded ml-2`}>
          <Text className={`${diffStyle.text} text-xs font-medium`}>{diffStyle.label}</Text>
        </View>
      </View>

      {/* Description */}
      <Text className="text-gray-500 mb-3" numberOfLines={2}>
        {description}
      </Text>

      {/* Customer Persona */}
      <View className="bg-gray-50 rounded-lg p-3 mb-3">
        <View className="flex-row items-center mb-2">
          <Text className="text-lg mr-2">💇</Text>
          <Text className="text-gray-700 font-medium">
            {customerPersona.name}（{customerPersona.ageGroup}）
          </Text>
        </View>
        <View className="flex-row flex-wrap">
          {customerPersona.hairConcerns.map((concern, index) => (
            <View key={index} className="bg-gray-200 rounded-full px-2 py-0.5 mr-2 mb-1">
              <Text className="text-gray-600 text-xs">{concern}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View className="flex-row items-center justify-between">
        <Text className="text-gray-400 text-sm">⏱ 約{estimatedMinutes}分</Text>
        <Text className="text-indigo-600 font-medium">始める →</Text>
      </View>
    </Card>
  );
}

export default ScenarioCard;
