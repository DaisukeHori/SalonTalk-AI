import { View, Text, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, salon, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ログアウト',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-8">
        <Text className="text-3xl font-bold text-gray-800 mb-6">設定</Text>

        {/* Profile Section */}
        <View className="bg-white rounded-xl p-4 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center">
              <Text className="text-3xl">👤</Text>
            </View>
            <View className="ml-4">
              <Text className="text-xl font-bold text-gray-800">{user?.name}</Text>
              <Text className="text-gray-500">{user?.email}</Text>
              <Text className="text-primary-600 text-sm mt-1">{salon?.name}</Text>
            </View>
          </View>
          <Pressable className="bg-gray-100 rounded-lg py-3 items-center">
            <Text className="text-gray-700 font-medium">プロフィール編集</Text>
          </Pressable>
        </View>

        {/* Recording Settings */}
        <Text className="text-lg font-semibold text-gray-800 mb-3">録音設定</Text>
        <View className="bg-white rounded-xl p-4 mb-6">
          <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View>
              <Text className="text-gray-800 font-medium">自動録音開始</Text>
              <Text className="text-gray-500 text-sm">セッション開始時に自動で録音を開始</Text>
            </View>
            <Switch value={true} />
          </View>
          <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View>
              <Text className="text-gray-800 font-medium">リアルタイム分析</Text>
              <Text className="text-gray-500 text-sm">録音中にスコアを表示</Text>
            </View>
            <Switch value={true} />
          </View>
          <View className="flex-row items-center justify-between py-3">
            <View>
              <Text className="text-gray-800 font-medium">提案通知</Text>
              <Text className="text-gray-500 text-sm">最適な提案タイミングを通知</Text>
            </View>
            <Switch value={true} />
          </View>
        </View>

        {/* App Info */}
        <Text className="text-lg font-semibold text-gray-800 mb-3">アプリ情報</Text>
        <View className="bg-white rounded-xl p-4 mb-6">
          <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <Text className="text-gray-800">バージョン</Text>
            <Text className="text-gray-500">0.1.0</Text>
          </View>
          <Pressable className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <Text className="text-gray-800">利用規約</Text>
            <Text className="text-gray-400">›</Text>
          </Pressable>
          <Pressable className="flex-row items-center justify-between py-3">
            <Text className="text-gray-800">プライバシーポリシー</Text>
            <Text className="text-gray-400">›</Text>
          </Pressable>
        </View>

        {/* Logout */}
        <Pressable onPress={handleLogout} className="bg-red-50 rounded-xl py-4 items-center">
          <Text className="text-red-600 font-semibold">ログアウト</Text>
        </Pressable>

        <Text className="text-center text-gray-400 text-sm mt-8">
          © 2025 Revol Corporation
        </Text>
      </View>
    </ScrollView>
  );
}
