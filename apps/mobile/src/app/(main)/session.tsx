import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, Alert, ScrollView, Animated, Vibration } from 'react-native';
import { useSessionStore } from '@/stores/session';
import { useAuthStore } from '@/stores/auth';
import { formatDurationHMS } from '@salontalk/shared';
import {
  audioRecorderService,
  speechRecognitionService,
  realtimeService,
  apiService,
  AudioChunk,
  AnalysisUpdate,
  NotificationPayload,
} from '@/services';
import { useSpeechRecognition } from '@/services/SpeechRecognitionService';

interface ConversationItem {
  id: string;
  speaker: 'stylist' | 'customer';
  text: string;
  timestamp: number;
}

interface Notification {
  id: string;
  type: NotificationPayload['type'];
  title: string;
  message: string;
  successTalk?: string;
  recommendedProduct?: string;
  timestamp: number;
  severity?: 'info' | 'warning' | 'critical';
}

export default function SessionScreen() {
  const { user, salon, accessToken } = useAuthStore();
  const {
    currentSession,
    isRecording,
    elapsedTimeMs,
    currentScore,
    talkRatio,
    setCurrentSession,
    setIsRecording,
    setCurrentScore,
    setTalkRatio,
    addSegment,
    addAnalysisResult,
    reset,
  } = useSessionStore();

  const [customerType, setCustomerType] = useState<'new' | 'repeat'>('repeat');
  const [customerAge, setCustomerAge] = useState<string>('30s');
  const [customerGender, setCustomerGender] = useState<'male' | 'female' | 'other'>('female');
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [detectedConcerns, setDetectedConcerns] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [emotionIndicator, setEmotionIndicator] = useState<'positive' | 'neutral' | 'negative'>('neutral');

  const scrollViewRef = useRef<ScrollView>(null);
  const notificationAnim = useRef(new Animated.Value(0)).current;
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition event listeners
  useSpeechRecognition();

  // Set API token when auth changes
  useEffect(() => {
    if (accessToken) {
      apiService.setAccessToken(accessToken);
    }
  }, [accessToken]);

  // Subscribe to realtime events
  useEffect(() => {
    const unsubscribeRealtime = realtimeService.addListener((event) => {
      switch (event.type) {
        case 'analysis':
          handleAnalysisUpdate(event.payload);
          break;
        case 'notification':
          handleNotification(event.payload);
          break;
        case 'error':
          console.error('Realtime error:', event.error);
          break;
      }
    });

    return () => {
      unsubscribeRealtime();
    };
  }, []);

  // Subscribe to audio recorder events
  useEffect(() => {
    const unsubscribeRecorder = audioRecorderService.addListener(async (event) => {
      switch (event.type) {
        case 'chunk_complete':
          await handleAudioChunkComplete(event.chunk);
          break;
        case 'error':
          console.error('Recorder error:', event.error);
          Alert.alert('録音エラー', event.error.message);
          break;
      }
    });

    return () => {
      unsubscribeRecorder();
    };
  }, [currentSession]);

  // Elapsed time timer
  useEffect(() => {
    if (isRecording && currentSession) {
      elapsedTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - currentSession.startedAt.getTime();
        useSessionStore.setState({ elapsedTimeMs: elapsed });
      }, 1000);
    } else {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    }

    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
    };
  }, [isRecording, currentSession]);

  const handleAnalysisUpdate = useCallback((analysis: AnalysisUpdate) => {
    setCurrentScore(Math.round(analysis.overallScore));

    if (analysis.indicators.talk_ratio) {
      setTalkRatio({
        stylist: Math.round(analysis.indicators.talk_ratio.value),
        customer: Math.round(100 - analysis.indicators.talk_ratio.value),
      });
    }

    if (analysis.indicators.question_analysis) {
      setQuestionCount(Math.round(analysis.indicators.question_analysis.value));
    }

    if (analysis.indicators.emotion_analysis) {
      const score = analysis.indicators.emotion_analysis.value;
      if (score >= 70) {
        setEmotionIndicator('positive');
      } else if (score <= 40) {
        setEmotionIndicator('negative');
      } else {
        setEmotionIndicator('neutral');
      }
    }

    if (analysis.indicators.concern_keywords.value > 0) {
      // Concerns were detected - this is handled by notifications
    }
  }, [setCurrentScore, setTalkRatio]);

  const handleNotification = useCallback((notification: NotificationPayload) => {
    const newNotification: Notification = {
      id: `notif_${Date.now()}`,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      successTalk: notification.successTalk,
      recommendedProduct: notification.recommendedProduct,
      timestamp: Date.now(),
      severity: notification.severity || 'info',
    };

    setNotifications((prev) => [...prev, newNotification]);
    setCurrentNotification(newNotification);
    setShowNotification(true);

    // Vibrate to alert
    Vibration.vibrate([0, 200, 100, 200]);

    // Animate notification in
    Animated.timing(notificationAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Add detected concerns
    if (notification.type === 'concern_detected' || notification.type === 'proposal_chance') {
      // Extract concerns from message if possible
      const concernMatch = notification.message.match(/「(.+?)」/g);
      if (concernMatch) {
        const newConcerns = concernMatch.map((m) => m.replace(/[「」]/g, ''));
        setDetectedConcerns((prev) => [...new Set([...prev, ...newConcerns])]);
      }
    }

    // Auto-hide after 15 seconds
    setTimeout(() => {
      dismissNotification();
    }, 15000);
  }, [notificationAnim]);

  const dismissNotification = useCallback(() => {
    Animated.timing(notificationAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowNotification(false);
      setCurrentNotification(null);
    });
  }, [notificationAnim]);

  const handleAudioChunkComplete = useCallback(async (chunk: AudioChunk) => {
    if (!currentSession) return;

    try {
      // Process speech recognition for this chunk
      const transcript = await speechRecognitionService.processAudioChunk(
        chunk.uri,
        chunk.chunkIndex
      );

      // Add to conversation log
      const newConversation: ConversationItem = {
        id: `conv_${chunk.chunkIndex}`,
        speaker: 'stylist', // Will be updated by diarization
        text: transcript.text,
        timestamp: chunk.startTimeMs,
      };
      setConversations((prev) => [...prev, newConversation]);

      // Send to server for processing
      await apiService.processAudio({
        sessionId: currentSession.id as string,
        chunkIndex: chunk.chunkIndex,
        audioUri: chunk.uri,
        transcripts: {
          text: transcript.text,
          startTime: chunk.startTimeMs / 1000,
          endTime: chunk.endTimeMs / 1000,
        },
      });

      // Auto-scroll conversation log
      scrollViewRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Error processing audio chunk:', error);
    }
  }, [currentSession]);

  const handleStartSession = async () => {
    if (!user || !salon || isStarting) return;

    setIsStarting(true);

    try {
      // Request permissions
      const hasPermission = await audioRecorderService.requestPermission();
      if (!hasPermission) {
        Alert.alert('権限エラー', 'マイクの使用を許可してください');
        setIsStarting(false);
        return;
      }

      // Create session via API
      const response = await apiService.createSession({
        stylistId: user.id as string,
        customerInfo: {
          ageGroup: customerAge as any,
          gender: customerGender,
          visitFrequency: customerType === 'new' ? 'first' : 'irregular',
        },
      });

      // Create local session object
      const session = {
        id: response.sessionId as any,
        salonId: salon.id,
        stylistId: user.id,
        status: 'recording' as const,
        customerInfo: {
          visitType: customerType,
          ageGroup: customerAge,
          gender: customerGender,
        },
        startedAt: new Date(response.startedAt),
        endedAt: null,
        totalDurationMs: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setCurrentSession(session);
      setIsRecording(true);

      // Subscribe to realtime channel
      await realtimeService.subscribeToSession(response.sessionId);

      // Start audio recording
      await audioRecorderService.startRecording();

      // Start speech recognition
      await speechRecognitionService.start();

      // Reset UI state
      setConversations([]);
      setNotifications([]);
      setDetectedConcerns([]);
      setQuestionCount(0);
      setEmotionIndicator('neutral');
    } catch (error) {
      console.error('Failed to start session:', error);
      Alert.alert('エラー', 'セッションの開始に失敗しました');
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndSession = () => {
    Alert.alert('セッション終了', 'このセッションを終了しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '終了',
        style: 'destructive',
        onPress: confirmEndSession,
      },
    ]);
  };

  const confirmEndSession = async () => {
    if (!currentSession || isEnding) return;

    setIsEnding(true);

    try {
      // Stop recording
      await audioRecorderService.stopRecording();

      // Stop speech recognition
      await speechRecognitionService.stop();

      // End session via API
      await apiService.endSession({
        sessionId: currentSession.id as string,
      });

      // Generate report
      const report = await apiService.generateReport(currentSession.id as string);

      // Unsubscribe from realtime
      await realtimeService.unsubscribe();

      // Update local state
      setIsRecording(false);

      // Show report summary
      Alert.alert(
        'セッション完了',
        `総合スコア: ${report.overallScore}点\n\n良かった点:\n${report.goodPoints.join('\n')}\n\n改善点:\n${report.improvementPoints.join('\n')}`,
        [
          {
            text: 'OK',
            onPress: () => {
              reset();
              setConversations([]);
              setNotifications([]);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to end session:', error);
      Alert.alert('エラー', 'セッションの終了に失敗しました');
    } finally {
      setIsEnding(false);
    }
  };

  const handleReset = () => {
    reset();
    setConversations([]);
    setNotifications([]);
    setDetectedConcerns([]);
  };

  const getEmotionEmoji = () => {
    switch (emotionIndicator) {
      case 'positive':
        return '😊';
      case 'negative':
        return '😟';
      default:
        return '😐';
    }
  };

  // FR-304: Get notification banner colors based on severity
  const getNotificationColors = (severity?: 'info' | 'warning' | 'critical') => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-500',
          title: 'text-red-900',
          message: 'text-red-800',
          accent: 'bg-red-400/50',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500',
          title: 'text-yellow-900',
          message: 'text-yellow-800',
          accent: 'bg-yellow-400/50',
        };
      default: // info
        return {
          bg: 'bg-blue-500',
          title: 'text-blue-900',
          message: 'text-blue-800',
          accent: 'bg-blue-400/50',
        };
    }
  };

  if (!isRecording && !currentSession) {
    // Session setup screen
    return (
      <View className="flex-1 bg-gray-50 p-8">
        <Text className="text-3xl font-bold text-gray-800 mb-8">新規セッション</Text>

        <View className="bg-white rounded-xl p-6 mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">お客様タイプ</Text>
          <View className="flex-row">
            <Pressable
              onPress={() => setCustomerType('new')}
              className={`flex-1 py-4 rounded-lg mr-2 items-center ${
                customerType === 'new' ? 'bg-primary-600' : 'bg-gray-100'
              }`}
            >
              <Text className={customerType === 'new' ? 'text-white font-semibold' : 'text-gray-600'}>
                新規
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setCustomerType('repeat')}
              className={`flex-1 py-4 rounded-lg ml-2 items-center ${
                customerType === 'repeat' ? 'bg-primary-600' : 'bg-gray-100'
              }`}
            >
              <Text className={customerType === 'repeat' ? 'text-white font-semibold' : 'text-gray-600'}>
                リピーター
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="bg-white rounded-xl p-6 mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">年代</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['20s', '30s', '40s', '50s', '60s+'].map((age) => (
              <Pressable
                key={age}
                onPress={() => setCustomerAge(age)}
                className={`px-6 py-3 rounded-full mr-2 ${
                  customerAge === age ? 'bg-primary-600' : 'bg-gray-100'
                }`}
              >
                <Text className={customerAge === age ? 'text-white' : 'text-gray-600'}>
                  {age === '60s+' ? '60代+' : age.replace('s', '代')}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View className="bg-white rounded-xl p-6 mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-4">性別</Text>
          <View className="flex-row">
            {[
              { value: 'female', label: '女性' },
              { value: 'male', label: '男性' },
              { value: 'other', label: 'その他' },
            ].map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setCustomerGender(option.value as any)}
                className={`flex-1 py-3 rounded-lg mx-1 items-center ${
                  customerGender === option.value ? 'bg-primary-600' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={customerGender === option.value ? 'text-white font-semibold' : 'text-gray-600'}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          onPress={handleStartSession}
          disabled={isStarting}
          className={`rounded-xl py-6 items-center ${isStarting ? 'bg-gray-400' : 'bg-primary-600'}`}
        >
          <Text className="text-white text-2xl font-bold">
            {isStarting ? '開始中...' : '🎙️ 録音開始'}
          </Text>
          <Text className="text-white/80 mt-2">タップしてセッションを開始</Text>
        </Pressable>
      </View>
    );
  }

  // Active session screen
  return (
    <View className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between p-6 border-b border-gray-800">
        <View>
          <Text className="text-gray-400">セッション中</Text>
          <Text className="text-white text-4xl font-bold">{formatDurationHMS(elapsedTimeMs)}</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-4 h-4 bg-red-500 rounded-full mr-2" />
          <Text className="text-red-400 font-semibold">録音中</Text>
        </View>
      </View>

      {/* Notification Banner - FR-304: Dynamic colors based on severity */}
      {showNotification && currentNotification && (() => {
        const colors = getNotificationColors(currentNotification.severity);
        return (
          <Animated.View
            style={{
              opacity: notificationAnim,
              transform: [
                {
                  translateY: notificationAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 0],
                  }),
                },
              ],
            }}
            className={`absolute top-24 left-4 right-4 z-50 ${colors.bg} rounded-xl p-4 shadow-lg`}
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <Text className={`${colors.title} font-bold text-lg`}>{currentNotification.title}</Text>
                <Text className={`${colors.message} mt-1`}>{currentNotification.message}</Text>
                {currentNotification.recommendedProduct && (
                  <Text className={`${colors.title} font-semibold mt-2`}>
                    おすすめ: {currentNotification.recommendedProduct}
                  </Text>
                )}
                {currentNotification.successTalk && (
                  <View className={`mt-2 ${colors.accent} rounded-lg p-3`}>
                    <Text className={`${colors.title} text-sm`}>💡 成功トーク例:</Text>
                    <Text className={`${colors.message} mt-1`}>{currentNotification.successTalk}</Text>
                  </View>
                )}
              </View>
              <Pressable onPress={dismissNotification} className="p-1">
                <Text className={`${colors.title} text-2xl`}>×</Text>
              </Pressable>
            </View>
          </Animated.View>
        );
      })()}

      <View className="flex-1 p-4">
        {/* Metrics Grid */}
        <View className="flex-row mb-4">
          {/* Score Card */}
          <View className="flex-1 bg-gray-800 rounded-xl p-4 mr-2">
            <Text className="text-gray-400 text-sm mb-1">総合スコア</Text>
            <Text className="text-white text-5xl font-bold">{currentScore ?? '--'}</Text>
          </View>

          {/* Talk Ratio Card */}
          <View className="flex-1 bg-gray-800 rounded-xl p-4 mx-1">
            <Text className="text-gray-400 text-sm mb-2">トーク比率</Text>
            <View className="flex-row items-center mb-1">
              <Text className="text-primary-400 text-xs">あなた</Text>
              <Text className="text-white text-sm ml-auto">{talkRatio?.stylist ?? 0}%</Text>
            </View>
            <View className="h-2 bg-gray-700 rounded-full mb-2">
              <View
                className="h-2 bg-primary-500 rounded-full"
                style={{ width: `${talkRatio?.stylist ?? 0}%` }}
              />
            </View>
            <View className="flex-row items-center mb-1">
              <Text className="text-green-400 text-xs">お客様</Text>
              <Text className="text-white text-sm ml-auto">{talkRatio?.customer ?? 0}%</Text>
            </View>
            <View className="h-2 bg-gray-700 rounded-full">
              <View
                className="h-2 bg-green-500 rounded-full"
                style={{ width: `${talkRatio?.customer ?? 0}%` }}
              />
            </View>
          </View>

          {/* Stats Card */}
          <View className="flex-1 bg-gray-800 rounded-xl p-4 ml-2">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-gray-400 text-sm">質問数</Text>
              <Text className="text-white text-xl font-bold">{questionCount}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-400 text-sm">感情</Text>
              <Text className="text-3xl">{getEmotionEmoji()}</Text>
            </View>
          </View>
        </View>

        {/* Detected Concerns */}
        {detectedConcerns.length > 0 && (
          <View className="mb-4">
            <Text className="text-gray-400 text-sm mb-2">検出された悩み:</Text>
            <View className="flex-row flex-wrap">
              {detectedConcerns.map((concern, index) => (
                <View key={index} className="bg-yellow-600 rounded-full px-3 py-1 mr-2 mb-2">
                  <Text className="text-white text-sm">{concern}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Conversation Log */}
        <View className="flex-1 bg-gray-800 rounded-xl p-4 mb-4">
          <Text className="text-gray-400 text-sm mb-3">会話ログ</Text>
          <ScrollView ref={scrollViewRef} className="flex-1">
            {conversations.length === 0 ? (
              <Text className="text-gray-500 text-center mt-8">
                会話内容がここに表示されます...
              </Text>
            ) : (
              conversations.map((item) => (
                <View
                  key={item.id}
                  className={`mb-3 ${item.speaker === 'stylist' ? 'items-start' : 'items-end'}`}
                >
                  <View className="flex-row items-center mb-1">
                    <Text className={`text-xs ${item.speaker === 'stylist' ? 'text-primary-400' : 'text-green-400'}`}>
                      {item.speaker === 'stylist' ? '👤 スタイリスト' : '💇 お客様'}
                    </Text>
                    <Text className="text-gray-500 text-xs ml-2">
                      {formatDurationHMS(item.timestamp)}
                    </Text>
                  </View>
                  <View
                    className={`rounded-xl px-4 py-2 max-w-[80%] ${
                      item.speaker === 'stylist' ? 'bg-primary-600' : 'bg-gray-700'
                    }`}
                  >
                    <Text className="text-white">{item.text}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* End Session Button */}
        <Pressable
          onPress={handleEndSession}
          disabled={isEnding}
          className={`rounded-xl py-4 items-center ${isEnding ? 'bg-gray-600' : 'bg-red-600'}`}
        >
          <Text className="text-white text-xl font-semibold">
            {isEnding ? '終了処理中...' : '⏹ セッション終了'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
