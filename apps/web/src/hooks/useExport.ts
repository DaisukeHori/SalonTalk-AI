'use client';

/**
 * useExport Hook
 * エクスポート機能フック
 */
import { useState, useCallback } from 'react';

type ExportFormat = 'pdf' | 'csv' | 'excel';

interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface UseExportReturn {
  exporting: boolean;
  error: string | null;
  exportReport: (reportId: string, options: ExportOptions) => Promise<void>;
  exportReports: (reportIds: string[], options: ExportOptions) => Promise<void>;
  exportAnalytics: (options: ExportOptions) => Promise<void>;
  exportStaffData: (staffId?: string, options?: ExportOptions) => Promise<void>;
}

export function useExport(): UseExportReturn {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFileExtension = (format: ExportFormat): string => {
    switch (format) {
      case 'pdf':
        return 'pdf';
      case 'csv':
        return 'csv';
      case 'excel':
        return 'xlsx';
    }
  };

  const exportReport = useCallback(async (reportId: string, options: ExportOptions) => {
    setExporting(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/${reportId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: options.format }),
      });

      if (!response.ok) {
        throw new Error('レポートのエクスポートに失敗しました');
      }

      const blob = await response.blob();
      const filename = options.filename || `report_${reportId}.${getFileExtension(options.format)}`;
      downloadBlob(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  }, []);

  const exportReports = useCallback(async (reportIds: string[], options: ExportOptions) => {
    setExporting(true);
    setError(null);
    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportIds,
          format: options.format,
          dateRange: options.dateRange,
        }),
      });

      if (!response.ok) {
        throw new Error('レポートのエクスポートに失敗しました');
      }

      const blob = await response.blob();
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = options.filename || `reports_${timestamp}.${getFileExtension(options.format)}`;
      downloadBlob(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  }, []);

  const exportAnalytics = useCallback(async (options: ExportOptions) => {
    setExporting(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        format: options.format,
      });
      if (options.dateRange) {
        params.append('startDate', options.dateRange.start.toISOString());
        params.append('endDate', options.dateRange.end.toISOString());
      }

      const response = await fetch(`/api/analytics/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error('分析データのエクスポートに失敗しました');
      }

      const blob = await response.blob();
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = options.filename || `analytics_${timestamp}.${getFileExtension(options.format)}`;
      downloadBlob(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  }, []);

  const exportStaffData = useCallback(async (staffId?: string, options?: ExportOptions) => {
    setExporting(true);
    setError(null);
    try {
      const format = options?.format || 'csv';
      const url = staffId
        ? `/api/staff/${staffId}/export?format=${format}`
        : `/api/staff/export?format=${format}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('スタッフデータのエクスポートに失敗しました');
      }

      const blob = await response.blob();
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = options?.filename || `staff_${staffId || 'all'}_${timestamp}.${getFileExtension(format)}`;
      downloadBlob(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  }, []);

  return {
    exporting,
    error,
    exportReport,
    exportReports,
    exportAnalytics,
    exportStaffData,
  };
}

export default useExport;
