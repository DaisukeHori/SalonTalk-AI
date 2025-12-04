'use client';

/**
 * RecentSessions Component
 * 最近のセッション一覧コンポーネント
 */
import { Clock, User, MessageSquare, CheckCircle, XCircle } from 'lucide-react';

interface SessionItem {
  id: string;
  staffName: string;
  staffAvatarUrl?: string;
  customerName?: string;
  startTime: Date;
  duration: number; // in minutes
  score: number;
  converted: boolean;
  concerns: string[];
}

interface RecentSessionsProps {
  sessions: SessionItem[];
  title?: string;
  maxItems?: number;
  onSessionClick?: (id: string) => void;
  onViewAll?: () => void;
}

export function RecentSessions({
  sessions,
  title = '最近のセッション',
  maxItems = 5,
  onSessionClick,
  onViewAll,
}: RecentSessionsProps) {
  const displaySessions = sessions.slice(0, maxItems);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}日前`;
    if (hours > 0) return `${hours}時間前`;
    if (minutes > 0) return `${minutes}分前`;
    return 'たった今';
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}時間${mins > 0 ? `${mins}分` : ''}`;
    }
    return `${mins}分`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            すべて表示
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {displaySessions.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>セッションがありません</p>
          </div>
        ) : (
          displaySessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSessionClick?.(session.id)}
              className="w-full px-6 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-start gap-4">
                {/* Staff Avatar */}
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  {session.staffAvatarUrl ? (
                    <img
                      src={session.staffAvatarUrl}
                      alt={session.staffName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-indigo-600 font-medium">
                      {session.staffName.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Session Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{session.staffName}</p>
                    {session.converted ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-300" />
                    )}
                  </div>
                  {session.customerName && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {session.customerName}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(session.startTime)}
                    </span>
                    <span>{formatDuration(session.duration)}</span>
                  </div>

                  {/* Concerns */}
                  {session.concerns.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {session.concerns.slice(0, 3).map((concern, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-xs"
                        >
                          {concern}
                        </span>
                      ))}
                      {session.concerns.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{session.concerns.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Score */}
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(
                    session.score
                  )}`}
                >
                  {session.score}点
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default RecentSessions;
