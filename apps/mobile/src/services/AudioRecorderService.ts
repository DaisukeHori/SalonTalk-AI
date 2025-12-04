/**
 * AudioRecorderService
 * Handles audio recording functionality for the iPad app
 *
 * Uses expo-av for audio recording with the following specifications:
 * - Sample Rate: 16000 Hz
 * - Channels: 1 (mono)
 * - Format: WAV (PCM 16-bit)
 * - Chunk Duration: 60 seconds
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export interface AudioChunk {
  uri: string;
  chunkIndex: number;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
}

export interface RecordingState {
  isRecording: boolean;
  currentChunkIndex: number;
  totalDurationMs: number;
  chunks: AudioChunk[];
}

export type RecordingEventListener = (event: RecordingEvent) => void;

export type RecordingEvent =
  | { type: 'started' }
  | { type: 'chunk_complete'; chunk: AudioChunk }
  | { type: 'stopped'; totalDuration: number }
  | { type: 'error'; error: Error };

const CHUNK_DURATION_MS = 60000; // 60 seconds
const SAMPLE_RATE = 16000;

export class AudioRecorderService {
  private recording: Audio.Recording | null = null;
  private currentChunkIndex = 0;
  private recordingStartTime = 0;
  private chunkStartTime = 0;
  private chunkTimer: NodeJS.Timeout | null = null;
  private listeners: Set<RecordingEventListener> = new Set();
  private chunks: AudioChunk[] = [];
  private isRecording = false;

  constructor() {
    this.setupAudioMode();
  }

  private async setupAudioMode(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Failed to set audio mode:', error);
    }
  }

  /**
   * Request microphone permission
   */
  async requestPermission(): Promise<boolean> {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Check if microphone permission is granted
   */
  async hasPermission(): Promise<boolean> {
    const { status } = await Audio.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Add event listener
   */
  addListener(listener: RecordingEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: RecordingEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    const hasPermission = await this.hasPermission();
    if (!hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) {
        throw new Error('Microphone permission denied');
      }
    }

    try {
      this.currentChunkIndex = 0;
      this.chunks = [];
      this.recordingStartTime = Date.now();
      this.chunkStartTime = this.recordingStartTime;

      await this.startNewChunkRecording();
      this.isRecording = true;
      this.startChunkTimer();
      this.emit({ type: 'started' });
    } catch (error) {
      this.emit({ type: 'error', error: error as Error });
      throw error;
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<AudioChunk[]> {
    if (!this.isRecording) {
      return this.chunks;
    }

    this.isRecording = false;
    this.stopChunkTimer();

    try {
      // Finalize current chunk
      const chunk = await this.finalizeCurrentChunk();
      if (chunk) {
        this.chunks.push(chunk);
      }

      const totalDuration = Date.now() - this.recordingStartTime;
      this.emit({ type: 'stopped', totalDuration });

      return this.chunks;
    } catch (error) {
      this.emit({ type: 'error', error: error as Error });
      throw error;
    }
  }

  /**
   * Get current recording state
   */
  getState(): RecordingState {
    return {
      isRecording: this.isRecording,
      currentChunkIndex: this.currentChunkIndex,
      totalDurationMs: Date.now() - this.recordingStartTime,
      chunks: [...this.chunks],
    };
  }

  /**
   * Start a new chunk recording
   */
  private async startNewChunkRecording(): Promise<void> {
    const recordingOptions: Audio.RecordingOptions = {
      android: {
        extension: '.wav',
        outputFormat: Audio.AndroidOutputFormat.DEFAULT,
        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
        sampleRate: SAMPLE_RATE,
        numberOfChannels: 1,
        bitRate: 256000,
      },
      ios: {
        extension: '.wav',
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: SAMPLE_RATE,
        numberOfChannels: 1,
        bitRate: 256000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/wav',
        bitsPerSecond: 256000,
      },
    };

    this.recording = new Audio.Recording();
    await this.recording.prepareToRecordAsync(recordingOptions);
    await this.recording.startAsync();
  }

  /**
   * Finalize current chunk and save to file
   */
  private async finalizeCurrentChunk(): Promise<AudioChunk | null> {
    if (!this.recording) {
      return null;
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      if (!uri) {
        return null;
      }

      const endTimeMs = Date.now();
      const durationMs = endTimeMs - this.chunkStartTime;

      // Move file to permanent location
      const permanentUri = `${FileSystem.documentDirectory}audio_chunk_${this.currentChunkIndex}_${Date.now()}.wav`;
      await FileSystem.moveAsync({
        from: uri,
        to: permanentUri,
      });

      const chunk: AudioChunk = {
        uri: permanentUri,
        chunkIndex: this.currentChunkIndex,
        startTimeMs: this.chunkStartTime - this.recordingStartTime,
        endTimeMs: endTimeMs - this.recordingStartTime,
        durationMs,
      };

      this.recording = null;
      return chunk;
    } catch (error) {
      console.error('Error finalizing chunk:', error);
      this.recording = null;
      return null;
    }
  }

  /**
   * Start chunk timer
   */
  private startChunkTimer(): void {
    this.chunkTimer = setInterval(async () => {
      if (!this.isRecording) return;

      try {
        // Finalize current chunk
        const chunk = await this.finalizeCurrentChunk();
        if (chunk) {
          this.chunks.push(chunk);
          this.emit({ type: 'chunk_complete', chunk });
        }

        // Start next chunk
        this.currentChunkIndex++;
        this.chunkStartTime = Date.now();
        await this.startNewChunkRecording();
      } catch (error) {
        console.error('Error during chunk rotation:', error);
        this.emit({ type: 'error', error: error as Error });
      }
    }, CHUNK_DURATION_MS);
  }

  /**
   * Stop chunk timer
   */
  private stopChunkTimer(): void {
    if (this.chunkTimer) {
      clearInterval(this.chunkTimer);
      this.chunkTimer = null;
    }
  }

  /**
   * Clean up recorded files
   */
  async cleanup(): Promise<void> {
    this.stopChunkTimer();

    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {
        // Ignore errors during cleanup
      }
      this.recording = null;
    }

    // Delete all chunk files
    for (const chunk of this.chunks) {
      try {
        await FileSystem.deleteAsync(chunk.uri, { idempotent: true });
      } catch {
        // Ignore errors during cleanup
      }
    }

    this.chunks = [];
    this.isRecording = false;
  }
}

// Singleton instance
export const audioRecorderService = new AudioRecorderService();
