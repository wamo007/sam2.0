import React, { useState, useCallback, useEffect } from 'react';
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import * as Device from 'expo-device';
import TTSManager from 'react-native-sherpa-onnx-offline-tts';
import { useModelsManager } from './useModelsManager';

type SpeechRecognitionProps = {
    onStart?: () => void;
    onEnd?: (finalTranscript: string) => void;
    onTranscriptUpdate?: (transcript: string, isDraft: boolean) => void;
    onError?: (error: any) => void;
    onTTSComplete?: () => void;
};

export const useVoiceInteraction = (props: SpeechRecognitionProps) => {
    const [recognizing, setRecognizing] = useState(false);
    const [ttsActive, setTtsActive] = useState(false);
    const [hasSpeech, setHasSpeech] = useState(false);
    const [transcriptBuffer, setTranscriptBuffer] = useState("");
    const [lastProcessedTranscript, setLastProcessedTranscript] = useState("");

    const { userAccent } = useModelsManager();

    const startRecognition = useCallback(async () => {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
            console.warn("Permissions not granted", result);
            return false;
        }

        // Start speech recognition
        ExpoSpeechRecognitionModule.start({
            lang: userAccent,
            interimResults: true,
            continuous: false,
            requiresOnDeviceRecognition: false,
            addsPunctuation: true,
            androidIntentOptions: {
                EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
                EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2500,
                EXTRA_MASK_OFFENSIVE_WORDS: false,
            },            
        });
        return true;
    }, []);

    const stopRecognition = useCallback(() => {
        ExpoSpeechRecognitionModule.stop();
    }, []);

    useSpeechRecognitionEvent("start", () => {
        setRecognizing(true);
        setTtsActive(false);
        props.onStart?.();
    });

    useSpeechRecognitionEvent("end", () => {
        setRecognizing(false);
        const finalTranscript = transcriptBuffer.trim();
        if (hasSpeech && finalTranscript) {
            props.onEnd?.(finalTranscript);
            setTranscriptBuffer("");
            setLastProcessedTranscript("");
        }
        setHasSpeech(false);
    });

    useSpeechRecognitionEvent("result", (event) => {
        const currentTranscript = event.results[0]?.transcript || "";
        if (currentTranscript.trim()) {
            setHasSpeech(true);
            const newWords = currentTranscript.replace(lastProcessedTranscript, "").trim();
            if (newWords) {
                const newBuffer = transcriptBuffer + (transcriptBuffer ? " " : "") + newWords;
                setTranscriptBuffer(newBuffer);
                setLastProcessedTranscript(currentTranscript);
                props.onTranscriptUpdate?.(newBuffer, true);
            }
        }
    });

    useSpeechRecognitionEvent("error", (event) => {
        console.log("error code:", event.error, "error message:", event.message);
        props.onError?.(event);
    });

    const speak = useCallback(async (text: string) => {

        let speed = 0.8;
        // if (userAccent === "ru-RU") {
        //     speed = 1.1;
        // }

        try {
            TTSManager.initialize("medium.onnx");
            await TTSManager.generateAndPlay(text, 0, speed);
            setTtsActive(true);

            // Estimate TTS duration (520ms per word + 1s buffer)
            const wordCount = text.split(/\s+/).length;
            const totalPunctuationCount = (text.match(/[.,!?;:]/g) || []).length + (text.match(/\n/g) || []).length;
            const estimatedDuration = Math.max(2000, wordCount * 255  + totalPunctuationCount * 200 + 1000);
            
            setTimeout(() => {
                setTtsActive(false);
                props.onTTSComplete?.();
            }, estimatedDuration);
        } catch (error) {
            console.error('TTS Error:', error);
            setTtsActive(false);
            throw error;
        }
    }, []);

    return {
        recognizing,
        ttsActive,
        startRecognition,
        stopRecognition,
        speak
    };
};
