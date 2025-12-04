import { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useSessionStore } from '@/stores/session';
import { useAuthStore } from '@/stores/auth';
import { formatDurationHMS } from '@salontalk/shared';

export default function SessionScreen() {
  const { user, salon } = useAuthStore();
  const { currentSession, isRecording, elapsedTimeMs, currentScore, talkRatio, startSession, endSession, reset } =
    useSessionStore();
  const [customerType, setCustomerType] = useState<'new' | 'repeat'>('repeat');

  const handleStartSession = () => {
    if (!user || !salon) return;

    // Create a new session
    const session = {
      id: `session_${Date.now()}` as any,
      salonId: salon.id,
      stylistId: user.id,
      status: 'recording' as const,
      customerInfo: {
        visitType: customerType,
      },
      startedAt: new Date(),
      endedAt: null,
      totalDurationMs: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    startSession(session);

    // TODO: Start actual recording with expo-av
    // TODO: Connect to Supabase Realtime
  };

  const handleEndSession = () => {
    Alert.alert('セッション終了', 'このセッションを終了しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '終了',
        style: 'destructive',
        onPress: () => {
          endSession();
          // TODO: Stop recording, process final analysis
        },
      },
    ]);
  };

  const handleReset = () => {
    reset();
  };

  if (!isRecording && !currentSession) {
    // Session setup screen
    return (
      <View className="flex-1 bg-gray-50 p-8">
        <Text className="text-3xl font-bold text-gray-800 mb-8">新規セッション</Text>

        <View className="bg-white rounded-xl p-6 mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-4">お客様タイプ</Text>
          <View className="flex-row">
            <Pressable
              onPress={() => setCustomerType('new')}
              className={`flex-1 py-4 rounded-lg mr-2 items-center ${
                customerType === 'new' ? 'bg-primary-600' : 'bg-gray-100'
              }`}
            >
              <Text className={customerType === 'new' ? 'text-white font-semibold' : 'text-gray-600'}>
                新規
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setCustomerType('repeat')}
              className={`flex-1 py-4 rounded-lg ml-2 items-center ${
                customerType === 'repeat' ? 'bg-primary-600' : 'bg-gray-100'
              }`}
            >
              <Text className={customerType === 'repeat' ? 'text-white font-semibold' : 'text-gray-600'}>
                リピーター
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={handleStartSession}
          className="bg-primary-600 rounded-xl py-6 items-center"
        >
          <Text className="text-white text-2xl font-bold">🎙️ 録音開始</Text>
          <Text className="text-white/80 mt-2">タップしてセッションを開始</Text>
        </Pressable>
      </View>
    );
  }

  // Active session screen
  return (
    <View className="flex-1 bg-gray-900 p-8">
      <View className="flex-row items-center justify-between mb-8">
        <View>
          <Text className="text-gray-400">セッション中</Text>
          <Text className="text-white text-4xl font-bold">{formatDurationHMS(elapsedTimeMs)}</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-4 h-4 bg-red-500 rounded-full mr-2 animate-pulse" />
          <Text className="text-red-400 font-semibold">録音中</Text>
        </View>
      </View>

      {/* Real-time metrics */}
      <View className="flex-row mb-8">
        <View className="flex-1 bg-gray-800 rounded-xl p-6 mr-2">
          <Text className="text-gray-400 mb-2">現在のスコア</Text>
          <Text className="text-white text-5xl font-bold">{currentScore ?? '--'}</Text>
        </View>

        <View className="flex-1 bg-gray-800 rounded-xl p-6 ml-2">
          <Text className="text-gray-400 mb-2">トーク比率</Text>
          <View className="flex-row items-center">
            <View className="flex-1">
              <View className="flex-row mb-1">
                <Text className="text-primary-400">スタイリスト</Text>
                <Text className="text-white ml-auto">{talkRatio?.stylist ?? 0}%</Text>
              </View>
              <View className="h-2 bg-gray-700 rounded-full">
                <View
                  className="h-2 bg-primary-500 rounded-full"
                  style={{ width: `${talkRatio?.stylist ?? 0}%` }}
                />
              </View>
            </View>
          </View>
          <View className="flex-row items-center mt-2">
            <View className="flex-1">
              <View className="flex-row mb-1">
                <Text className="text-green-400">お客様</Text>
                <Text className="text-white ml-auto">{talkRatio?.customer ?? 0}%</Text>
              </View>
              <View className="h-2 bg-gray-700 rounded-full">
                <View
                  className="h-2 bg-green-500 rounded-full"
                  style={{ width: `${talkRatio?.customer ?? 0}%` }}
                />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Transcript area */}
      <View className="flex-1 bg-gray-800 rounded-xl p-6 mb-8">
        <Text className="text-gray-400 mb-4">会話ログ</Text>
        <Text className="text-gray-500 text-center mt-8">
          会話内容がここに表示されます...
        </Text>
      </View>

      {/* Controls */}
      <View className="flex-row">
        {!isRecording ? (
          <Pressable onPress={handleReset} className="flex-1 bg-gray-700 rounded-xl py-4 items-center">
            <Text className="text-white text-xl font-semibold">新規セッション</Text>
          </Pressable>
        ) : (
          <Pressable onPress={handleEndSession} className="flex-1 bg-red-600 rounded-xl py-4 items-center">
            <Text className="text-white text-xl font-semibold">⏹ セッション終了</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
