import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

export default function HomeScreen() {
  const router = useRouter();
  const { user, salon } = useAuthStore();

  const stats = [
    { label: '今日のセッション', value: '3', unit: '回' },
    { label: '平均スコア', value: '78', unit: '点' },
    { label: '店販成約', value: '1', unit: '件' },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary-600 px-8 py-6">
        <Text className="text-white text-lg">こんにちは、</Text>
        <Text className="text-white text-3xl font-bold">{user?.name ?? 'スタイリスト'}さん</Text>
        <Text className="text-white/80 mt-1">{salon?.name}</Text>
      </View>

      {/* Quick Stats */}
      <View className="flex-row px-4 -mt-4">
        {stats.map((stat, index) => (
          <View key={index} className="flex-1 bg-white rounded-xl p-4 mx-2 shadow-sm">
            <Text className="text-gray-500 text-sm">{stat.label}</Text>
            <View className="flex-row items-end mt-1">
              <Text className="text-3xl font-bold text-gray-800">{stat.value}</Text>
              <Text className="text-gray-500 ml-1 mb-1">{stat.unit}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View className="px-6 mt-8">
        <Text className="text-xl font-bold text-gray-800 mb-4">クイックアクション</Text>
        <View className="flex-row">
          <Pressable
            onPress={() => router.push('/(main)/session')}
            className="flex-1 bg-primary-600 rounded-xl p-6 mr-2"
          >
            <Text className="text-4xl mb-2">🎙️</Text>
            <Text className="text-white text-xl font-bold">セッション開始</Text>
            <Text className="text-white/80 mt-1">新しい施術を記録</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(main)/history')}
            className="flex-1 bg-white rounded-xl p-6 ml-2 border border-gray-200"
          >
            <Text className="text-4xl mb-2">📊</Text>
            <Text className="text-gray-800 text-xl font-bold">レポート確認</Text>
            <Text className="text-gray-500 mt-1">過去の分析を見る</Text>
          </Pressable>
        </View>

        {/* Training Button */}
        <Pressable
          onPress={() => router.push('/(main)/training')}
          className="bg-green-600 rounded-xl p-6 mt-4"
        >
          <View className="flex-row items-center">
            <Text className="text-4xl mr-4">🎯</Text>
            <View className="flex-1">
              <Text className="text-white text-xl font-bold">トレーニング</Text>
              <Text className="text-white/80 mt-1">AIと接客練習をする</Text>
            </View>
            <Text className="text-white text-2xl">→</Text>
          </View>
        </Pressable>
      </View>

      {/* Recent Sessions */}
      <View className="px-6 mt-8 mb-8">
        <Text className="text-xl font-bold text-gray-800 mb-4">最近のセッション</Text>
        {[1, 2, 3].map((i) => (
          <View key={i} className="bg-white rounded-xl p-4 mb-3 flex-row items-center">
            <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center">
              <Text className="text-xl">👤</Text>
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-gray-800 font-semibold">お客様 #{i}</Text>
              <Text className="text-gray-500 text-sm">本日 14:0{i} - 45分</Text>
            </View>
            <View className="items-end">
              <Text className="text-2xl font-bold text-primary-600">8{i}</Text>
              <Text className="text-gray-500 text-sm">点</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
