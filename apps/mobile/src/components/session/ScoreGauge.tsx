/**
 * ScoreGauge Component
 * スコアゲージコンポーネント
 */
import { View, Text } from 'react-native';

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  color?: string;
}

const sizeStyles = {
  sm: { container: 'h-2', text: 'text-sm' },
  md: { container: 'h-3', text: 'text-base' },
  lg: { container: 'h-4', text: 'text-lg' },
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export function ScoreGauge({
  score,
  maxScore = 100,
  label,
  size = 'md',
  showPercentage = true,
  color,
}: ScoreGaugeProps) {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const sizeStyle = sizeStyles[size];
  const barColor = color || getScoreColor(score);

  return (
    <View className="w-full">
      {(label || showPercentage) && (
        <View className="flex-row justify-between mb-1">
          {label && (
            <Text className={`text-gray-700 font-medium ${sizeStyle.text}`}>
              {label}
            </Text>
          )}
          {showPercentage && (
            <Text className={`text-gray-600 ${sizeStyle.text}`}>
              {Math.round(score)}点
            </Text>
          )}
        </View>
      )}
      <View className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeStyle.container}`}>
        <View
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </View>
    </View>
  );
}

export default ScoreGauge;
