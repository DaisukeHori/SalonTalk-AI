import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';

interface PrivacySettings {
  allow_voice_recording: boolean;
  allow_analysis_sharing: boolean;
  allow_anonymized_stats: boolean;
}

export default function SetupPrivacyScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<PrivacySettings>({
    allow_voice_recording: true,
    allow_analysis_sharing: true,
    allow_anonymized_stats: true,
  });

  const handleToggle = (key: keyof PrivacySettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleNext = () => {
    // Save settings in real implementation
    router.push('/(setup)/complete');
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
                <Text className="text-white font-bold">2</Text>
              </View>
              <View className="flex-1 h-1 bg-primary-600" />
              <Text className="text-primary-600 font-medium">プライバシー設定</Text>
            </View>

            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 bg-gray-300 rounded-full items-center justify-center">
                <Text className="text-gray-600 font-bold">3</Text>
              </View>
              <View className="flex-1 h-1 bg-gray-300" />
              <Text className="text-gray-500">完了</Text>
            </View>
          </View>
        </View>

        {/* Right side - Content */}
        <ScrollView className="flex-1 p-8">
          <View className="max-w-lg">
            <Text className="text-3xl font-bold text-gray-800 mb-2">
              プライバシー設定
            </Text>
            <Text className="text-gray-600 mb-8">
              音声録音と分析に関する設定を行います。いつでも変更できます。
            </Text>

            {/* Settings */}
            <View className="gap-4 mb-8">
              {/* Voice recording */}
              <View className="bg-white border border-gray-200 rounded-lg p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text className="text-lg font-medium text-gray-900">
                      音声録音を許可
                    </Text>
                    <Text className="text-sm text-gray-500 mt-1">
                      施術中の会話を録音し、AIが分析します。
                      録音された音声は分析後24時間以内に自動削除されます。
                    </Text>
                  </View>
                  <Switch
                    value={settings.allow_voice_recording}
                    onValueChange={() => handleToggle('allow_voice_recording')}
                    trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                  />
                </View>
              </View>

              {/* Analysis sharing */}
              <View className="bg-white border border-gray-200 rounded-lg p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text className="text-lg font-medium text-gray-900">
                      分析結果の共有
                    </Text>
                    <Text className="text-sm text-gray-500 mt-1">
                      マネージャーやオーナーがあなたの分析結果を
                      確認できるようになります。
                    </Text>
                  </View>
                  <Switch
                    value={settings.allow_analysis_sharing}
                    onValueChange={() => handleToggle('allow_analysis_sharing')}
                    trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                  />
                </View>
              </View>

              {/* Anonymized stats */}
              <View className="bg-white border border-gray-200 rounded-lg p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text className="text-lg font-medium text-gray-900">
                      匿名統計への貢献
                    </Text>
                    <Text className="text-sm text-gray-500 mt-1">
                      匿名化されたデータをサービス改善に活用します。
                      個人を特定できる情報は含まれません。
                    </Text>
                  </View>
                  <Switch
                    value={settings.allow_anonymized_stats}
                    onValueChange={() => handleToggle('allow_anonymized_stats')}
                    trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                  />
                </View>
              </View>
            </View>

            {/* Info box */}
            <View className="bg-green-50 rounded-lg p-4 mb-8">
              <Text className="text-sm text-green-800">
                🔒 すべてのデータは暗号化され、国内サーバーで安全に管理されます。
                プライバシー設定はいつでも変更できます。
              </Text>
            </View>

            {/* Navigation buttons */}
            <View className="flex-row justify-between">
              <Pressable
                onPress={handleBack}
                className="px-6 py-3"
              >
                <Text className="text-gray-600 text-lg">← 戻る</Text>
              </Pressable>
              <Pressable
                onPress={handleNext}
                className="bg-primary-600 rounded-lg px-8 py-3"
              >
                <Text className="text-white text-lg font-semibold">次へ →</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
