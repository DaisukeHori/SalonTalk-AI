'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuditLogs, AuditLog, Pagination } from '@/lib/admin/client';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function loadLogs() {
      setIsLoading(true);
      const { data } = await getAuditLogs({
        action,
        target_type: targetType,
        page,
        limit: 50,
      });
      if (data) {
        setLogs(data.logs);
        setPagination(data.pagination);
      }
      setIsLoading(false);
    }
    loadLogs();
  }, [action, targetType, page]);

  const getActionBadge = (actionType: string) => {
    if (actionType.includes('suspend')) return 'bg-red-500/20 text-red-400';
    if (actionType.includes('unsuspend')) return 'bg-green-500/20 text-green-400';
    if (actionType.includes('plan')) return 'bg-purple-500/20 text-purple-400';
    if (actionType.includes('seats')) return 'bg-blue-500/20 text-blue-400';
    if (actionType.includes('login')) return 'bg-gray-500/20 text-gray-400';
    return 'bg-orange-500/20 text-orange-400';
  };

  const formatDetails = (details: Record<string, unknown>) => {
    const before = details.before as Record<string, unknown> | undefined;
    const after = details.after as Record<string, unknown> | undefined;
    const reason = details.reason as string | undefined;

    const parts: string[] = [];

    if (before && after) {
      Object.keys(after).forEach((key) => {
        if (before[key] !== after[key]) {
          parts.push(`${key}: ${before[key]} → ${after[key]}`);
        }
      });
    }

    if (reason) {
      parts.push(`理由: ${reason}`);
    }

    return parts.join(', ') || JSON.stringify(details);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">監査ログ</h1>
        <span className="text-gray-400">
          全{pagination?.total ?? 0}件
        </span>
      </div>

      {/* フィルター */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
        <div className="flex flex-wrap gap-4">
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
          >
            <option value="">すべてのアクション</option>
            <option value="login">ログイン</option>
            <option value="seats_change">座席数変更</option>
            <option value="plan_change">プラン変更</option>
            <option value="suspend">停止</option>
            <option value="unsuspend">停止解除</option>
            <option value="operator.create">オペレーター作成</option>
          </select>
          <select
            value={targetType}
            onChange={(e) => { setTargetType(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
          >
            <option value="">すべての対象種類</option>
            <option value="salon">サロン</option>
            <option value="operator">オペレーター</option>
            <option value="system">システム</option>
          </select>
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">日時</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">オペレーター</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">アクション</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">対象</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">詳細</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-500 mr-2"></div>
                    読み込み中...
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  監査ログが見つかりません
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-gray-400 text-sm whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white text-sm">{log.operator.name}</div>
                    <div className="text-gray-500 text-xs">{log.operator.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getActionBadge(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {log.target_id ? (
                      <div>
                        <div className="text-white text-sm">{log.target_name || 'Unknown'}</div>
                        {log.target_type === 'salon' && (
                          <Link
                            href={`/admin/salons/${log.target_id}`}
                            className="text-orange-500 text-xs hover:text-orange-400"
                          >
                            詳細
                          </Link>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm max-w-md truncate">
                    {formatDetails(log.details)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-gray-400 text-sm">
            {pagination.page} / {pagination.total_pages} ページ
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              前へ
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
              disabled={page === pagination.total_pages}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
