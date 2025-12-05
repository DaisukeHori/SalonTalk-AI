'use client';

/**
 * StaffCard Component
 * スタッフカードコンポーネント
 */
import Image from 'next/image';
import { Mail, Calendar, TrendingUp, Target, MessageSquare } from 'lucide-react';

interface StaffCardProps {
  id: string;
  name: string;
  email: string;
  role: 'stylist' | 'manager' | 'owner' | 'admin';
  avatarUrl?: string;
  averageScore: number;
  sessionCount: number;
  conversionRate: number;
  rank?: number;
  createdAt?: Date;
  onClick?: () => void;
}

const roleLabels = {
  stylist: 'スタイリスト',
  manager: 'マネージャー',
  owner: 'オーナー',
  admin: '管理者',
};

const roleColors = {
  stylist: 'bg-indigo-100 text-indigo-700',
  manager: 'bg-purple-100 text-purple-700',
  owner: 'bg-amber-100 text-amber-700',
  admin: 'bg-gray-100 text-gray-700',
};

export function StaffCard({
  name,
  email,
  role,
  avatarUrl,
  averageScore,
  sessionCount,
  conversionRate,
  rank,
  createdAt,
  onClick,
}: StaffCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
    });
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={name}
                fill
                sizes="64px"
                className="rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl text-indigo-600 font-medium">
                {name.charAt(0)}
              </span>
            )}
          </div>
          {rank && rank <= 3 && (
            <span className="absolute -top-1 -right-1 text-lg">
              {getRankBadge(rank)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{name}</h3>
          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${roleColors[role]}`}>
            {roleLabels[role]}
          </span>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${getScoreColor(averageScore)}`}>
            {averageScore}
          </p>
          <p className="text-xs text-gray-500">平均スコア</p>
        </div>
      </div>

      {/* Contact */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="truncate">{email}</span>
        </div>
        {createdAt && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{formatDate(createdAt)} 登録</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500">
            <MessageSquare className="w-4 h-4" />
          </div>
          <p className="mt-1 text-lg font-semibold text-gray-900">{sessionCount}</p>
          <p className="text-xs text-gray-500">セッション</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500">
            <Target className="w-4 h-4" />
          </div>
          <p className="mt-1 text-lg font-semibold text-gray-900">{conversionRate}%</p>
          <p className="text-xs text-gray-500">成約率</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {rank ? getRankBadge(rank) : '-'}
          </p>
          <p className="text-xs text-gray-500">ランク</p>
        </div>
      </div>
    </div>
  );
}

export default StaffCard;
