import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function SetupCompleteScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    setIsLoading(true);

    try {
      // In real implementation:
      // 1. Call complete-staff-setup API
      // 2. Clear setup progress from local storage
      // 3. Navigate to main app

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      router.replace('/(main)/home');
    } catch (error) {
      console.error('Setup completion failed:', error);
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 flex-row">
        {/* Left side - Progress */}
        <View className="w-80 bg-gray-50 p-8">
          <Text className="text-2xl font-bold text-gray-800 mb-8">初期設定</Text>

          <View className="gap-4">
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 bg-primary-600 rounded-full items-center justify-center">
                <Text className="text-white font-bold">✓</Text>
              </View>
              <View className="flex-1 h-1 bg-primary-600" />
              <Text className="text-primary-600">プロフィール</Text>
            </View>

            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 bg-primary-600 rounded-full items-center justify-center">
                <Text className="text-white font-bold">✓</Text>
              </View>
              <View className="flex-1 h-1 bg-primary-600" />
              <Text className="text-primary-600">プライバシー設定</Text>
            </View>

            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 bg-primary-600 rounded-full items-center justify-center">
                <Text className="text-white font-bold">3</Text>
              </View>
              <View className="flex-1 h-1 bg-primary-600" />
              <Text className="text-primary-600 font-medium">完了</Text>
            </View>
          </View>
        </View>

        {/* Right side - Complete content */}
        <View className="flex-1 items-center justify-center p-8">
          <View className="max-w-lg items-center">
            <Text className="text-7xl mb-6">🎊</Text>
            <Text className="text-3xl font-bold text-gray-800 text-center mb-4">
              設定完了！
            </Text>
            <Text className="text-gray-600 text-center text-lg mb-8">
              初期設定が完了しました。{'\n'}
              さっそくSalonTalk AIを使い始めましょう！
            </Text>

            {/* Next steps */}
            <View className="bg-gray-50 rounded-lg p-6 mb-8 w-full">
              <Text className="font-semibold text-gray-900 mb-4 text-center">
                使い方
              </Text>
              <View className="gap-4">
                <View className="flex-row items-start gap-3">
                  <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center">
                    <Text className="text-primary-600 font-bold">1</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-gray-900">
                      セッションを開始
                    </Text>
                    <Text className="text-sm text-gray-500">
                      施術を始める前に「録音開始」をタップ
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-3">
                  <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center">
                    <Text className="text-primary-600 font-bold">2</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-gray-900">
                      リアルタイム分析を確認
                    </Text>
                    <Text className="text-sm text-gray-500">
                      会話中にスコアと提案が表示されます
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-3">
                  <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center">
                    <Text className="text-primary-600 font-bold">3</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-gray-900">
                      レポートで振り返り
                    </Text>
                    <Text className="text-sm text-gray-500">
                      終了後にAI分析レポートを確認
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Navigation buttons */}
            <View className="flex-row justify-between w-full">
              <Pressable
                onPress={handleBack}
                disabled={isLoading}
                className="px-6 py-3"
              >
                <Text className={`text-lg ${isLoading ? 'text-gray-400' : 'text-gray-600'}`}>
                  ← 戻る
                </Text>
              </Pressable>
              <Pressable
                onPress={handleComplete}
                disabled={isLoading}
                className={`bg-primary-600 rounded-lg px-8 py-4 flex-row items-center gap-2 ${
                  isLoading ? 'opacity-50' : ''
                }`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : null}
                <Text className="text-white text-lg font-semibold">
                  {isLoading ? '処理中...' : 'はじめる →'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
