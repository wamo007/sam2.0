import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { AudioSessionIos, initWhisper } from 'whisper.rn';
import type { WhisperContext } from 'whisper.rn';
import * as FileSystem from 'expo-file-system';
import { PermissionsAndroid } from 'react-native';

type SpeechRecognitionProps = {
  onStart?: () => void;
  onEnd?: (finalTranscript: string) => void;
  onTranscriptUpdate?: (transcript: string, isDraft: boolean) => void;
  onError?: (error: any) => void;
  allowUpdates?: boolean;
};

export const useVoiceRecognition = (props: SpeechRecognitionProps) => {
  const [recognizing, setRecognizing] = useState(false);
  const transcriptBufferRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const allowTranscriptUpdatesRef = useRef<boolean | null>(null);
  const whisperContextRef = useRef<WhisperContext | null>(null);
  let whisperContext = whisperContextRef.current
  const stopTranscribeRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    whisperContextRef.current?.release()
    whisperContextRef.current = null
  }, [])

  const destModelPath = `${FileSystem.documentDirectory}ggml-base.en.bin`;
  const options = {
    maxLen: 1,
    language: 'en',
    realtimeAudioSec: 60,
    realtimeAudioSliceSec: 25,
    audioOutputPath: `${FileSystem.documentDirectory}realtime-record.wav`,
    audioSessionOnStartIos: {
      category: AudioSessionIos.Category.PlayAndRecord,
      options: [
        AudioSessionIos.CategoryOption.MixWithOthers,
        AudioSessionIos.CategoryOption.AllowBluetooth,
      ],
      mode: AudioSessionIos.Mode.Default,
    },
    audioSessionOnStopIos: 'restore',
  };

  const loadWhisperModel = async (): Promise<boolean> => {
    try {
      if (whisperContext) {
        await whisperContext.release()
        whisperContextRef.current = null
      }
      const ctx = await initWhisper({ filePath: destModelPath });
      whisperContextRef.current = ctx
      whisperContext = whisperContextRef.current

      return true;
    } catch (err) {
      props.onError?.(err);
      throw err;
    }
  };

  async function stopRecognition() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    allowTranscriptUpdatesRef.current = null
    await stopTranscribeRef.current?.stop();
    stopTranscribeRef.current = null;
    setRecognizing(false);
    if (transcriptBufferRef.current) {
      props.onEnd?.(transcriptBufferRef.current);
      transcriptBufferRef.current = null;
    }
    return;
  };

  async function startRecognition() {
    if (recognizing) return;
    if (Platform.OS === 'android') {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    }
    try {
      if (!whisperContext) await loadWhisperModel();
      if (!whisperContext) return console.log('No context')

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const { stop, subscribe } = await whisperContext.transcribeRealtime(options);
      stopTranscribeRef.current = { stop };
      transcriptBufferRef.current = null;
      allowTranscriptUpdatesRef.current = true;
      setRecognizing(true);

      subscribe((evt) => {
        const { data } = evt;
        if (data?.result && allowTranscriptUpdatesRef.current) {
          const text = data.result.trim();
          transcriptBufferRef.current = text;
          props.onTranscriptUpdate?.(text, true);
          
          // Reset timeout on each new transcript
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(async () => {
            if (allowTranscriptUpdatesRef.current) {
              allowTranscriptUpdatesRef.current = null;
              await stopRecognition();
            }
          }, 2000);
        }
      });

      return true;
    } catch (err) {
      props.onError?.(err);
      return false;
    }
  };

  return { loadWhisperModel, timeoutRef, recognizing, startRecognition, stopRecognition, allowTranscriptUpdatesRef };
};
