'use client';

/**
 * ReportExport Component
 * レポートエクスポートコンポーネント
 */
import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, File, Loader2 } from 'lucide-react';

type ExportFormat = 'pdf' | 'csv' | 'excel';

interface ExportOption {
  format: ExportFormat;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface ReportExportProps {
  reportId?: string;
  reportIds?: string[];
  onExport: (format: ExportFormat, ids: string[]) => Promise<void>;
  disabled?: boolean;
}

const exportOptions: ExportOption[] = [
  {
    format: 'pdf',
    label: 'PDF',
    icon: <FileText className="w-5 h-5" />,
    description: '印刷用レポート形式',
  },
  {
    format: 'csv',
    label: 'CSV',
    icon: <File className="w-5 h-5" />,
    description: 'データ分析用形式',
  },
  {
    format: 'excel',
    label: 'Excel',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    description: 'スプレッドシート形式',
  },
];

export function ReportExport({
  reportId,
  reportIds,
  onExport,
  disabled = false,
}: ReportExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<ExportFormat | null>(null);

  const ids = reportIds || (reportId ? [reportId] : []);

  const handleExport = async (format: ExportFormat) => {
    if (ids.length === 0) return;

    setLoading(format);
    try {
      await onExport(format, ids);
    } finally {
      setLoading(null);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || ids.length === 0}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        エクスポート
        {ids.length > 1 && (
          <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
            {ids.length}件
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">エクスポート形式</p>
              <p className="text-xs text-gray-500 mt-1">
                {ids.length}件のレポートをエクスポート
              </p>
            </div>
            <div className="p-2">
              {exportOptions.map((option) => (
                <button
                  key={option.format}
                  onClick={() => handleExport(option.format)}
                  disabled={loading !== null}
                  className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                    {loading === option.format ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      option.icon
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ReportExport;
