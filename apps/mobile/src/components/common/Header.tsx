/**
 * Header Component
 * 画面ヘッダーコンポーネント
 */
import { View, Text, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightContent?: ReactNode;
  transparent?: boolean;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightContent,
  transparent = false,
}: HeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView className={transparent ? 'bg-transparent' : 'bg-white'}>
      <View
        className={`
          flex-row
          items-center
          justify-between
          px-4
          py-3
          ${!transparent ? 'border-b border-gray-100' : ''}
        `}
      >
        {/* Left Section */}
        <View className="flex-row items-center flex-1">
          {showBack && (
            <Pressable
              onPress={handleBack}
              className="mr-3 p-2 -ml-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className="text-indigo-600 text-lg">← 戻る</Text>
            </Pressable>
          )}
          <View className="flex-1">
            <Text
              className="text-gray-900 font-bold text-lg"
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle && (
              <Text className="text-gray-500 text-sm">{subtitle}</Text>
            )}
          </View>
        </View>

        {/* Right Section */}
        {rightContent && <View className="ml-4">{rightContent}</View>}
      </View>
    </SafeAreaView>
  );
}

export default Header;
