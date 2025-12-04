/**
 * KeywordBadge Component
 * キーワードバッジコンポーネント
 */
import { View, Text, Pressable } from 'react-native';

type BadgeVariant = 'concern' | 'positive' | 'neutral' | 'product';

interface KeywordBadgeProps {
  keyword: string;
  variant?: BadgeVariant;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  concern: { bg: 'bg-red-100', text: 'text-red-700' },
  positive: { bg: 'bg-green-100', text: 'text-green-700' },
  neutral: { bg: 'bg-gray-100', text: 'text-gray-700' },
  product: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export function KeywordBadge({
  keyword,
  variant = 'neutral',
  onPress,
  size = 'md',
}: KeywordBadgeProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const badge = (
    <View className={`rounded-full ${variantStyle.bg} ${sizeStyle}`}>
      <Text className={`${variantStyle.text} font-medium`}>{keyword}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}>
        {badge}
      </Pressable>
    );
  }

  return badge;
}

interface KeywordListProps {
  keywords: string[];
  variant?: BadgeVariant;
  maxDisplay?: number;
}

export function KeywordList({ keywords, variant = 'concern', maxDisplay }: KeywordListProps) {
  const displayKeywords = maxDisplay ? keywords.slice(0, maxDisplay) : keywords;
  const remaining = keywords.length - displayKeywords.length;

  return (
    <View className="flex-row flex-wrap gap-2">
      {displayKeywords.map((keyword, index) => (
        <KeywordBadge key={index} keyword={keyword} variant={variant} />
      ))}
      {remaining > 0 && (
        <View className="px-2 py-1 bg-gray-200 rounded-full">
          <Text className="text-gray-600 text-sm">+{remaining}</Text>
        </View>
      )}
    </View>
  );
}

export default KeywordBadge;
