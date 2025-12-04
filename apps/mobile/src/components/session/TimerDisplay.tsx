/**
 * TimerDisplay Component
 * 経過時間表示コンポーネント
 */
import { View, Text } from 'react-native';

interface TimerDisplayProps {
  elapsedMs: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function TimerDisplay({
  elapsedMs,
  showLabel = true,
  size = 'md',
}: TimerDisplayProps) {
  return (
    <View className="flex-row items-center">
      {showLabel && (
        <Text className="text-gray-500 mr-2">⏱</Text>
      )}
      <Text className={`font-mono font-bold text-gray-800 ${sizeStyles[size]}`}>
        {formatTime(elapsedMs)}
      </Text>
    </View>
  );
}

export default TimerDisplay;
