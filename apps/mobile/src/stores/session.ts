import { create } from 'zustand';
import type { Session, SpeakerSegment, AnalysisResult } from '@salontalk/shared';

interface SessionState {
  // Current session
  currentSession: Session | null;
  isRecording: boolean;
  elapsedTimeMs: number;

  // Segments & Analysis
  segments: SpeakerSegment[];
  analysisResults: AnalysisResult[];

  // Real-time scores
  currentScore: number | null;
  talkRatio: { stylist: number; customer: number } | null;

  // Actions
  startSession: (session: Session) => void;
  endSession: () => void;
  updateElapsedTime: (ms: number) => void;
  addSegment: (segment: SpeakerSegment) => void;
  addAnalysisResult: (result: AnalysisResult) => void;
  updateScore: (score: number) => void;
  updateTalkRatio: (stylist: number, customer: number) => void;
  reset: () => void;

  // Direct setters
  setCurrentSession: (session: Session | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  setCurrentScore: (score: number | null) => void;
  setTalkRatio: (talkRatio: { stylist: number; customer: number } | null) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSession: null,
  isRecording: false,
  elapsedTimeMs: 0,
  segments: [],
  analysisResults: [],
  currentScore: null,
  talkRatio: null,

  startSession: (session: Session) => {
    set({
      currentSession: session,
      isRecording: true,
      elapsedTimeMs: 0,
      segments: [],
      analysisResults: [],
      currentScore: null,
      talkRatio: null,
    });
  },

  endSession: () => {
    set({
      isRecording: false,
    });
  },

  updateElapsedTime: (ms: number) => {
    set({ elapsedTimeMs: ms });
  },

  addSegment: (segment: SpeakerSegment) => {
    set((state) => ({
      segments: [...state.segments, segment],
    }));
  },

  addAnalysisResult: (result: AnalysisResult) => {
    set((state) => ({
      analysisResults: [...state.analysisResults, result],
      currentScore: result.overallScore,
    }));
  },

  updateScore: (score: number) => {
    set({ currentScore: score });
  },

  updateTalkRatio: (stylist: number, customer: number) => {
    set({ talkRatio: { stylist, customer } });
  },

  reset: () => {
    set({
      currentSession: null,
      isRecording: false,
      elapsedTimeMs: 0,
      segments: [],
      analysisResults: [],
      currentScore: null,
      talkRatio: null,
    });
  },

  // Direct setters
  setCurrentSession: (session) => {
    set({ currentSession: session });
  },

  setIsRecording: (isRecording) => {
    set({ isRecording });
  },

  setCurrentScore: (score) => {
    set({ currentScore: score });
  },

  setTalkRatio: (talkRatio) => {
    set({ talkRatio });
  },
}));
