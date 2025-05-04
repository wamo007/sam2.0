import { useState, useCallback } from 'react';
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from "expo-speech-recognition";

type SpeechRecognitionProps = {
    onStart?: () => void;
    onEnd?: (finalTranscript: string) => void;
    onTranscriptUpdate?: (transcript: string, isDraft: boolean) => void;
    onError?: (error: any) => void;
    userAccent: string;
};

export const useVoiceRecognition = (props: SpeechRecognitionProps) => {
    const [recognizing, setRecognizing] = useState(false);
    const [hasSpeech, setHasSpeech] = useState(false);
    const [transcriptBuffer, setTranscriptBuffer] = useState("");
    const [lastProcessedTranscript, setLastProcessedTranscript] = useState("");

    const startRecognition = useCallback(async () => {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
            console.warn("Permissions not granted", result);
            return false;
        }

        // Start speech recognition
        ExpoSpeechRecognitionModule.start({
            lang: props.userAccent,
            interimResults: true,
            continuous: false,
            requiresOnDeviceRecognition: false,
            addsPunctuation: true,
            androidIntentOptions: {
                EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2500,
                EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2500,
                EXTRA_MASK_OFFENSIVE_WORDS: false,
            },            
        });
        return true;
    }, [props.userAccent]);

    const stopRecognition = useCallback(() => {
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
        startRecognition,
        stopRecognition
    };
};
