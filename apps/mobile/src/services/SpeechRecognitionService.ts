/**
 * SpeechRecognitionService
 * Handles on-device speech-to-text using expo-speech-recognition
 *
 * This service provides real-time transcription during recording sessions
 * using iOS SFSpeechRecognizer and Android SpeechRecognizer.
 */

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export interface TranscriptSegment {
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  confidence: number;
  isFinal: boolean;
}

export interface TranscriptChunk {
  chunkIndex: number;
  text: string;
  segments: TranscriptSegment[];
  startTimeMs: number;
  endTimeMs: number;
}

export type SpeechEventListener = (event: SpeechEvent) => void;

export type SpeechEvent =
  | { type: 'transcript_update'; transcript: TranscriptSegment }
  | { type: 'chunk_complete'; chunk: TranscriptChunk }
  | { type: 'error'; error: Error };

/**
 * SpeechRecognitionService
 * Uses expo-speech-recognition for on-device speech-to-text
 */
export class SpeechRecognitionService {
  private listeners: Set<SpeechEventListener> = new Set();
  private currentChunkIndex = 0;
  private segments: TranscriptSegment[] = [];
  private isRunning = false;
  private startTime = 0;
  private accumulatedText = '';

  /**
   * Check if speech recognition is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const status = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      return status.canAskAgain || status.granted;
    } catch {
      return false;
    }
  }

  /**
   * Request speech recognition permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return result.granted;
    } catch (error) {
      console.error('Failed to request speech recognition permission:', error);
      return false;
    }
  }

  /**
   * Add event listener
   */
  addListener(listener: SpeechEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: SpeechEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * Start speech recognition
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      throw new Error('Speech recognition permission not granted');
    }

    this.isRunning = true;
    this.currentChunkIndex = 0;
    this.segments = [];
    this.startTime = Date.now();
    this.accumulatedText = '';

    try {
      // Start continuous speech recognition
      ExpoSpeechRecognitionModule.start({
        lang: 'ja-JP', // Japanese
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
        requiresOnDeviceRecognition: true, // Force on-device processing
        addsPunctuation: true,
        contextualStrings: [
          // Beauty salon related keywords for better recognition
          'カット', 'カラー', 'パーマ', 'トリートメント',
          'シャンプー', 'ブロー', 'セット',
          '乾燥', 'パサつき', 'ダメージ', 'うねり', '広がり',
          'ヘアケア', 'スタイリング', 'ヘアスタイル',
        ],
      });

      console.log('Speech recognition started (on-device mode)');
    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop speech recognition
   */
  async stop(): Promise<TranscriptChunk | null> {
    if (!this.isRunning) {
      return null;
    }

    this.isRunning = false;

    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }

    // Finalize current chunk
    const chunk = this.finalizeChunk();

    console.log('Speech recognition stopped');

    return chunk;
  }

  /**
   * Process audio chunk for transcription
   * This method is called when a new audio chunk is available
   */
  async processAudioChunk(_audioUri: string, chunkIndex: number): Promise<TranscriptChunk> {
    // For continuous recognition, we return the accumulated text for this chunk
    const chunkStartMs = chunkIndex * 60000;
    const chunkEndMs = (chunkIndex + 1) * 60000;

    // Get the current accumulated text for this chunk
    const chunkText = this.accumulatedText || '';

    const segment: TranscriptSegment = {
      text: chunkText,
      startTimeMs: chunkStartMs,
      endTimeMs: chunkEndMs,
      confidence: 0.9,
      isFinal: true,
    };

    this.emit({ type: 'transcript_update', transcript: segment });

    const chunk: TranscriptChunk = {
      chunkIndex,
      text: chunkText,
      segments: chunkText ? [segment] : [],
      startTimeMs: chunkStartMs,
      endTimeMs: chunkEndMs,
    };

    this.emit({ type: 'chunk_complete', chunk });

    // Reset accumulated text for next chunk
    this.accumulatedText = '';

    return chunk;
  }

  /**
   * Handle recognition result from expo-speech-recognition
   * This is called by the hook in the React component
   */
  handleRecognitionResult(result: {
    results: Array<{
      transcript: string;
      confidence: number;
      isFinal: boolean;
    }>;
  }): void {
    if (!result.results || result.results.length === 0) {
      return;
    }

    const topResult = result.results[0];
    const now = Date.now();

    const segment: TranscriptSegment = {
      text: topResult.transcript,
      startTimeMs: now - this.startTime - 1000,
      endTimeMs: now - this.startTime,
      confidence: topResult.confidence || 0.9,
      isFinal: topResult.isFinal,
    };

    if (topResult.isFinal) {
      this.segments.push(segment);
      this.accumulatedText += (this.accumulatedText ? ' ' : '') + topResult.transcript;
    }

    this.emit({ type: 'transcript_update', transcript: segment });
  }

  /**
   * Handle recognition error
   */
  handleRecognitionError(error: { error: string; message: string }): void {
    console.error('Speech recognition error:', error);
    this.emit({ type: 'error', error: new Error(error.message || error.error) });
  }

  /**
   * Handle interim transcription results
   */
  handleInterimResult(text: string, confidence: number): void {
    const now = Date.now();
    const segment: TranscriptSegment = {
      text,
      startTimeMs: now - this.startTime - 1000,
      endTimeMs: now - this.startTime,
      confidence,
      isFinal: false,
    };

    this.emit({ type: 'transcript_update', transcript: segment });
  }

  /**
   * Handle final transcription results
   */
  handleFinalResult(text: string, confidence: number): void {
    const now = Date.now();
    const segment: TranscriptSegment = {
      text,
      startTimeMs: now - this.startTime - 2000,
      endTimeMs: now - this.startTime,
      confidence,
      isFinal: true,
    };

    this.segments.push(segment);
    this.accumulatedText += (this.accumulatedText ? ' ' : '') + text;
    this.emit({ type: 'transcript_update', transcript: segment });
  }

  /**
   * Finalize current chunk
   */
  finalizeChunk(): TranscriptChunk {
    const now = Date.now();
    const chunkStartMs = this.currentChunkIndex * 60000;

    const chunk: TranscriptChunk = {
      chunkIndex: this.currentChunkIndex,
      text: this.segments.map((s) => s.text).join(' '),
      segments: [...this.segments],
      startTimeMs: chunkStartMs,
      endTimeMs: now - this.startTime,
    };

    this.currentChunkIndex++;
    this.segments = [];

    this.emit({ type: 'chunk_complete', chunk });

    return chunk;
  }

  /**
   * Get current running state
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get accumulated transcript text
   */
  getAccumulatedText(): string {
    return this.accumulatedText;
  }
}

// Singleton instance
export const speechRecognitionService = new SpeechRecognitionService();

/**
 * React hook for speech recognition events
 * Use this in your React component to handle speech recognition
 */
export function useSpeechRecognition() {
  useSpeechRecognitionEvent('result', (event) => {
    speechRecognitionService.handleRecognitionResult({
      results: event.results.map((r) => ({
        transcript: r.transcript,
        confidence: r.confidence,
        isFinal: event.isFinal,
      })),
    });
  });

  useSpeechRecognitionEvent('error', (event) => {
    speechRecognitionService.handleRecognitionError({
      error: event.error,
      message: event.message,
    });
  });

  useSpeechRecognitionEvent('end', () => {
    // Recognition ended - could be due to silence or manual stop
    console.log('Speech recognition ended');
  });

  return speechRecognitionService;
}
