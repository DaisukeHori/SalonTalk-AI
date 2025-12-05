import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function SetupWelcomeScreen() {
  const router = useRouter();

  const handleNext = () => {
    router.push('/(setup)/profile');
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 flex-row">
        {/* Left side - Branding */}
        <View className="flex-1 bg-primary-600 items-center justify-center p-8">
          <Text className="text-white text-5xl font-bold mb-4">SalonTalk AI</Text>
          <Text className="text-white/80 text-xl text-center">
            売れるトークを科学する{'\n'}
            美容室向けAI会話分析
          </Text>
        </View>

        {/* Right side - Welcome content */}
        <View className="flex-1 items-center justify-center p-8">
          <View className="w-full max-w-lg">
            <Text className="text-6xl text-center mb-6">🎉</Text>
            <Text className="text-3xl font-bold text-gray-800 text-center mb-4">
              ようこそ！
            </Text>
            <Text className="text-gray-600 text-center text-lg mb-8">
              SalonTalk AIへの参加ありがとうございます。{'\n'}
              簡単な初期設定を行いましょう。
            </Text>

            {/* Features */}
            <View className="flex-row gap-4 mb-8">
              <View className="flex-1 bg-blue-50 rounded-lg p-4 items-center">
                <Text className="text-2xl mb-2">📊</Text>
                <Text className="text-sm text-blue-800 font-medium">リアルタイム分析</Text>
                <Text className="text-xs text-blue-600">会話をAIが分析</Text>
              </View>
              <View className="flex-1 bg-green-50 rounded-lg p-4 items-center">
                <Text className="text-2xl mb-2">📈</Text>
                <Text className="text-sm text-green-800 font-medium">スキルアップ</Text>
                <Text className="text-xs text-green-600">改善点を可視化</Text>
              </View>
              <View className="flex-1 bg-purple-50 rounded-lg p-4 items-center">
                <Text className="text-2xl mb-2">🎯</Text>
                <Text className="text-sm text-purple-800 font-medium">成功事例</Text>
                <Text className="text-xs text-purple-600">トップの技を学ぶ</Text>
              </View>
            </View>

            {/* Setup steps */}
            <View className="bg-gray-50 rounded-lg p-4 mb-8">
              <Text className="font-medium text-gray-900 mb-3">セットアップの流れ</Text>
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <View className="w-6 h-6 bg-primary-600 rounded-full items-center justify-center">
                    <Text className="text-white text-xs font-bold">1</Text>
                  </View>
                  <Text className="text-gray-600">プロフィールの入力</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <View className="w-6 h-6 bg-gray-300 rounded-full items-center justify-center">
                    <Text className="text-gray-600 text-xs font-bold">2</Text>
                  </View>
                  <Text className="text-gray-600">プライバシー設定</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <View className="w-6 h-6 bg-gray-300 rounded-full items-center justify-center">
                    <Text className="text-gray-600 text-xs font-bold">3</Text>
                  </View>
                  <Text className="text-gray-600">完了</Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={handleNext}
              className="bg-primary-600 rounded-lg py-4 items-center"
            >
              <Text className="text-white text-lg font-semibold">始める →</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
