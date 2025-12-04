/**
 * useSession Hook
 * セッション管理フック
 */
import { useCallback } from 'react';
import { useSessionStore } from '@/stores/session';
import { useAuthStore } from '@/stores/auth';
import { apiService, realtimeService, audioRecorderService, speechRecognitionService } from '@/services';

interface CustomerInfo {
  ageGroup?: string;
  gender?: 'male' | 'female' | 'other';
  visitType: 'new' | 'repeat';
  notes?: string;
}

export function useSession() {
  const { user } = useAuthStore();
  const {
    currentSession,
    isRecording,
    elapsedTimeMs,
    currentScore,
    talkRatio,
    segments,
    analysisResults,
    setCurrentSession,
    setIsRecording,
    setCurrentScore,
    setTalkRatio,
    addSegment,
    addAnalysisResult,
    reset,
  } = useSessionStore();

  const startSession = useCallback(
    async (customerInfo?: CustomerInfo) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      try {
        // Create session via API
        const session = await apiService.createSession({
          stylistId: user.id,
          customerInfo,
        });

        setCurrentSession({
          id: session.sessionId,
          status: session.status,
          startedAt: new Date(session.startedAt),
          realtimeChannel: session.realtimeChannel,
        });

        // Connect to realtime channel
        await realtimeService.connect(session.realtimeChannel);

        // Start audio recording
        await audioRecorderService.start();

        // Start speech recognition
        await speechRecognitionService.start();

        setIsRecording(true);

        return session;
      } catch (error) {
        console.error('Failed to start session:', error);
        reset();
        throw error;
      }
    },
    [user, setCurrentSession, setIsRecording, reset]
  );

  const endSession = useCallback(async () => {
    if (!currentSession) {
      throw new Error('No active session');
    }

    try {
      // Stop recording
      audioRecorderService.stop();
      speechRecognitionService.stop();
      setIsRecording(false);

      // End session via API (report generation is triggered asynchronously)
      const response = await apiService.endSession({ sessionId: currentSession.id });

      // Disconnect realtime
      realtimeService.disconnect();

      // Reset session state
      reset();

      return response;
    } catch (error) {
      console.error('Failed to end session:', error);
      throw error;
    }
  }, [currentSession, setIsRecording, reset]);

  const cancelSession = useCallback(async () => {
    try {
      audioRecorderService.stop();
      speechRecognitionService.stop();
      realtimeService.disconnect();
      reset();
    } catch (error) {
      console.error('Failed to cancel session:', error);
    }
  }, [reset]);

  return {
    currentSession,
    isRecording,
    elapsedTimeMs,
    currentScore,
    talkRatio,
    segments,
    analysisResults,
    startSession,
    endSession,
    cancelSession,
    setCurrentScore,
    setTalkRatio,
    addSegment,
    addAnalysisResult,
  };
}

export default useSession;
