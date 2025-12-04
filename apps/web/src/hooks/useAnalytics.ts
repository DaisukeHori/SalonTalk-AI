'use client';

/**
 * useAnalytics Hook
 * 分析データフック
 */
import { useState, useCallback } from 'react';

interface DateRange {
  start: Date;
  end: Date;
}

interface AnalyticsMetric {
  name: string;
  currentValue: number;
  previousValue: number;
  target?: number;
}

interface TrendDataPoint {
  date: string;
  value: number;
}

interface StaffPerformance {
  id: string;
  name: string;
  averageScore: number;
  sessionCount: number;
  conversionRate: number;
  trend: number;
}

interface AnalyticsData {
  summary: {
    totalSessions: number;
    averageScore: number;
    conversionRate: number;
    improvementRate: number;
  };
  metrics: AnalyticsMetric[];
  scoreTrend: TrendDataPoint[];
  conversionTrend: TrendDataPoint[];
  staffPerformance: StaffPerformance[];
  topConcerns: { keyword: string; count: number }[];
}

interface UseAnalyticsReturn {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  fetchAnalytics: () => Promise<void>;
  compareWithPeriod: (comparePeriod: 'previous' | 'year') => Promise<AnalyticsData | null>;
  exportAnalytics: (format: 'csv' | 'excel' | 'pdf') => Promise<Blob | null>;
}

export function useAnalytics(): UseAnalyticsReturn {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return { start, end };
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const response = await fetch(`/api/analytics?${params.toString()}`);
      if (!response.ok) {
        throw new Error('分析データの取得に失敗しました');
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const compareWithPeriod = useCallback(async (
    comparePeriod: 'previous' | 'year'
  ): Promise<AnalyticsData | null> => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        compare: comparePeriod,
      });

      const response = await fetch(`/api/analytics/compare?${params.toString()}`);
      if (!response.ok) {
        throw new Error('比較データの取得に失敗しました');
      }

      return await response.json();
    } catch {
      return null;
    }
  }, [dateRange]);

  const exportAnalytics = useCallback(async (
    format: 'csv' | 'excel' | 'pdf'
  ): Promise<Blob | null> => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        format,
      });

      const response = await fetch(`/api/analytics/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error('エクスポートに失敗しました');
      }

      return await response.blob();
    } catch {
      return null;
    }
  }, [dateRange]);

  return {
    data,
    loading,
    error,
    dateRange,
    setDateRange,
    fetchAnalytics,
    compareWithPeriod,
    exportAnalytics,
  };
}

export default useAnalytics;
