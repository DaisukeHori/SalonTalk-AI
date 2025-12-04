/**
 * Format Utilities
 * フォーマット関数
 */

/**
 * 日付をYYYY/MM/DD形式にフォーマット
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 時刻をHH:MM形式にフォーマット
 */
export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 日時をYYYY/MM/DD HH:MM形式にフォーマット
 */
export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * 秒数を分:秒形式にフォーマット
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * ミリ秒を分形式にフォーマット
 */
export function formatDurationMinutes(milliseconds: number): string {
  const minutes = Math.round(milliseconds / 60000);
  return `${minutes}分`;
}

/**
 * スコアに応じた色を返す
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'; // green-500
  if (score >= 60) return '#6366f1'; // indigo-500
  if (score >= 40) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

/**
 * スコアに応じたラベルを返す
 */
export function getScoreLabel(score: number): string {
  if (score >= 80) return '優秀';
  if (score >= 60) return '良好';
  if (score >= 40) return '普通';
  return '要改善';
}

/**
 * 数値をパーセント表示にフォーマット
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * 相対時間を返す（例: 3分前）
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;

  return formatDate(date);
}

/**
 * ファイルサイズをフォーマット
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
