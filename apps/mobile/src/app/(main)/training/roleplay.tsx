/**
 * Roleplay Screen
 * AIロールプレイ画面
 */
import { View, Text, TextInput, FlatList, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Header, Loading, Button, Modal } from '@/components/common';
import { ChatBubble, TypingIndicator, EvaluationResult } from '@/components/training';
import { apiService } from '@/services';

interface Message {
  id: string;
  role: 'customer' | 'stylist';
  content: string;
  timestamp: Date;
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  customerPersona: {
    name: string;
    ageGroup: string;
    personality: string;
    hairConcerns: string[];
  };
  objectives: string[];
}

interface Evaluation {
  overallScore: number;
  feedback: string;
  improvements: string[];
  modelAnswers?: Array<{
    situation: string;
    yourResponse: string;
    modelAnswer: string;
    reasoning: string;
  }>;
}

export default function RoleplayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scenarioId: string }>();

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Load scenario and start session
  useEffect(() => {
    if (params.scenarioId) {
      startRoleplay(params.scenarioId);
    }
  }, [params.scenarioId]);

  const startRoleplay = async (scenarioId: string) => {
    try {
      // Fetch scenario details
      const scenarioData = await apiService.getTrainingScenario(scenarioId);
      setScenario(scenarioData);

      // Start roleplay session
      const session = await apiService.startRoleplay(scenarioId);
      setSessionId(session.id);

      // Add initial customer message
      if (session.initialMessage) {
        setMessages([
          {
            id: `msg_${Date.now()}`,
            role: 'customer',
            content: session.initialMessage,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to start roleplay:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !sessionId || isSending) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'stylist',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsSending(true);
    setIsTyping(true);

    try {
      const response = await apiService.sendRoleplayMessage(sessionId, userMessage.content);

      setIsTyping(false);

      const aiMessage: Message = {
        id: `msg_${Date.now()}_ai`,
        role: 'customer',
        content: response.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Check if conversation should end
      if (response.shouldEnd) {
        handleEndRoleplay();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsTyping(false);
    } finally {
      setIsSending(false);
    }
  }, [inputText, sessionId, isSending]);

  const handleEndRoleplay = async () => {
    if (!sessionId) return;

    setShowEndConfirm(false);
    setIsLoading(true);

    try {
      const result = await apiService.endRoleplay(sessionId);
      setEvaluation(result);
      setShowEvaluation(true);
    } catch (error) {
      console.error('Failed to end roleplay:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExit = () => {
    router.back();
  };

  if (isLoading && !scenario) {
    return (
      <View className="flex-1 bg-gray-50">
        <Loading fullScreen message="シナリオを読み込み中..." />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Header
        title={scenario?.title || 'ロールプレイ'}
        showBack
        onBack={() => setShowEndConfirm(true)}
        rightContent={
          <Pressable
            onPress={() => setShowEndConfirm(true)}
            className="px-3 py-1 bg-red-100 rounded-lg"
          >
            <Text className="text-red-600 font-medium">終了</Text>
          </Pressable>
        }
      />

      {/* Scenario Info */}
      {scenario && (
        <View className="bg-white px-4 py-3 border-b border-gray-100">
          <View className="flex-row items-center mb-1">
            <Text className="text-lg mr-2">💇</Text>
            <Text className="text-gray-700 font-medium">
              {scenario.customerPersona.name}（{scenario.customerPersona.ageGroup}）
            </Text>
          </View>
          <Text className="text-gray-500 text-sm">
            悩み: {scenario.customerPersona.hairConcerns.join('、')}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={100}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          renderItem={({ item }) => (
            <ChatBubble
              role={item.role}
              content={item.content}
              timestamp={item.timestamp}
            />
          )}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListFooterComponent={isTyping ? <TypingIndicator role="customer" /> : null}
        />

        {/* Input Area */}
        <View className="bg-white border-t border-gray-200 p-4 flex-row items-center">
          <TextInput
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 mr-3 text-base"
            placeholder="メッセージを入力..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isSending}
          />
          <Pressable
            onPress={sendMessage}
            disabled={!inputText.trim() || isSending}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              inputText.trim() && !isSending ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <Text className="text-white text-lg">↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* End Confirmation Modal */}
      <Modal
        visible={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        title="ロールプレイを終了しますか？"
      >
        <Text className="text-gray-600 mb-4">
          終了すると、AIによる評価とフィードバックが表示されます。
        </Text>
        <View className="flex-row justify-end space-x-3">
          <Button variant="secondary" onPress={() => setShowEndConfirm(false)}>
            キャンセル
          </Button>
          <Button variant="primary" onPress={handleEndRoleplay} loading={isLoading}>
            終了して評価を見る
          </Button>
        </View>
      </Modal>

      {/* Evaluation Modal */}
      <Modal
        visible={showEvaluation}
        onClose={handleExit}
        title="評価結果"
        size="lg"
      >
        {evaluation && (
          <EvaluationResult
            overallScore={evaluation.overallScore}
            feedback={evaluation.feedback}
            improvements={evaluation.improvements}
            modelAnswers={evaluation.modelAnswers}
          />
        )}
        <View className="mt-4">
          <Button fullWidth onPress={handleExit}>
            完了
          </Button>
        </View>
      </Modal>
    </View>
  );
}
