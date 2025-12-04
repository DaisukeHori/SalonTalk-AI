/**
 * ActionItems Component
 * アクションアイテムコンポーネント
 */
import { View, Text } from 'react-native';
import { Card } from '../common/Card';

interface ActionItemsProps {
  improvements: string[];
  strengths: string[];
}

export function ActionItems({ improvements, strengths }: ActionItemsProps) {
  return (
    <View>
      {/* Strengths */}
      {strengths.length > 0 && (
        <Card className="mb-4">
          <View className="flex-row items-center mb-3">
            <Text className="text-xl mr-2">👍</Text>
            <Text className="text-gray-900 font-bold text-lg">Good Points</Text>
          </View>
          {strengths.map((item, index) => (
            <View key={index} className="flex-row items-start mb-2">
              <Text className="text-green-500 mr-2">✓</Text>
              <Text className="text-gray-700 flex-1">{item}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Improvements */}
      {improvements.length > 0 && (
        <Card>
          <View className="flex-row items-center mb-3">
            <Text className="text-xl mr-2">📈</Text>
            <Text className="text-gray-900 font-bold text-lg">改善ポイント</Text>
          </View>
          {improvements.map((item, index) => (
            <View key={index} className="flex-row items-start mb-2">
              <Text className="text-orange-500 mr-2">•</Text>
              <Text className="text-gray-700 flex-1">{item}</Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

export function ActionChecklist({ items }: { items: string[] }) {
  return (
    <Card>
      <View className="flex-row items-center mb-3">
        <Text className="text-xl mr-2">🎯</Text>
        <Text className="text-gray-900 font-bold text-lg">次回のアクション</Text>
      </View>
      {items.map((item, index) => (
        <View
          key={index}
          className="flex-row items-start mb-2 p-2 bg-indigo-50 rounded-lg"
        >
          <View className="w-6 h-6 rounded-full border-2 border-indigo-400 mr-3 mt-0.5" />
          <Text className="text-gray-800 flex-1">{item}</Text>
        </View>
      ))}
    </Card>
  );
}

export default ActionItems;
