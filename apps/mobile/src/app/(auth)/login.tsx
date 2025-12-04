import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }

    try {
      await login(email, password);
      router.replace('/(main)/home');
    } catch (error) {
      Alert.alert('ログインエラー', 'メールアドレスまたはパスワードが正しくありません');
    }
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

        {/* Right side - Login form */}
        <View className="flex-1 items-center justify-center p-8">
          <View className="w-full max-w-md">
            <Text className="text-3xl font-bold text-gray-800 mb-8">ログイン</Text>

            <View className="mb-4">
              <Text className="text-gray-600 mb-2">メールアドレス</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-lg"
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!isLoading}
              />
            </View>

            <View className="mb-6">
              <Text className="text-gray-600 mb-2">パスワード</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-lg"
                placeholder="パスワード"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
              />
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              className={`bg-primary-600 rounded-lg py-4 items-center ${
                isLoading ? 'opacity-50' : ''
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-lg font-semibold">ログイン</Text>
              )}
            </Pressable>

            <Pressable className="mt-4 items-center">
              <Text className="text-primary-600">パスワードをお忘れですか？</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
