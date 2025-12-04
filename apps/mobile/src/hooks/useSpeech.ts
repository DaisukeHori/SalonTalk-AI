/**
 * useSpeech Hook
 * 音声認識フック
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { speechRecognitionService, audioRecorderService, SpeechRecognitionResult } from '@/services';

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

  const resultsRef = useRef<SpeechRecognitionResult[]>([]);

  useEffect(() => {
    const unsubscribeSpeech = speechRecognitionService.addListener((event) => {
      switch (event.type) {
        case 'result':
          if (event.result.isFinal) {
            resultsRef.current.push(event.result);
            setTranscript((prev) => prev + event.result.text + ' ');
            setInterimTranscript('');
          } else {
            setInterimTranscript(event.result.text);
          }
          break;
        case 'started':
          setIsListening(true);
          setError(null);
          break;
        case 'stopped':
          setIsListening(false);
          setInterimTranscript('');
          break;
        case 'error':
          setError(event.error.message);
          setIsListening(false);
          break;
      }
    });

    const unsubscribeRecorder = audioRecorderService.addListener((event) => {
      switch (event.type) {
        case 'recording_started':
          setIsRecording(true);
          break;
        case 'recording_stopped':
          setIsRecording(false);
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
      await speechRecognitionService.start({
        continuous: config.continuous ?? true,
        interimResults: config.interimResults ?? true,
        language: config.language ?? 'ja-JP',
      });
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
      await audioRecorderService.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : '録音の開始に失敗しました');
    }
  }, []);

  const stopRecording = useCallback(() => {
    audioRecorderService.stop();
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
