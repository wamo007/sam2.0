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
};

export const useVoiceRecognition = (props: SpeechRecognitionProps) => {
  const [recognizing, setRecognizing] = useState(false);
  const [transcriptBuffer, setTranscriptBuffer] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const whisperContextRef = useRef<WhisperContext | null>(null);
  
  const [stopTranscribe, setStopTranscribe] = useState<{
    stop: () => void
  } | null>(null);

//   useEffect(() => () => {
//     whisperContextRef.current?.release()
//     whisperContextRef.current = null
//   }, [])

  const destModelPath = `${FileSystem.documentDirectory}ggml-base.en.bin`;
  const options = {
    maxLen: 1,
    language: 'en',
    realtimeAudioSec: 60,
    realtimeAudioSliceSec: 25,
    // Save audio to file to force immediate stream closure
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

//   const loadModel = async () => {
//     try {
//     //   const info = await FileSystem.getInfoAsync(destModelPath);
//     //   if (!info.exists) throw new Error('Whisper model not found');
//       const ctx = await initWhisper({ filePath: destModelPath });
//       whisperContextRef.current = ctx
//     } catch (err) {
//       props.onError?.(err);
//       throw err;
//     }
//   };

  const stopRecognition = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setRecognizing(false);
    await stopTranscribe?.stop();
    setStopTranscribe(null);
    if (transcriptBuffer) {
      props.onEnd?.(transcriptBuffer);
      setTranscriptBuffer('');
    }
  }, []);

  const startRecognition = async () => {
    if (recognizing) return;
    if (Platform.OS === 'android') {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    }
    try {
      const whisperContext = whisperContextRef.current
    //   if (whisperContext) {
    //     console.log('Found previous context')
    //     await whisperContext.release()
    //     whisperContextRef.current = null
    //     console.log('Released previous context')
    //   }

      const ctx = await initWhisper({ 
        filePath: destModelPath,
        ...{},
      });
      whisperContextRef.current = ctx
      if (!whisperContext) return console.log('No context')

      const { stop, subscribe } = await whisperContext.transcribeRealtime(options);
      setStopTranscribe({ stop });
      setRecognizing(true);

      subscribe((evt) => {
        const { isCapturing, data } = evt;
        if (data?.result) {
          const text = data.result.trim();
          setTranscriptBuffer(text);
          props.onTranscriptUpdate?.(text, true);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(async () => {
            // trigger stop on silence
            // await stopTranscribe?.stop();
            // setStopTranscribe(null);
            await stopRecognition();
          }, 2000);
        }
        // when the recorder actually stops capturing, end recognition
        if (!isCapturing) {
          stopRecognition();
        }
      });

      return true;
    } catch (err) {
      props.onError?.(err);
      return false;
    }
  };

  return { recognizing, startRecognition, stopRecognition };
};
