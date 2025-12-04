'use client';

/**
 * ComparisonTable Component
 * 比較テーブルコンポーネント
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonRow {
  id: string;
  name: string;
  currentValue: number;
  previousValue: number;
  target?: number;
}

interface ComparisonTableProps {
  data: ComparisonRow[];
  title?: string;
  currentLabel?: string;
  previousLabel?: string;
  valueFormatter?: (value: number) => string;
  onRowClick?: (id: string) => void;
}

export function ComparisonTable({
  data,
  title = '比較',
  currentLabel = '今期',
  previousLabel = '前期',
  valueFormatter = (v) => v.toString(),
  onRowClick,
}: ComparisonTableProps) {
  const getChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const getTargetStatus = (current: number, target?: number) => {
    if (!target) return null;
    const ratio = (current / target) * 100;
    if (ratio >= 100) return { label: '達成', color: 'bg-green-100 text-green-700' };
    if (ratio >= 80) return { label: '良好', color: 'bg-yellow-100 text-yellow-700' };
    return { label: '未達', color: 'bg-red-100 text-red-700' };
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                項目
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {currentLabel}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {previousLabel}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                変化
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                目標
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => {
              const change = getChange(row.currentValue, row.previousValue);
              const targetStatus = getTargetStatus(row.currentValue, row.target);

              return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.id)}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{row.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-lg font-semibold text-gray-900">
                      {valueFormatter(row.currentValue)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-gray-500">{valueFormatter(row.previousValue)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      {getChangeIcon(change)}
                      <span className={`font-medium ${getChangeColor(change)}`}>
                        {change > 0 ? '+' : ''}
                        {change.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {row.target ? (
                      <div className="space-y-1">
                        <span className="text-sm text-gray-500">
                          {valueFormatter(row.target)}
                        </span>
                        {targetStatus && (
                          <span className={`block text-xs font-medium px-2 py-0.5 rounded-full ${targetStatus.color}`}>
                            {targetStatus.label}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ComparisonTable;
