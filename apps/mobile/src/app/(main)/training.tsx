import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { apiService, RoleplayMessage } from '@/services';

interface Message {
  role: 'customer' | 'stylist';
  content: string;
  timestamp: Date;
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  customerPersona: {
    name: string;
    ageGroup: string;
    hairConcerns: string[];
  };
}

interface Evaluation {
  overallScore: number;
  feedback: string;
  improvements: string[];
  modelAnswer: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: '1',
    title: '髪のパサつきが気になるお客様',
    description: '乾燥・パサつきに悩む30代女性への商品提案',
    difficulty: 'beginner',
    customerPersona: {
      name: '佐藤さん',
      ageGroup: '30代',
      hairConcerns: ['乾燥', 'パサつき'],
    },
  },
  {
    id: '2',
    title: '価格を気にされるお客様',
    description: '「高い」と言われた時の対応練習',
    difficulty: 'intermediate',
    customerPersona: {
      name: '田中さん',
      ageGroup: '40代',
      hairConcerns: ['白髪', 'ツヤ不足'],
    },
  },
  {
    id: '3',
    title: '他製品を使っているお客様',
    description: '既存製品からの切り替え提案',
    difficulty: 'advanced',
    customerPersona: {
      name: '山田さん',
      ageGroup: '35歳',
      hairConcerns: ['ダメージ', '広がり'],
    },
  },
];

const DIFFICULTY_COLORS = {
  beginner: { bg: 'bg-green-100', text: 'text-green-700', label: '初級' },
  intermediate: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '中級' },
  advanced: { bg: 'bg-red-100', text: 'text-red-700', label: '上級' },
};

