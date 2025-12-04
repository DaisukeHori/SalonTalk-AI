/**
 * Session History Screen
 * セッション履歴画面
 */
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

interface Session {
  id: string;
  date: string;
  time: string;
  duration: string;
  score: number;
  converted: boolean;
}

interface Stats {
  weeklyCount: number;
  avgScore: number;
  conversionRate: number;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats>({ weeklyCount: 0, avgScore: 0, conversionRate: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();

      // Fetch completed sessions with reports
      const { data: sessionData, error } = await supabase
        .from('sessions')
        .select(`
          id,
          started_at,
          ended_at,
          customer_info,
          session_reports (
            overall_score
          )
        `)
        .eq('stylist_id', user?.id)
        .eq('status', 'completed')
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedSessions: Session[] = (sessionData || []).map((s: any) => {
        const startDate = new Date(s.started_at);
        const endDate = s.ended_at ? new Date(s.ended_at) : null;
        const durationMins = endDate
          ? Math.round((endDate.getTime() - startDate.getTime()) / 1000 / 60)
          : 0;

        return {
          id: s.id,
          date: startDate.toLocaleDateString('ja-JP'),
          time: startDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          duration: `${durationMins}分`,
          score: s.session_reports?.overall_score || 0,
          converted: false, // Would need conversion tracking
        };
      });

      setSessions(formattedSessions);

      // Calculate stats
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weeklyCount = formattedSessions.filter(s => {
        const date = new Date(s.date.replace(/\//g, '-'));
        return date >= weekAgo;
      }).length;

      const avgScore = formattedSessions.length > 0
        ? Math.round(formattedSessions.reduce((sum, s) => sum + s.score, 0) / formattedSessions.length)
        : 0;

      const conversionRate = formattedSessions.length > 0
        ? Math.round((formattedSessions.filter(s => s.converted).length / formattedSessions.length) * 100)
        : 0;

      setStats({ weeklyCount, avgScore, conversionRate });
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchSessions();
  }, [fetchSessions]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="text-gray-500 mt-4">読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      <View className="p-8">
        <Text className="text-3xl font-bold text-gray-800 mb-2">セッション履歴</Text>
        <Text className="text-gray-500 mb-6">過去のセッション分析を確認できます</Text>

        {/* Stats Summary */}
        <View className="flex-row mb-6">
          <View className="flex-1 bg-white rounded-xl p-4 mr-2">
            <Text className="text-gray-500 text-sm">今週のセッション</Text>
            <Text className="text-2xl font-bold text-gray-800">{stats.weeklyCount}回</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4 mx-2">
            <Text className="text-gray-500 text-sm">平均スコア</Text>
            <Text className="text-2xl font-bold text-primary-600">{stats.avgScore}点</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4 ml-2">
            <Text className="text-gray-500 text-sm">成約率</Text>
            <Text className="text-2xl font-bold text-green-600">{stats.conversionRate}%</Text>
          </View>
        </View>

        {/* Session List */}
        {sessions.length === 0 ? (
          <View className="bg-white rounded-xl p-8 items-center">
            <Text className="text-4xl mb-4">📊</Text>
            <Text className="text-gray-500 text-lg">セッション履歴がありません</Text>
            <Text className="text-gray-400 text-sm mt-2">
              セッションを開始して履歴を作成しましょう
            </Text>
          </View>
        ) : (
          sessions.map((session) => (
            <Pressable
              key={session.id}
              onPress={() => router.push(`/(main)/reports/${session.id}`)}
              className="bg-white rounded-xl p-4 mb-3 flex-row items-center"
            >
              <View className="w-14 h-14 bg-gray-100 rounded-full items-center justify-center">
                <Text className="text-2xl">{session.converted ? '✓' : '○'}</Text>
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-gray-800 font-semibold">セッション</Text>
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
          ))
        )}
      </View>
    </ScrollView>
  );
}
