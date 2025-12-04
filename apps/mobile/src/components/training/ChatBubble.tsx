/**
 * ChatBubble Component
 * チャットバブルコンポーネント（ロールプレイ用）
 */
import { View, Text } from 'react-native';

type Role = 'customer' | 'stylist';

interface ChatBubbleProps {
  role: Role;
  content: string;
  timestamp?: Date;
  isTyping?: boolean;
}

const roleStyles: Record<Role, { icon: string; label: string; bubbleBg: string; textColor: string; align: string }> = {
  customer: {
    icon: '💇',
    label: 'お客様',
    bubbleBg: 'bg-gray-100',
    textColor: 'text-gray-800',
    align: 'items-start',
  },
  stylist: {
    icon: '👤',
    label: 'あなた',
    bubbleBg: 'bg-indigo-500',
    textColor: 'text-white',
    align: 'items-end',
  },
};

function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function ChatBubble({ role, content, timestamp, isTyping = false }: ChatBubbleProps) {
  const style = roleStyles[role];

  return (
    <View className={`mb-4 ${style.align}`}>
      {/* Header */}
      <View className={`flex-row items-center mb-1 ${role === 'stylist' ? 'flex-row-reverse' : ''}`}>
        <Text className={`text-lg ${role === 'stylist' ? 'ml-1' : 'mr-1'}`}>{style.icon}</Text>
        <Text className="text-gray-500 text-xs">{style.label}</Text>
        {timestamp && (
          <Text className={`text-gray-400 text-xs ${role === 'stylist' ? 'mr-2' : 'ml-2'}`}>
            {formatTime(timestamp)}
          </Text>
        )}
      </View>

      {/* Bubble */}
      <View className={`max-w-[80%] ${style.bubbleBg} rounded-2xl px-4 py-3`}>
        {isTyping ? (
          <View className="flex-row items-center">
            <Text className={`${style.textColor} mr-1`}>•</Text>
            <Text className={`${style.textColor} mr-1`}>•</Text>
            <Text className={style.textColor}>•</Text>
          </View>
        ) : (
          <Text className={`${style.textColor} text-base`}>{content}</Text>
        )}
      </View>
    </View>
  );
}

export function TypingIndicator({ role }: { role: Role }) {
  return <ChatBubble role={role} content="" isTyping />;
}

export default ChatBubble;