function ScenarioCard({
  scenario,
  onSelect,
}: {
  scenario: Scenario;
  onSelect: () => void;
}) {
  const diffStyle = DIFFICULTY_COLORS[scenario.difficulty];

  return (
    <Pressable onPress={onSelect} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-gray-800 font-bold text-lg flex-1">{scenario.title}</Text>
        <View className={`${diffStyle.bg} px-2 py-1 rounded`}>
          <Text className={`${diffStyle.text} text-xs font-medium`}>{diffStyle.label}</Text>
        </View>
      </View>
      <Text className="text-gray-500 mb-2">{scenario.description}</Text>
      <View className="flex-row flex-wrap">
        {scenario.customerPersona.hairConcerns.map((concern, index) => (
          <View key={index} className="bg-gray-100 rounded-full px-2 py-0.5 mr-2">
            <Text className="text-gray-600 text-xs">{concern}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isCustomer = message.role === 'customer';

  return (
    <View className={`mb-3 ${isCustomer ? 'items-start' : 'items-end'}`}>
      <View className="flex-row items-end max-w-[80%]">
        {isCustomer && (
          <View className="w-8 h-8 bg-gray-300 rounded-full items-center justify-center mr-2">
            <Text>👤</Text>
          </View>
        )}
        <View
          className={`rounded-2xl px-4 py-2 ${
            isCustomer ? 'bg-gray-100 rounded-bl-none' : 'bg-primary-600 rounded-br-none'
          }`}
        >
          <Text className={isCustomer ? 'text-gray-800' : 'text-white'}>{message.content}</Text>
        </View>
        {!isCustomer && (
          <View className="w-8 h-8 bg-primary-200 rounded-full items-center justify-center ml-2">
            <Text>✂️</Text>
          </View>
        )}
      </View>
      <Text className={`text-gray-400 text-xs mt-1 ${isCustomer ? 'ml-10' : 'mr-10'}`}>
        {isCustomer ? 'お客様' : 'あなた'}
      </Text>
    </View>
  );
}

function EvaluationView({
  evaluation,
  onRetry,
  onFinish,
}: {
  evaluation: Evaluation;
  onRetry: () => void;
  onFinish: () => void;
}) {
  const scoreColor =
    evaluation.overallScore >= 80
      ? 'text-green-600'
      : evaluation.overallScore >= 60
      ? 'text-primary-600'
      : 'text-orange-500';

  return (
    <View className="flex-1 bg-gray-50 p-6">
      <View className="items-center mb-6">
        <Text className="text-gray-500 mb-2">トレーニング結果</Text>
        <Text className={`text-6xl font-bold ${scoreColor}`}>{evaluation.overallScore}</Text>
        <Text className="text-gray-400">点</Text>
      </View>

      <View className="bg-white rounded-xl p-4 mb-4">
        <Text className="text-gray-800 font-bold mb-2">📝 フィードバック</Text>
        <Text className="text-gray-600">{evaluation.feedback}</Text>
      </View>

      <View className="bg-orange-50 rounded-xl p-4 mb-4">
        <Text className="text-orange-800 font-bold mb-2">📈 改善ポイント</Text>
        {evaluation.improvements.map((item, index) => (
          <View key={index} className="flex-row mb-1">
            <Text className="text-orange-600 mr-2">•</Text>
            <Text className="text-orange-800 flex-1">{item}</Text>
          </View>
        ))}
      </View>

      <View className="bg-primary-50 rounded-xl p-4 mb-6">
        <Text className="text-primary-800 font-bold mb-2">💡 模範解答</Text>
        <Text className="text-primary-700 italic">「{evaluation.modelAnswer}」</Text>
      </View>

      <Pressable onPress={onRetry} className="bg-primary-600 rounded-xl p-4 mb-3">
        <Text className="text-white text-center font-bold">もう一度挑戦する</Text>
      </Pressable>
      <Pressable onPress={onFinish} className="bg-gray-200 rounded-xl p-4">
        <Text className="text-gray-700 text-center font-bold">シナリオ選択に戻る</Text>
      </Pressable>
    </View>
  );
}

export default function TrainingScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  // Start conversation when scenario is selected
  useEffect(() => {
    if (selectedScenario) {
      // Initial customer message
      const initialMessages: Message[] = [
        {
          role: 'customer',
          content: `最近、髪の${selectedScenario.customerPersona.hairConcerns[0]}が気になっていて...`,
          timestamp: new Date(),
        },
      ];
      setMessages(initialMessages);
    }
  }, [selectedScenario]);

  // Auto scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading || !selectedScenario) return;

    const userMessage: Message = {
      role: 'stylist',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setHint(null);

    try {
      // Convert messages to API format
      const conversationHistory: RoleplayMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      }));

      // Call roleplay-chat API
      const response = await apiService.roleplayChat({
        scenario_id: selectedScenario.id,
        user_message: userMessage.content,
        conversation_history: conversationHistory,
      });

      const aiResponse: Message = {
        role: 'customer',
        content: response.ai_response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiResponse]);

      // Show hint if provided
      if (response.hint) {
        setHint(response.hint);
      }

      // Show evaluation if conversation is complete
      if (response.is_completed && response.evaluation) {
        setTimeout(() => {
          setEvaluation({
            overallScore: response.evaluation!.overall_score,
            feedback: response.evaluation!.feedback,
            improvements: response.evaluation!.improvements,
            modelAnswer: response.evaluation!.model_answer,
          });
        }, 500);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Show error to user
      setHint('エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setEvaluation(null);
    setMessages([]);
    if (selectedScenario) {
      setMessages([
        {
          role: 'customer',
          content: `最近、髪の${selectedScenario.customerPersona.hairConcerns[0]}が気になっていて...`,
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleFinish = () => {
    setSelectedScenario(null);
    setMessages([]);
    setEvaluation(null);
  };

  // Show evaluation screen
  if (evaluation) {
    return (
      <EvaluationView evaluation={evaluation} onRetry={handleRetry} onFinish={handleFinish} />
    );
  }

  // Show scenario selection
  if (!selectedScenario) {
    return (
      <ScrollView className="flex-1 bg-gray-50">
        <View className="p-6">
          <Text className="text-3xl font-bold text-gray-800 mb-2">トレーニング</Text>
          <Text className="text-gray-500 mb-6">
            AIがお客様役となって、接客の練習ができます
          </Text>

          <Text className="text-xl font-bold text-gray-800 mb-4">シナリオを選択</Text>
          {SCENARIOS.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onSelect={() => setSelectedScenario(scenario)}
            />
          ))}

          <Pressable onPress={() => router.back()} className="bg-gray-200 rounded-xl p-4 mt-4">
            <Text className="text-gray-700 text-center font-bold">戻る</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // Show chat interface
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50"
    >
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <Pressable onPress={handleFinish} className="mr-3">
            <Text className="text-primary-600 text-lg">✕</Text>
          </Pressable>
          <View className="flex-1">
            <Text className="text-gray-800 font-bold">{selectedScenario.title}</Text>
            <Text className="text-gray-500 text-sm">
              {selectedScenario.customerPersona.name}（{selectedScenario.customerPersona.ageGroup}）
            </Text>
          </View>
        </View>
      </View>

      {/* Hint Banner */}
      {hint && (
        <View className="bg-yellow-50 px-4 py-2 border-b border-yellow-200">
          <Text className="text-yellow-800 text-sm">💡 ヒント: {hint}</Text>
        </View>
      )}

      {/* Messages */}
      <ScrollView ref={scrollViewRef} className="flex-1 px-4 py-4">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}
        {isLoading && (
          <View className="items-start mb-3">
            <View className="flex-row items-end">
              <View className="w-8 h-8 bg-gray-300 rounded-full items-center justify-center mr-2">
                <Text>👤</Text>
              </View>
              <View className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-2">
                <Text className="text-gray-500">入力中...</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View className="bg-white px-4 py-3 border-t border-gray-200">
        <View className="flex-row items-center">
          <TextInput
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 mr-2"
            placeholder="メッセージを入力..."
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            editable={!isLoading}
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              inputText.trim() && !isLoading ? 'bg-primary-600' : 'bg-gray-300'
            }`}
          >
            <Text className="text-white text-lg">↑</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
