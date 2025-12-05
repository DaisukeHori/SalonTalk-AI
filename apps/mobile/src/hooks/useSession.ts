/**
 * useSession Hook
 * セッション管理フック
 */
import { useCallback } from 'react';
import { useSessionStore } from '@/stores/session';
import { useAuthStore } from '@/stores/auth';
import { apiService, realtimeService, audioRecorderService, speechRecognitionService } from '@/services';

interface CustomerInfo {
  age_group?: '10s' | '20s' | '30s' | '40s' | '50s' | '60s+';
  gender?: 'male' | 'female' | 'other';
  visit_type: 'new' | 'repeat';
  visit_frequency?: 'first' | 'monthly' | 'bimonthly' | 'quarterly' | 'irregular';
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
          stylist_id: user.id,
          customer_info: customerInfo,
        });

        setCurrentSession({
          id: session.session_id,
          status: session.status,
          startedAt: new Date(session.started_at),
          realtimeChannel: session.realtime_channel,
        });

        // Connect to realtime channel
        await realtimeService.subscribeToSession(session.session_id);

        // Start audio recording
        await audioRecorderService.startRecording();

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
      await audioRecorderService.stopRecording();
      await speechRecognitionService.stop();
      setIsRecording(false);

      // End session via API (report generation is triggered asynchronously)
      const response = await apiService.endSession({ session_id: currentSession.id });

      // Disconnect realtime
      await realtimeService.unsubscribe();

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
      await audioRecorderService.stopRecording();
      await speechRecognitionService.stop();
      await realtimeService.unsubscribe();
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
