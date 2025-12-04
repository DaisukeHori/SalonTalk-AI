/**
 * Analysis Store
 * 分析結果の状態管理
 */
import { create } from 'zustand';

interface IndicatorScore {
  score: number;
  value: number;
  details?: string;
}

interface AnalysisResult {
  id: string;
  sessionId: string;
  chunkIndex: number;
  overallScore: number;
  indicators: {
    talk_ratio?: IndicatorScore;
    question_analysis?: IndicatorScore;
    emotion_analysis?: IndicatorScore;
    concern_keywords?: IndicatorScore;
    proposal_timing?: IndicatorScore;
    proposal_quality?: IndicatorScore;
    conversion?: IndicatorScore;
  };
  suggestions: string[];
  highlights: string[];
  createdAt: Date;
}

interface AnalysisState {
  results: AnalysisResult[];
  latestResult: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  addResult: (result: AnalysisResult) => void;
  setResults: (results: AnalysisResult[]) => void;
  clearResults: () => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Selectors
  getAverageScore: () => number;
  getIndicatorTrend: (indicator: keyof AnalysisResult['indicators']) => number[];
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  results: [],
  latestResult: null,
  isLoading: false,
  error: null,

  addResult: (result) =>
    set((state) => ({
      results: [...state.results, result],
      latestResult: result,
    })),

  setResults: (results) =>
    set({
      results,
      latestResult: results.length > 0 ? results[results.length - 1] : null,
    }),

  clearResults: () =>
    set({
      results: [],
      latestResult: null,
      error: null,
    }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  getAverageScore: () => {
    const { results } = get();
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, r) => acc + r.overallScore, 0);
    return Math.round(sum / results.length);
  },

  getIndicatorTrend: (indicator) => {
    const { results } = get();
    return results
      .filter((r) => r.indicators[indicator])
      .map((r) => r.indicators[indicator]!.score);
  },
}));

export default useAnalysisStore;
