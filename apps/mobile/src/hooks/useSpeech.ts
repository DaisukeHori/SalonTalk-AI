/**
 * useSpeech Hook
 * 音声認識フック
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { speechRecognitionService, audioRecorderService, TranscriptSegment } from '@/services';

interface SpeechConfig {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

export function useSpeech(config: SpeechConfig = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resultsRef = useRef<TranscriptSegment[]>([]);

  useEffect(() => {
    const unsubscribeSpeech = speechRecognitionService.addListener((event) => {
      switch (event.type) {
        case 'transcript_update':
          if (event.transcript.isFinal) {
            resultsRef.current.push(event.transcript);
            setTranscript((prev) => prev + event.transcript.text + ' ');
            setInterimTranscript('');
          } else {
            setInterimTranscript(event.transcript.text);
          }
          break;
        case 'error':
          setError(event.error.message);
          setIsListening(false);
          break;
      }
    });

    const unsubscribeRecorder = audioRecorderService.addListener((event) => {
      switch (event.type) {
        case 'started':
          setIsRecording(true);
          setIsListening(true);
          setError(null);
          break;
        case 'stopped':
          setIsRecording(false);
          setIsListening(false);
          setInterimTranscript('');
          break;
        case 'error':
          setError(event.error.message);
          setIsRecording(false);
          break;
      }
    });

    return () => {
      unsubscribeSpeech();
      unsubscribeRecorder();
    };
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    resultsRef.current = [];
    setTranscript('');
    setInterimTranscript('');

    try {
      await speechRecognitionService.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : '音声認識の開始に失敗しました');
    }
  }, [config]);

  const stopListening = useCallback(() => {
    speechRecognitionService.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);

    try {
      await audioRecorderService.startRecording();
    } catch (err) {
      setError(err instanceof Error ? err.message : '録音の開始に失敗しました');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      await audioRecorderService.stopRecording();
    } catch (err) {
      setError(err instanceof Error ? err.message : '録音の停止に失敗しました');
    }
  }, []);

  const startBoth = useCallback(async () => {
    await Promise.all([startListening(), startRecording()]);
  }, [startListening, startRecording]);

  const stopBoth = useCallback(() => {
    stopListening();
    stopRecording();
  }, [stopListening, stopRecording]);

  const clearTranscript = useCallback(() => {
    resultsRef.current = [];
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const getResults = useCallback(() => {
    return resultsRef.current;
  }, []);

  return {
    isListening,
    isRecording,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    startRecording,
    stopRecording,
    startBoth,
    stopBoth,
    clearTranscript,
    getResults,
  };
}

export default useSpeech;
