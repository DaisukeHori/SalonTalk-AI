/**
 * useRealtimeAnalysis Hook
 * リアルタイム分析フック
 */
import { useEffect, useState, useCallback } from 'react';
import { realtimeService, AnalysisUpdate, NotificationPayload } from '@/services';

interface RealtimeAnalysisState {
  overallScore: number;
  talkRatio: { stylist: number; customer: number };
  questionCount: number;
  emotion: 'positive' | 'neutral' | 'negative';
  detectedConcerns: string[];
  latestNotification: NotificationPayload | null;
}

export function useRealtimeAnalysis() {
  const [state, setState] = useState<RealtimeAnalysisState>({
    overallScore: 0,
    talkRatio: { stylist: 50, customer: 50 },
    questionCount: 0,
    emotion: 'neutral',
    detectedConcerns: [],
    latestNotification: null,
  });

  const handleAnalysisUpdate = useCallback((analysis: AnalysisUpdate) => {
    setState((prev) => {
      const newState = { ...prev };

      newState.overallScore = Math.round(analysis.overallScore);

      if (analysis.indicators.talk_ratio) {
        const stylistRatio = analysis.indicators.talk_ratio.value;
        newState.talkRatio = {
          stylist: Math.round(stylistRatio),
          customer: Math.round(100 - stylistRatio),
        };
      }

      if (analysis.indicators.question_analysis) {
        newState.questionCount = Math.round(analysis.indicators.question_analysis.value);
      }

      if (analysis.indicators.emotion_analysis) {
        const score = analysis.indicators.emotion_analysis.value;
        if (score >= 70) {
          newState.emotion = 'positive';
        } else if (score <= 40) {
          newState.emotion = 'negative';
        } else {
          newState.emotion = 'neutral';
        }
      }

      return newState;
    });
  }, []);

  const handleNotification = useCallback((notification: NotificationPayload) => {
    setState((prev) => {
      const newState = { ...prev, latestNotification: notification };

      // Extract concerns from notification
      if (notification.type === 'concern_detected' || notification.type === 'proposal_chance') {
        const concernMatch = notification.message.match(/「(.+?)」/g);
        if (concernMatch) {
          const newConcerns = concernMatch.map((m) => m.replace(/[「」]/g, ''));
          newState.detectedConcerns = [...new Set([...prev.detectedConcerns, ...newConcerns])];
        }
      }

      return newState;
    });
  }, []);

  useEffect(() => {
    const unsubscribe = realtimeService.addListener((event) => {
      switch (event.type) {
        case 'analysis':
          handleAnalysisUpdate(event.payload);
          break;
        case 'notification':
          handleNotification(event.payload);
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [handleAnalysisUpdate, handleNotification]);

  const clearNotification = useCallback(() => {
    setState((prev) => ({ ...prev, latestNotification: null }));
  }, []);

  const clearConcerns = useCallback(() => {
    setState((prev) => ({ ...prev, detectedConcerns: [] }));
  }, []);

  return {
    ...state,
    clearNotification,
    clearConcerns,
  };
}

export default useRealtimeAnalysis;
