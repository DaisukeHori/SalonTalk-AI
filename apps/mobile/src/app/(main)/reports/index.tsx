/**
 * Reports List Screen
 * レポート一覧画面
 */
import { View, Text, FlatList, RefreshControl, Pressable } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Header, LoadingScreen } from '@/components/common';
import { ReportCard } from '@/components/report';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

interface Report {
  id: string;
  sessionId: string;
  createdAt: string;
  overallScore: number;
  isConverted: boolean;
  durationMinutes: number;
  customerInfo?: {
    ageGroup?: string;
    visitType?: 'new' | 'repeat';
  };
}

export default function ReportsListScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();

      // Fetch sessions with reports for current user
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          id,
          started_at,
          ended_at,
          customer_info,
          session_reports (
            id,
            overall_score,
            created_at
          )
        `)
        .eq('stylist_id', user?.id)
        .eq('status', 'completed')
        .order('started_at', { ascending: false })
        .limit(50);

      if (sessionsError) throw sessionsError;

      const formattedReports: Report[] = (sessions || [])
        .filter((s: any) => s.session_reports)
        .map((s: any) => {
          const startDate = new Date(s.started_at);
          const endDate = s.ended_at ? new Date(s.ended_at) : null;
          const durationMins = endDate
            ? Math.round((endDate.getTime() - startDate.getTime()) / 1000 / 60)
            : 0;

          return {
            id: s.session_reports.id,
            sessionId: s.id,
            createdAt: s.session_reports.created_at || s.started_at,
            overallScore: s.session_reports.overall_score || 0,
            isConverted: false, // Would need conversion tracking
            durationMinutes: durationMins,
            customerInfo: s.customer_info ? {
              ageGroup: s.customer_info.ageGroup,
              visitType: s.customer_info.visitFrequency === 'first' ? 'new' : 'repeat',
            } : undefined,
          };
        });

      setReports(formattedReports);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'レポートの取得に失敗しました');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchReports();
  }, [fetchReports]);

  const handleReportPress = useCallback((reportId: string) => {
    router.push(`/report/${reportId}`);
  }, [router]);

  if (isLoading) {
    return <LoadingScreen message="レポートを読み込み中..." />;
  }

  const calculateStats = () => {
    if (reports.length === 0) return null;

    const avgScore = reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length;
    const conversionRate = (reports.filter((r) => r.isConverted).length / reports.length) * 100;

    return {
      avgScore: Math.round(avgScore),
      conversionRate: Math.round(conversionRate),
      totalSessions: reports.length,
    };
  };

  const stats = calculateStats();

  return (
    <View className="flex-1 bg-gray-50">
      <Header title="レポート" subtitle={`${reports.length}件のセッション`} />

      {/* Stats Summary */}
      {stats && (
        <View className="bg-white px-4 py-3 mb-2 flex-row justify-around border-b border-gray-100">
          <View className="items-center">
            <Text className="text-gray-500 text-xs">平均スコア</Text>
            <Text className="text-xl font-bold text-gray-900">{stats.avgScore}</Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-500 text-xs">成約率</Text>
            <Text className="text-xl font-bold text-green-600">{stats.conversionRate}%</Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-500 text-xs">セッション数</Text>
            <Text className="text-xl font-bold text-indigo-600">{stats.totalSessions}</Text>
          </View>
        </View>
      )}

      {error ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-red-500 mb-4">{error}</Text>
          <Pressable
            onPress={handleRefresh}
            className="bg-indigo-600 px-4 py-2 rounded-lg"
          >
            <Text className="text-white">再読み込み</Text>
          </Pressable>
        </View>
      ) : reports.length === 0 ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-4xl mb-4">📊</Text>
          <Text className="text-gray-500 text-lg">レポートがありません</Text>
          <Text className="text-gray-400 text-sm mt-2">
            セッションを開始してレポートを作成しましょう
          </Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <ReportCard
              id={item.id}
              date={new Date(item.createdAt)}
              overallScore={item.overallScore}
              isConverted={item.isConverted}
              durationMinutes={item.durationMinutes}
              customerInfo={item.customerInfo}
              onPress={() => handleReportPress(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
}
