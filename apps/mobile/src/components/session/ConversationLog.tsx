/**
 * ConversationLog Component
 * 会話ログ表示コンポーネント
 */
import { View, Text, ScrollView } from 'react-native';
import { forwardRef } from 'react';

type SpeakerType = 'stylist' | 'customer';

interface ConversationItem {
  id: string;
  speaker: SpeakerType;
  text: string;
  timestamp: number; // ms since session start
}

interface ConversationLogProps {
  conversations: ConversationItem[];
  maxHeight?: number;
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const speakerStyles: Record<SpeakerType, { icon: string; label: string; bubbleBg: string; textColor: string; align: string }> = {
  stylist: {
    icon: '👤',
    label: 'スタイリスト',
    bubbleBg: 'bg-indigo-50',
    textColor: 'text-indigo-900',
    align: 'items-start',
  },
  customer: {
    icon: '💇',
    label: 'お客様',
    bubbleBg: 'bg-pink-50',
    textColor: 'text-pink-900',
    align: 'items-end',
  },
};

function ConversationBubble({ item }: { item: ConversationItem }) {
  const style = speakerStyles[item.speaker];

  return (
    <View className={`mb-3 ${style.align}`}>
      <View className="flex-row items-center mb-1">
        <Text className="text-lg mr-1">{style.icon}</Text>
        <Text className="text-gray-500 text-xs mr-2">{style.label}</Text>
        <Text className="text-gray-400 text-xs">{formatTimestamp(item.timestamp)}</Text>
      </View>
      <View className={`max-w-[80%] ${style.bubbleBg} rounded-xl px-3 py-2`}>
        <Text className={`${style.textColor} text-base`}>{item.text}</Text>
      </View>
    </View>
  );
}

export const ConversationLog = forwardRef<ScrollView, ConversationLogProps>(
  ({ conversations, maxHeight = 400 }, ref) => {
    if (conversations.length === 0) {
      return (
        <View className="items-center justify-center py-8">
          <Text className="text-gray-400">会話ログがありません</Text>
        </View>
      );
    }

    return (
      <ScrollView
        ref={ref}
        className="bg-white rounded-xl p-4"
        style={{ maxHeight }}
        showsVerticalScrollIndicator
      >
        {conversations.map((item) => (
          <ConversationBubble key={item.id} item={item} />
        ))}
      </ScrollView>
    );
  }
);

ConversationLog.displayName = 'ConversationLog';

export default ConversationLog;
