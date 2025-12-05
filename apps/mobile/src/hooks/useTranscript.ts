/**
 * useTranscript Hook
 * 文字起こしフック
 */
import { useEffect, useState, useCallback } from 'react';
import { speechRecognitionService, TranscriptSegment as ImportedTranscriptSegment } from '@/services';

interface TranscriptSegment {
  id: string;
  speaker: 'stylist' | 'customer';
  text: string;
  timestamp: number;
  confidence: number;
}

export function useTranscript() {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = speechRecognitionService.addListener((event) => {
      switch (event.type) {
        case 'transcript_update':
          if (event.transcript.isFinal) {
            handleSpeechResult(event.transcript);
          }
          break;
        case 'error':
          setError(event.error.message);
          setIsListening(false);
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSpeechResult = useCallback((result: ImportedTranscriptSegment) => {
    const segment: TranscriptSegment = {
      id: `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      speaker: 'stylist', // Default to stylist, will be updated after diarization
      text: result.text,
      timestamp: result.startTimeMs,
      confidence: result.confidence,
    };

    setSegments((prev) => [...prev, segment]);
  }, []);

  const clearSegments = useCallback(() => {
    setSegments([]);
  }, []);

  const updateSegmentSpeaker = useCallback((segmentId: string, speaker: 'stylist' | 'customer') => {
    setSegments((prev) =>
      prev.map((seg) => (seg.id === segmentId ? { ...seg, speaker } : seg))
    );
  }, []);

  const getFullTranscript = useCallback(() => {
    return segments.map((seg) => `[${seg.speaker}] ${seg.text}`).join('\n');
  }, [segments]);

  const getTalkTime = useCallback(() => {
    let stylistTime = 0;
    let customerTime = 0;

    segments.forEach((seg) => {
      // Estimate time based on text length (average speaking rate ~150 words/min)
      const estimatedSeconds = seg.text.length / 10; // Rough estimate
      if (seg.speaker === 'stylist') {
        stylistTime += estimatedSeconds;
      } else {
        customerTime += estimatedSeconds;
      }
    });

    return {
      stylist: stylistTime,
      customer: customerTime,
      total: stylistTime + customerTime,
    };
  }, [segments]);

  return {
    segments,
    isListening,
    error,
    clearSegments,
    updateSegmentSpeaker,
    getFullTranscript,
    getTalkTime,
  };
}

export default useTranscript;
