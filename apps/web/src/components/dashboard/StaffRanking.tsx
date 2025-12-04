'use client';

/**
 * StaffRanking Component
 * スタッフランキングコンポーネント
 */
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StaffRankingItem {
  id: string;
  rank: number;
  previousRank?: number;
  name: string;
  avatarUrl?: string;
  score: number;
  sessionCount: number;
  conversionRate: number;
}

interface StaffRankingProps {
  data: StaffRankingItem[];
  title?: string;
  showConversion?: boolean;
  maxItems?: number;
  onStaffClick?: (id: string) => void;
}

export function StaffRanking({
  data,
  title = 'スタッフランキング',
  showConversion = true,
  maxItems = 10,
  onStaffClick,
}: StaffRankingProps) {
  const displayData = data.slice(0, maxItems);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-yellow-900" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-700">{rank}</span>
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 rounded-full bg-orange-300 flex items-center justify-center">
          <span className="text-sm font-bold text-orange-800">{rank}</span>
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
        <span className="text-sm font-medium text-gray-600">{rank}</span>
      </div>
    );
  };

  const getRankChange = (current: number, previous?: number) => {
    if (previous === undefined) return null;
    const change = previous - current;
    if (change > 0) {
      return (
        <div className="flex items-center text-green-600">
          <TrendingUp className="w-3 h-3 mr-1" />
          <span className="text-xs">+{change}</span>
        </div>
      );
    }
    if (change < 0) {
      return (
        <div className="flex items-center text-red-600">
          <TrendingDown className="w-3 h-3 mr-1" />
          <span className="text-xs">{change}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center text-gray-400">
        <Minus className="w-3 h-3" />
      </div>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {displayData.map((staff) => (
          <button
            key={staff.id}
            onClick={() => onStaffClick?.(staff.id)}
            className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
          >
            {/* Rank */}
            <div className="flex items-center gap-2">
              {getRankBadge(staff.rank)}
              {getRankChange(staff.rank, staff.previousRank)}
            </div>

            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              {staff.avatarUrl ? (
                <img
                  src={staff.avatarUrl}
                  alt={staff.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-indigo-600 font-medium">
                  {staff.name.charAt(0)}
                </span>
              )}
            </div>

            {/* Name and Stats */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{staff.name}</p>
              <p className="text-sm text-gray-500">
                {staff.sessionCount}セッション
              </p>
            </div>

            {/* Score */}
            <div className="text-right">
              <p className={`text-xl font-bold ${getScoreColor(staff.score)}`}>
                {staff.score}
              </p>
              {showConversion && (
                <p className="text-sm text-gray-500">
                  成約率 {staff.conversionRate}%
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {data.length > maxItems && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            すべて表示 ({data.length}名)
          </button>
        </div>
      )}
    </div>
  );
}

export default StaffRanking;
