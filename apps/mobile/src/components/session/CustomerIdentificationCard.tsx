/**
 * CustomerIdentificationCard Component
 *
 * Displays voice print customer identification results during a session.
 * Shows matched customer info, confidence level, and visit history.
 */
import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';

export interface CustomerMatch {
  customer_id: string;
  customer_name: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  is_new_customer: boolean;
  match: {
    similarity: number;
    total_visits: number;
    last_visit_at: string;
  } | null;
}

interface CustomerIdentificationCardProps {
  match: CustomerMatch | null;
  isLoading: boolean;
  isExtracting: boolean;
  onRetry?: () => void;
  error?: string | null;
}

const getConfidenceInfo = (confidence: CustomerMatch['confidence']) => {
  switch (confidence) {
    case 'high':
      return { label: '高確度', color: 'text-green-400', bg: 'bg-green-900/30', icon: '✓' };
    case 'medium':
      return { label: '中確度', color: 'text-yellow-400', bg: 'bg-yellow-900/30', icon: '?' };
    case 'low':
      return { label: '低確度', color: 'text-orange-400', bg: 'bg-orange-900/30', icon: '?' };
    default:
      return { label: '新規', color: 'text-blue-400', bg: 'bg-blue-900/30', icon: '+' };
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export const CustomerIdentificationCard: React.FC<CustomerIdentificationCardProps> = ({
  match,
  isLoading,
  isExtracting,
  onRetry,
  error,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <View className="bg-gray-800 rounded-xl p-4">
        <View className="flex-row items-center">
          <ActivityIndicator size="small" color="#60A5FA" />
          <Text className="text-gray-400 text-sm ml-2">声紋識別中...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="bg-gray-800 rounded-xl p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-red-400 text-sm">声紋識別エラー</Text>
          {onRetry && (
            <Pressable onPress={onRetry} className="bg-gray-700 px-3 py-1 rounded-lg">
              <Text className="text-white text-sm">再試行</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // No match data yet
  if (!match) {
    return null;
  }

  const confidenceInfo = getConfidenceInfo(match.confidence);

  return (
    <View className={`${confidenceInfo.bg} rounded-xl p-4`}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Text className={`text-2xl mr-2`}>
            {match.is_new_customer ? '👤' : '🎉'}
          </Text>
          <View>
            <Text className="text-white font-bold text-lg">
              {match.is_new_customer
                ? '新規のお客様'
                : match.customer_name || 'お名前未取得'}
            </Text>
            {!match.is_new_customer && isExtracting && (
              <View className="flex-row items-center mt-1">
                <ActivityIndicator size="small" color="#9CA3AF" />
                <Text className="text-gray-400 text-xs ml-1">名前を抽出中...</Text>
              </View>
            )}
          </View>
        </View>
        <View className={`px-3 py-1 rounded-full ${confidenceInfo.bg} border border-gray-600`}>
          <Text className={`${confidenceInfo.color} text-sm font-medium`}>
            {confidenceInfo.icon} {confidenceInfo.label}
          </Text>
        </View>
      </View>

      {/* Match details for returning customers */}
      {match.match && !match.is_new_customer && (
        <View className="flex-row mt-2 pt-2 border-t border-gray-700">
          <View className="flex-1">
            <Text className="text-gray-400 text-xs">来店回数</Text>
            <Text className="text-white font-semibold">
              {match.match.total_visits}回目
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-400 text-xs">前回来店</Text>
            <Text className="text-white font-semibold">
              {formatDate(match.match.last_visit_at)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-400 text-xs">一致度</Text>
            <Text className={`${confidenceInfo.color} font-semibold`}>
              {Math.round(match.match.similarity * 100)}%
            </Text>
          </View>
        </View>
      )}

      {/* Message for new customers */}
      {match.is_new_customer && (
        <Text className="text-gray-400 text-sm mt-2">
          初めてのお客様です。会話から名前を自動取得します。
        </Text>
      )}
    </View>
  );
};
