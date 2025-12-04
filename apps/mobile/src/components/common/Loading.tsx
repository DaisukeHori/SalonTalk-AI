/**
 * Loading Component
 * ローディング表示コンポーネント
 */
import { View, Text, ActivityIndicator } from 'react-native';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
  overlay?: boolean;
}

export function Loading({
  message,
  size = 'large',
  fullScreen = false,
  overlay = false,
}: LoadingProps) {
  const content = (
    <View className="items-center justify-center p-4">
      <ActivityIndicator size={size} color="#6366F1" />
      {message && (
        <Text className="text-gray-600 mt-3 text-center">{message}</Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View
        className={`
          flex-1
          items-center
          justify-center
          ${overlay ? 'absolute inset-0 bg-black/50' : 'bg-gray-50'}
        `}
      >
        <View className={overlay ? 'bg-white rounded-xl p-6' : ''}>
          {content}
        </View>
      </View>
    );
  }

  return content;
}

export function LoadingScreen({ message = '読み込み中...' }: { message?: string }) {
  return <Loading message={message} fullScreen />;
}

export function LoadingOverlay({ message = '処理中...' }: { message?: string }) {
  return <Loading message={message} fullScreen overlay />;
}

export default Loading;
