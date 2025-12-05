/**
 * Setup Status Hook
 * 初回セットアップの状態を管理するフック
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient, getSession } from '@/lib/supabase';

const SETUP_PROGRESS_KEY = 'setup_progress';

interface SetupProgress {
  current_step: number;
  completed_steps: number[];
  step_data: Record<string, unknown>;
}

interface SetupStatus {
  needs_setup: boolean;
  user_type: 'salon' | 'staff' | 'unknown';
  current_step: number;
  setup_completed: boolean;
  completed_steps: number[];
  step_data: Record<string, unknown>;
}

interface UseSetupReturn {
  status: SetupStatus | null;
  is_loading: boolean;
  error: Error | null;
  check_setup_status: () => Promise<void>;
  save_progress: (progress: Partial<SetupProgress>) => Promise<void>;
  complete_setup: () => Promise<void>;
}

export function useSetup(): UseSetupReturn {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const check_setup_status = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First, try to get session
      const session = await getSession();

      if (!session) {
        setStatus({
          needs_setup: false,
          user_type: 'unknown',
          current_step: 1,
          setup_completed: false,
          completed_steps: [],
          step_data: {},
        });
        setIsLoading(false);
        return;
      }

      const supabase = getSupabaseClient();

      // Try to fetch from API
      try {
        const { data, error: apiError } = await supabase.functions.invoke<SetupStatus>(
          'get-setup-status'
        );

        if (!apiError && data) {
          setStatus(data);
          setIsLoading(false);
          return;
        }
      } catch {
        // API not available, fall back to local storage
      }

      // Fall back to local storage
      const savedProgress = await AsyncStorage.getItem(SETUP_PROGRESS_KEY);
      if (savedProgress) {
        const progress: SetupProgress = JSON.parse(savedProgress);
        setStatus({
          needs_setup: true,
          user_type: 'staff',
          current_step: progress.current_step,
          setup_completed: false,
          completed_steps: progress.completed_steps,
          step_data: progress.step_data,
        });
      } else {
        // Check if staff has setup_completed flag
        const { data: staff } = await supabase
          .from('staffs')
          .select('setup_completed')
          .eq('id', session.user.id)
          .single();

        setStatus({
          needs_setup: !staff?.setup_completed,
          user_type: 'staff',
          current_step: 1,
          setup_completed: staff?.setup_completed ?? false,
          completed_steps: [],
          step_data: {},
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setStatus({
        needs_setup: false,
        user_type: 'unknown',
        current_step: 1,
        setup_completed: false,
        completed_steps: [],
        step_data: {},
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const save_progress = useCallback(async (progress: Partial<SetupProgress>) => {
    try {
      const currentProgress = await AsyncStorage.getItem(SETUP_PROGRESS_KEY);
      const current: SetupProgress = currentProgress
        ? JSON.parse(currentProgress)
        : { current_step: 1, completed_steps: [], step_data: {} };

      const updated: SetupProgress = {
        ...current,
        ...progress,
        step_data: { ...current.step_data, ...progress.step_data },
      };

      await AsyncStorage.setItem(SETUP_PROGRESS_KEY, JSON.stringify(updated));

      // Also try to save to API
      try {
        const supabase = getSupabaseClient();
        await supabase.functions.invoke('save-setup-progress', {
          body: updated,
        });
      } catch {
        // API save failed, but local save succeeded
      }

      setStatus((prev) =>
        prev
          ? {
              ...prev,
              current_step: updated.current_step,
              completed_steps: updated.completed_steps,
              step_data: updated.step_data,
            }
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save progress'));
    }
  }, []);

  const complete_setup = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();

      // Call complete API
      const { error: apiError } = await supabase.functions.invoke('complete-staff-setup', {
        body: status?.step_data || {},
      });

      if (apiError) {
        throw apiError;
      }

      // Clear local progress
      await AsyncStorage.removeItem(SETUP_PROGRESS_KEY);

      setStatus((prev) =>
        prev
          ? {
              ...prev,
              needs_setup: false,
              setup_completed: true,
            }
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to complete setup'));
      throw err;
    }
  }, [status?.step_data]);

  useEffect(() => {
    check_setup_status();
  }, [check_setup_status]);

  return {
    status,
    is_loading,
    error,
    check_setup_status,
    save_progress,
    complete_setup,
  };
}
