/**
 * SpeechRecognitionService
 * Handles on-device speech-to-text using expo-speech-recognition
 *
 * This service provides real-time transcription during recording sessions.
 */

import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';

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
 * Note: expo-speech is for text-to-speech, not speech recognition.
 * For production, you would need to use:
 * - iOS: SFSpeechRecognizer (native module)
 * - Android: SpeechRecognizer (native module)
 *
 * This service provides a mock implementation for development.
 * In production, integrate with native speech recognition APIs.
 */
export class SpeechRecognitionService {
  private listeners: Set<SpeechEventListener> = new Set();
  private currentChunkIndex = 0;
  private currentTranscript = '';
  private segments: TranscriptSegment[] = [];
  private isRunning = false;
  private startTime = 0;

  /**
   * Check if speech recognition is available
   */
  async isAvailable(): Promise<boolean> {
    // In production, check actual speech recognition availability
    return true;
  }

  /**
   * Request speech recognition permission
   */
  async requestPermission(): Promise<boolean> {
    // In production, request actual speech recognition permission
    // iOS: SFSpeechRecognizer authorization
    // Android: RECORD_AUDIO permission
    return true;
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

    this.isRunning = true;
    this.currentChunkIndex = 0;
    this.currentTranscript = '';
    this.segments = [];
    this.startTime = Date.now();

    // In production, start actual speech recognition here
    // For iOS: Start SFSpeechRecognizer session
    // For Android: Start SpeechRecognizer
    console.log('Speech recognition started (mock mode)');
  }

  /**
   * Stop speech recognition
   */
  async stop(): Promise<TranscriptChunk | null> {
    if (!this.isRunning) {
      return null;
    }

    this.isRunning = false;

    // Finalize current chunk
    const chunk = this.finalizeChunk();

    // In production, stop actual speech recognition here
    console.log('Speech recognition stopped (mock mode)');

    return chunk;
  }

  /**
   * Process audio chunk for transcription
   * In production, this would send audio to the speech recognition engine
   */
  async processAudioChunk(audioUri: string, chunkIndex: number): Promise<TranscriptChunk> {
    // In production, this would:
    // 1. Read the audio file
    // 2. Send to speech recognition engine
    // 3. Wait for transcription results

    // For now, return a mock transcription
    // Replace this with actual speech recognition in production
    const mockText = 'これはテスト用の文字起こしです。実際の実装では音声認識APIを使用します。';

    const now = Date.now();
    const segment: TranscriptSegment = {
      text: mockText,
      startTimeMs: chunkIndex * 60000,
      endTimeMs: (chunkIndex + 1) * 60000,
      confidence: 0.9,
      isFinal: true,
    };

    this.emit({ type: 'transcript_update', transcript: segment });

    const chunk: TranscriptChunk = {
      chunkIndex,
      text: mockText,
      segments: [segment],
      startTimeMs: chunkIndex * 60000,
      endTimeMs: (chunkIndex + 1) * 60000,
    };

    this.emit({ type: 'chunk_complete', chunk });

    return chunk;
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

    this.currentTranscript = text;
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
    this.currentTranscript = '';
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
}

// Singleton instance
export const speechRecognitionService = new SpeechRecognitionService();
