/**
 * EmotionIndicator Component
 * 感情インジケータコンポーネント
 */
import { View, Text } from 'react-native';

type EmotionType = 'positive' | 'neutral' | 'negative';

interface EmotionIndicatorProps {
  emotion: EmotionType;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const emotionStyles: Record<EmotionType, { emoji: string; label: string; color: string }> = {
  positive: {
    emoji: '😊',
    label: 'ポジティブ',
    color: 'text-green-600',
  },
  neutral: {
    emoji: '😐',
    label: 'ニュートラル',
    color: 'text-yellow-600',
  },
  negative: {
    emoji: '😞',
    label: 'ネガティブ',
    color: 'text-red-600',
  },
};

const sizeStyles = {
  sm: { emoji: 'text-2xl', label: 'text-xs' },
  md: { emoji: 'text-4xl', label: 'text-sm' },
  lg: { emoji: 'text-6xl', label: 'text-base' },
};

export function EmotionIndicator({
  emotion,
  showLabel = false,
  size = 'md',
}: EmotionIndicatorProps) {
  const emotionStyle = emotionStyles[emotion];
  const sizeStyle = sizeStyles[size];

  return (
    <View className="items-center">
      <Text className={sizeStyle.emoji}>{emotionStyle.emoji}</Text>
      {showLabel && (
        <Text className={`${emotionStyle.color} ${sizeStyle.label} mt-1 font-medium`}>
          {emotionStyle.label}
        </Text>
      )}
    </View>
  );
}

export default EmotionIndicator;
