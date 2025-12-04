/**
 * Button Component
 * 共通ボタンコンポーネント
 */
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress: () => void;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: {
    bg: 'bg-indigo-600',
    text: 'text-white',
  },
  secondary: {
    bg: 'bg-white',
    text: 'text-indigo-600',
    border: 'border border-indigo-600',
  },
  danger: {
    bg: 'bg-red-600',
    text: 'text-white',
  },
  ghost: {
    bg: 'bg-transparent',
    text: 'text-gray-700',
  },
};

const sizeStyles: Record<ButtonSize, { padding: string; text: string }> = {
  sm: { padding: 'px-3 py-1.5', text: 'text-sm' },
  md: { padding: 'px-4 py-2', text: 'text-base' },
  lg: { padding: 'px-6 py-3', text: 'text-lg' },
};

export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`
        ${variantStyle.bg}
        ${variantStyle.border || ''}
        ${sizeStyle.padding}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50' : ''}
        rounded-lg
        flex-row
        items-center
        justify-center
      `}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#ffffff' : '#6366F1'}
        />
      ) : (
        <View className="flex-row items-center">
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={`${variantStyle.text} ${sizeStyle.text} font-medium`}>
            {children}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default Button;
