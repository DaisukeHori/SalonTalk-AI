/**
 * ProposalNotification Component
 * 提案通知コンポーネント
 */
import { View, Text, Pressable, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

type NotificationType = 'concern_detected' | 'proposal_chance' | 'score_alert' | 'info';

interface ProposalNotificationProps {
  visible: boolean;
  type: NotificationType;
  title: string;
  message: string;
  successTalk?: string;
  recommendedProduct?: string;
  onClose: () => void;
  autoHideDuration?: number; // ms, 0 = no auto hide
}

const typeStyles: Record<NotificationType, { icon: string; borderColor: string; bgColor: string }> = {
  concern_detected: {
    icon: '🎯',
    borderColor: 'border-orange-400',
    bgColor: 'bg-orange-50',
  },
  proposal_chance: {
    icon: '💡',
    borderColor: 'border-green-400',
    bgColor: 'bg-green-50',
  },
  score_alert: {
    icon: '⚠️',
    borderColor: 'border-yellow-400',
    bgColor: 'bg-yellow-50',
  },
  info: {
    icon: 'ℹ️',
    borderColor: 'border-blue-400',
    bgColor: 'bg-blue-50',
  },
};

export function ProposalNotification({
  visible,
  type,
  title,
  message,
  successTalk,
  recommendedProduct,
  onClose,
  autoHideDuration = 15000,
}: ProposalNotificationProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      if (autoHideDuration > 0) {
        const timer = setTimeout(() => {
          onClose();
        }, autoHideDuration);
        return () => clearTimeout(timer);
      }
      return undefined;
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      return undefined;
    }
  }, [visible, autoHideDuration, fadeAnim, translateY, onClose]);

  if (!visible) return null;

  const style = typeStyles[type];

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY }],
      }}
      className={`
        mx-4
        my-2
        rounded-xl
        border-l-4
        ${style.borderColor}
        ${style.bgColor}
        shadow-lg
      `}
    >
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1">
            <Text className="text-xl mr-2">{style.icon}</Text>
            <Text className="text-gray-900 font-bold text-lg flex-1">{title}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text className="text-gray-400 text-xl">✕</Text>
          </Pressable>
        </View>

        {/* Message */}
        <Text className="text-gray-700 mb-3">{message}</Text>

        {/* Recommended Product */}
        {recommendedProduct && (
          <View className="mb-3">
            <Text className="text-gray-500 text-sm mb-1">▶ 推奨商品</Text>
            <Text className="text-indigo-600 font-medium">{recommendedProduct}</Text>
          </View>
        )}

        {/* Success Talk Example */}
        {successTalk && (
          <View className="bg-white/60 rounded-lg p-3">
            <Text className="text-gray-500 text-sm mb-1">💡 成功トーク例：</Text>
            <Text className="text-gray-800 italic">「{successTalk}」</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default ProposalNotification;
