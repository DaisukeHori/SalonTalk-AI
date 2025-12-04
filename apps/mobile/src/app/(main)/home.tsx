/**
 * Home Screen
 * ホーム画面
 */
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { getSupabaseClient } from '@/lib/supabase';

interface RecentSession {
  id: string;
  customerName: string;
  time: string;
  duration: string;
  score: number;
}

interface Stats {
  todaySessions: number;
  avgScore: number;
  conversions: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, salon } = useAuthStore();
  const [stats, setStats] = useState<Stats>({ todaySessions: 0, avgScore: 0, conversions: 0 });
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const supabase = getSupabaseClient();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch today's sessions
      const { data: todayData } = await supabase
        .from('sessions')
        .select(`
          id,
          started_at,
          ended_at,
          customer_info,
          session_reports (overall_score)
        `)
        .eq('stylist_id', user.id)
        .eq('status', 'completed')
        .gte('started_at', today.toISOString());

      const todaySessions = todayData?.length || 0;
      const todayScores = (todayData || [])
        .filter((s: any) => s.session_reports?.overall_score)
        .map((s: any) => s.session_reports.overall_score);
      const todayAvg = todayScores.length > 0
        ? Math.round(todayScores.reduce((a: number, b: number) => a + b, 0) / todayScores.length)
        : 0;

      setStats({
        todaySessions,
        avgScore: todayAvg,
        conversions: 0, // Would need conversion tracking
      });

      // Fetch recent sessions
      const { data: recentData } = await supabase
        .from('sessions')
        .select(`
          id,
          started_at,
          ended_at,
          customer_info,
          session_reports (overall_score)
        `)
        .eq('stylist_id', user.id)
        .eq('status', 'completed')
        .order('started_at', { ascending: false })
        .limit(3);

      const formatted: RecentSession[] = (recentData || []).map((s: any) => {
        const startDate = new Date(s.started_at);
        const endDate = s.ended_at ? new Date(s.ended_at) : null;
        const durationMins = endDate
          ? Math.round((endDate.getTime() - startDate.getTime()) / 1000 / 60)
          : 0;

        const isToday = startDate.toDateString() === new Date().toDateString();
        const timeStr = isToday
          ? `本日 ${startDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
          : startDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });

        return {
          id: s.id,
          customerName: s.customer_info?.name || 'お客様',
          time: `${timeStr} - ${durationMins}分`,
          duration: `${durationMins}分`,
          score: s.session_reports?.overall_score || 0,
        };
      });

      setRecentSessions(formatted);
    } catch (err) {
      console.error('Failed to fetch home data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  const statsDisplay = [
    { label: '今日のセッション', value: stats.todaySessions.toString(), unit: '回' },
    { label: '平均スコア', value: stats.avgScore.toString(), unit: '点' },
    { label: '店販成約', value: stats.conversions.toString(), unit: '件' },
  ];

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View className="bg-primary-600 px-8 py-6">
        <Text className="text-white text-lg">こんにちは、</Text>
        <Text className="text-white text-3xl font-bold">{user?.name ?? 'スタイリスト'}さん</Text>
        <Text className="text-white/80 mt-1">{salon?.name}</Text>
      </View>

      {/* Quick Stats */}
      <View className="flex-row px-4 -mt-4">
        {statsDisplay.map((stat, index) => (
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
        {recentSessions.length === 0 ? (
          <View className="bg-white rounded-xl p-6 items-center">
            <Text className="text-gray-400">セッションがありません</Text>
          </View>
        ) : (
          recentSessions.map((session) => (
            <Pressable
              key={session.id}
              onPress={() => router.push(`/(main)/report/${session.id}`)}
              className="bg-white rounded-xl p-4 mb-3 flex-row items-center"
            >
              <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center">
                <Text className="text-xl">👤</Text>
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-gray-800 font-semibold">{session.customerName}</Text>
                <Text className="text-gray-500 text-sm">{session.time}</Text>
              </View>
              <View className="items-end">
                <Text className="text-2xl font-bold text-primary-600">{session.score}</Text>
                <Text className="text-gray-500 text-sm">点</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}
