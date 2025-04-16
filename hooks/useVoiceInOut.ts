import React, { useState, useCallback } from 'react';
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
};

export const useSpeechRecognition = (props: SpeechRecognitionProps) => {
    const [recognizing, setRecognizing] = useState(false);
    const [hasSpeech, setHasSpeech] = useState(false);
    const [transcriptBuffer, setTranscriptBuffer] = useState("");
    const [lastProcessedTranscript, setLastProcessedTranscript] = useState("");

    const handleStart = useCallback(async () => {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
            console.warn("Permissions not granted", result);
            return false;
        }

        // Check if the device is running Android 13 or higher
        const isAndroid13OrHigher =
            Device.osName === "Android" &&
            !!Device.osVersion &&
            parseInt(Device.osVersion.split(".")[0]) >= 13;

        // Start speech recognition
        ExpoSpeechRecognitionModule.start({
            lang: "en-US",
            interimResults: true,
            continuous: false,
            requiresOnDeviceRecognition: false,
            addsPunctuation: isAndroid13OrHigher,
            androidIntentOptions: {
                EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
                EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2500,
                EXTRA_MASK_OFFENSIVE_WORDS: false,
            },            
        });
        return true;
    }, []);

    const handleStop = useCallback(() => {
        ExpoSpeechRecognitionModule.stop();
    }, []);

    useSpeechRecognitionEvent("start", () => {
        setRecognizing(true);
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

    return {
        recognizing,
        startRecognition: handleStart,
        stopRecognition: handleStop,
    };
};

export const useSpeechOutput = async (text: string) => {

    const { chosenVoice } = useModelsManager();

    const getVoiceModel = (voice: string): string => {
        switch (voice) {
            case 'uk-alba':
                return 'en_GB-alba-medium.onnx';
            case 'us-hfc':
                return 'en_US-hfc_female-medium.onnx';
            case 'us-ryan':
                return 'en_US-ryan-medium.onnx';
            default:
                return 'en_US-ryan-medium.onnx'; // Default voice
        }
    };

    try {
        // const voiceModel = getVoiceModel(chosenVoice)
        TTSManager.initialize('en_GB-alba-medium.onnx');
        await TTSManager.generateAndPlay(text, 0, 1.0);
    } catch (error) {
        console.error('TTS Error:', error);
        throw error;
    }
};
