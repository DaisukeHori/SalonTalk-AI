/**
 * useCustomerIdentification Hook
 *
 * Manages voice print customer identification during a session.
 * Extracts voice embedding from audio, matches against existing customers,
 * and extracts customer name from conversation.
 */
import { useState, useCallback, useRef } from 'react';
import {
  apiService,
  MatchCustomerResponse,
  ExtractCustomerNameResponse,
} from '@/services';

interface CustomerIdentificationState {
  customerMatch: MatchCustomerResponse | null;
  isIdentifying: boolean;
  isExtractingName: boolean;
  error: string | null;
  embeddingExtracted: boolean;
}

interface UseCustomerIdentificationReturn extends CustomerIdentificationState {
  identifyCustomer: (audioUri: string, sessionId: string) => Promise<void>;
  extractName: (sessionId: string, customerId: string) => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE: CustomerIdentificationState = {
  customerMatch: null,
  isIdentifying: false,
  isExtractingName: false,
  error: null,
  embeddingExtracted: false,
};

/**
 * Hook for managing customer identification via voice print
 */
export function useCustomerIdentification(): UseCustomerIdentificationReturn {
  const [state, setState] = useState<CustomerIdentificationState>(INITIAL_STATE);
  const identificationAttempted = useRef(false);

  /**
   * Identify customer from audio recording
   */
  const identifyCustomer = useCallback(async (audioUri: string, sessionId: string) => {
    // Prevent multiple identification attempts
    if (identificationAttempted.current) {
      return;
    }
    identificationAttempted.current = true;

    setState((prev) => ({ ...prev, isIdentifying: true, error: null }));

    try {
      // Step 1: Extract voice embedding from audio
      console.log('[CustomerIdentification] Extracting voice embedding...');
      const embeddingResult = await apiService.extractVoiceEmbedding(
        audioUri,
        'customer' // Extract customer's voice
      );

      setState((prev) => ({ ...prev, embeddingExtracted: true }));

      // Step 2: Match customer by voice embedding
      console.log('[CustomerIdentification] Matching customer by voice...');
      const matchResult = await apiService.matchCustomer({
        session_id: sessionId,
        embedding: embeddingResult.embedding,
        threshold: 0.65,
        create_if_not_found: true,
      });

      setState((prev) => ({
        ...prev,
        customerMatch: matchResult,
        isIdentifying: false,
      }));

      console.log('[CustomerIdentification] Customer identified:', {
        isNew: matchResult.is_new_customer,
        confidence: matchResult.confidence,
        name: matchResult.customer_name,
      });
    } catch (error) {
      console.error('[CustomerIdentification] Error:', error);
      setState((prev) => ({
        ...prev,
        isIdentifying: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  /**
   * Extract customer name from conversation
   */
  const extractName = useCallback(async (sessionId: string, customerId: string) => {
    setState((prev) => ({ ...prev, isExtractingName: true }));

    try {
      console.log('[CustomerIdentification] Extracting customer name from conversation...');
      const nameResult = await apiService.extractCustomerName({
        session_id: sessionId,
        customer_id: customerId,
      });

      if (nameResult.name && nameResult.name_updated) {
        // Update local state with extracted name
        setState((prev) => ({
          ...prev,
          customerMatch: prev.customerMatch
            ? { ...prev.customerMatch, customer_name: nameResult.name }
            : null,
          isExtractingName: false,
        }));

        console.log('[CustomerIdentification] Customer name extracted:', nameResult.name);
      } else {
        setState((prev) => ({ ...prev, isExtractingName: false }));
      }
    } catch (error) {
      console.error('[CustomerIdentification] Name extraction error:', error);
      setState((prev) => ({ ...prev, isExtractingName: false }));
    }
  }, []);

  /**
   * Reset identification state
   */
  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    identificationAttempted.current = false;
  }, []);

  return {
    ...state,
    identifyCustomer,
    extractName,
    reset,
  };
}
