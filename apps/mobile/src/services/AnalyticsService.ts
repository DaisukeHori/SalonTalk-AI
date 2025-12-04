/**
 * AnalyticsService
 * アナリティクスサービス
 */
import { Platform } from 'react-native';

type EventName =
  | 'session_start'
  | 'session_end'
  | 'session_error'
  | 'report_view'
  | 'training_start'
  | 'training_end'
  | 'login'
  | 'logout'
  | 'concern_detected'
  | 'proposal_shown'
  | 'app_open'
  | 'screen_view';

interface EventParams {
  [key: string]: string | number | boolean | undefined;
}

interface UserProperties {
  user_id?: string;
  salon_id?: string;
  role?: string;
  platform?: string;
}

class AnalyticsService {
  private isEnabled: boolean = true;
  private userId: string | null = null;
  private userProperties: UserProperties = {};

  initialize(): void {
    // In a real app, initialize analytics SDK here (e.g., Firebase Analytics, Amplitude)
    console.log('[Analytics] Initialized');
    this.userProperties.platform = Platform.OS;
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  setUserId(userId: string | null): void {
    this.userId = userId;
    if (userId) {
      this.userProperties.user_id = userId;
    } else {
      delete this.userProperties.user_id;
    }
    this.logEvent('login', { user_id: userId || 'anonymous' });
  }

  setUserProperties(properties: UserProperties): void {
    this.userProperties = { ...this.userProperties, ...properties };
    // In a real app, set user properties in analytics SDK
    console.log('[Analytics] Set user properties:', this.userProperties);
  }

  logEvent(eventName: EventName, params?: EventParams): void {
    if (!this.isEnabled) return;

    const eventData = {
      event: eventName,
      timestamp: new Date().toISOString(),
      user_id: this.userId,
      params: {
        ...this.userProperties,
        ...params,
      },
    };

    // In a real app, log to analytics SDK
    console.log('[Analytics] Event:', eventData);
  }

  logScreenView(screenName: string, screenClass?: string): void {
    this.logEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  }

  // Session events
  logSessionStart(sessionId: string): void {
    this.logEvent('session_start', { session_id: sessionId });
  }

  logSessionEnd(sessionId: string, durationMs: number, score?: number): void {
    this.logEvent('session_end', {
      session_id: sessionId,
      duration_ms: durationMs,
      score,
    });
  }

  logSessionError(sessionId: string, errorCode: string): void {
    this.logEvent('session_error', {
      session_id: sessionId,
      error_code: errorCode,
    });
  }

  // Training events
  logTrainingStart(scenarioId: string, difficulty: string): void {
    this.logEvent('training_start', {
      scenario_id: scenarioId,
      difficulty,
    });
  }

  logTrainingEnd(scenarioId: string, score: number): void {
    this.logEvent('training_end', {
      scenario_id: scenarioId,
      score,
    });
  }

  // Analysis events
  logConcernDetected(concerns: string[]): void {
    this.logEvent('concern_detected', {
      concerns: concerns.join(','),
      count: concerns.length,
    });
  }

  logProposalShown(productName?: string): void {
    this.logEvent('proposal_shown', {
      product_name: productName,
    });
  }

  // App lifecycle
  logAppOpen(): void {
    this.logEvent('app_open');
  }

  logLogout(): void {
    this.logEvent('logout');
    this.userId = null;
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
