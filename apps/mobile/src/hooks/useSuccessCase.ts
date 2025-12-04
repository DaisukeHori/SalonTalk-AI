/**
 * useSuccessCase Hook
 * 成功事例検索フック
 */
import { useState, useCallback } from 'react';
import { apiService } from '@/services';

interface SuccessCase {
  id: string;
  concernKeywords: string[];
  approachText: string;
  result: string;
  similarity: number;
  conversionRate?: number;
}

interface SearchParams {
  concerns: string[];
  customerProfile?: {
    ageGroup?: string;
    gender?: string;
  };
  limit?: number;
}

export function useSuccessCase() {
  const [cases, setCases] = useState<SuccessCase[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCases = useCallback(async (params: SearchParams) => {
    setIsSearching(true);
    setError(null);

    try {
      const response = await apiService.searchSuccessCases(
        params.concerns,
        params.customerProfile
      );

      setCases(response.cases);
      return response.cases;
    } catch (err) {
      const message = err instanceof Error ? err.message : '検索に失敗しました';
      setError(message);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearCases = useCallback(() => {
    setCases([]);
    setError(null);
  }, []);

  const getTopCase = useCallback(() => {
    return cases.length > 0 ? cases[0] : null;
  }, [cases]);

  const getCaseBySimilarity = useCallback(
    (minSimilarity: number) => {
      return cases.filter((c) => c.similarity >= minSimilarity);
    },
    [cases]
  );

  return {
    cases,
    isSearching,
    error,
    searchCases,
    clearCases,
    getTopCase,
    getCaseBySimilarity,
  };
}

export default useSuccessCase;
