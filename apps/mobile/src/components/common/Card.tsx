/**
 * Card Component
 * 共通カードコンポーネント
 */
import { View, Pressable } from 'react-native';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: boolean;
}

const paddingStyles = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  onPress,
  className = '',
  padding = 'md',
  shadow = true,
}: CardProps) {
  const baseClassName = `
    bg-white
    rounded-xl
    ${paddingStyles[padding]}
    ${shadow ? 'shadow-sm' : ''}
    ${className}
  `;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={baseClassName}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        {children}
      </Pressable>
    );
  }

  return <View className={baseClassName}>{children}</View>;
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`mb-4 ${className}`}>{children}</View>;
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={className}>{children}</View>;
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`mt-4 pt-4 border-t border-gray-100 ${className}`}>{children}</View>;
}

export default Card;
