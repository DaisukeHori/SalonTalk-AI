import { View, Text, ScrollView, Pressable } from 'react-native';

export default function HistoryScreen() {
  // Mock data
  const sessions = [
    { id: 1, date: '2024-12-04', time: '14:30', duration: '45分', score: 85, converted: true },
    { id: 2, date: '2024-12-04', time: '11:00', duration: '60分', score: 72, converted: false },
    { id: 3, date: '2024-12-03', time: '16:00', duration: '50分', score: 91, converted: true },
    { id: 4, date: '2024-12-03', time: '13:30', duration: '40分', score: 68, converted: false },
    { id: 5, date: '2024-12-02', time: '15:00', duration: '55分', score: 79, converted: true },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-8">
        <Text className="text-3xl font-bold text-gray-800 mb-2">セッション履歴</Text>
        <Text className="text-gray-500 mb-6">過去のセッション分析を確認できます</Text>

        {/* Stats Summary */}
        <View className="flex-row mb-6">
          <View className="flex-1 bg-white rounded-xl p-4 mr-2">
            <Text className="text-gray-500 text-sm">今週のセッション</Text>
            <Text className="text-2xl font-bold text-gray-800">12回</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4 mx-2">
            <Text className="text-gray-500 text-sm">平均スコア</Text>
            <Text className="text-2xl font-bold text-primary-600">79点</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4 ml-2">
            <Text className="text-gray-500 text-sm">成約率</Text>
            <Text className="text-2xl font-bold text-green-600">58%</Text>
          </View>
        </View>

        {/* Session List */}
        {sessions.map((session) => (
          <Pressable
            key={session.id}
            className="bg-white rounded-xl p-4 mb-3 flex-row items-center"
          >
            <View className="w-14 h-14 bg-gray-100 rounded-full items-center justify-center">
              <Text className="text-2xl">{session.converted ? '✓' : '○'}</Text>
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-gray-800 font-semibold">セッション #{session.id}</Text>
              <Text className="text-gray-500 text-sm">
                {session.date} {session.time} • {session.duration}
              </Text>
              {session.converted && (
                <View className="flex-row items-center mt-1">
                  <View className="bg-green-100 px-2 py-0.5 rounded">
                    <Text className="text-green-700 text-xs font-medium">成約</Text>
                  </View>
                </View>
              )}
            </View>
            <View className="items-end">
              <Text
                className={`text-3xl font-bold ${
                  session.score >= 80
                    ? 'text-green-600'
                    : session.score >= 60
                    ? 'text-primary-600'
                    : 'text-orange-500'
                }`}
              >
                {session.score}
              </Text>
              <Text className="text-gray-400 text-sm">点</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
