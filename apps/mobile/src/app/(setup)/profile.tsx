import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';

interface ProfileData {
  display_name: string;
  specialties: string[];
  years_of_experience: string;
}

const SPECIALTIES = [
  'カット',
  'カラー',
  'パーマ',
  'トリートメント',
  'ヘッドスパ',
  'エクステ',
  '縮毛矯正',
  'スタイリング',
];

export default function SetupProfileScreen() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData>({
    display_name: '',
    specialties: [],
    years_of_experience: '',
  });

  const toggleSpecialty = (specialty: string) => {
    setData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  const handleNext = () => {
    if (!data.display_name.trim()) {
      Alert.alert('入力エラー', '表示名を入力してください');
      return;
    }
    // Save to local storage or API in real implementation
    router.push('/(setup)/privacy');
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
                <Text className="text-white font-bold">1</Text>
              </View>
              <View className="flex-1 h-1 bg-primary-600" />
              <Text className="text-primary-600 font-medium">プロフィール</Text>
            </View>

            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 bg-gray-300 rounded-full items-center justify-center">
                <Text className="text-gray-600 font-bold">2</Text>
              </View>
              <View className="flex-1 h-1 bg-gray-300" />
              <Text className="text-gray-500">プライバシー設定</Text>
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

        {/* Right side - Form */}
        <ScrollView className="flex-1 p-8">
          <View className="max-w-lg">
            <Text className="text-3xl font-bold text-gray-800 mb-2">
              プロフィールの入力
            </Text>
            <Text className="text-gray-600 mb-8">
              あなたの情報を入力してください。後から変更することもできます。
            </Text>

            {/* Display name */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">
                表示名 <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-lg"
                placeholder="例: 山田 太郎"
                value={data.display_name}
                onChangeText={(text) => setData({ ...data, display_name: text })}
              />
              <Text className="text-sm text-gray-500 mt-1">
                他のスタッフに表示される名前です
              </Text>
            </View>

            {/* Years of experience */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">経験年数</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-lg"
                placeholder="例: 5"
                keyboardType="numeric"
                value={data.years_of_experience}
                onChangeText={(text) =>
                  setData({ ...data, years_of_experience: text })
                }
              />
              <Text className="text-sm text-gray-500 mt-1">
                美容師としての経験年数（年）
              </Text>
            </View>

            {/* Specialties */}
            <View className="mb-8">
              <Text className="text-gray-700 font-medium mb-2">得意メニュー</Text>
              <View className="flex-row flex-wrap gap-2">
                {SPECIALTIES.map((specialty) => (
                  <Pressable
                    key={specialty}
                    onPress={() => toggleSpecialty(specialty)}
                    className={`px-4 py-2 rounded-full border-2 ${
                      data.specialties.includes(specialty)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <Text
                      className={`${
                        data.specialties.includes(specialty)
                          ? 'text-primary-700'
                          : 'text-gray-600'
                      }`}
                    >
                      {specialty}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text className="text-sm text-gray-500 mt-1">
                複数選択できます
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
