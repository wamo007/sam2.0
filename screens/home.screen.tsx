import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { useLLMProcessor } from '@/hooks/useLLMProcessor';
import { LinearGradient } from 'expo-linear-gradient'
import { scale } from 'react-native-size-matters'
import { useSpeechRecognition, useSpeechOutput } from '../hooks/useVoiceInOut';
import MessageInput from '../components/MessageInput';
import { Message } from '@/configs/dbTypes';
import { addMessage, getAllMessages } from '@/configs/Database';
import { useSQLiteContext } from 'expo-sqlite';
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'
import * as Speech from 'expo-speech';

export default function HomeScreen() {

    const [keyboardEnabled, setKeyboardEnabled] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [showReadyMessage, setShowReadyMessage] = useState<boolean>(false);
    const [talkingMode, setTalkingMode] = useState<boolean>(true);
    const scrollViewRef = useRef<ScrollView>(null);
    
    const {
        handleDownloadModel,
        checkFileExists,
        loadModel,
        context,
        isDownloading,
        isModelReady,
        progress
    } = useLLMProcessor();

    const db = useSQLiteContext()
    const modelName = 'Llama-3.2-1B-Instruct-Q4_0.gguf'
    const destPath = `${FileSystem.documentDirectory}${modelName}`

    useEffect(() => {
        const checkModel = async () => {
            if (!(await checkFileExists(destPath))) {
                Alert.alert(
                    "Confirm Model Download",
                    `I need to download my AI model to function properly.`,
                    [
                      { text: "OK", onPress: async () => {
                            await handleDownloadModel(modelName) 
                        }
                      }
                    ],
                    { cancelable: false }
                );
            } else {
                await loadModel(modelName);
            }
        };
        checkModel();
    }, []);  

    useEffect(() => {
        if (!isDownloading && isModelReady) {
            setShowReadyMessage(true);
            const timer = setTimeout(() => {
                setShowReadyMessage(false);
            }, 2000);
    
            return () => clearTimeout(timer);
        }
    }, [isDownloading, isModelReady]);

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                setIsLoading(true);
                const dbMessages = await getAllMessages(db);
                if (dbMessages) {
                    setMessages(dbMessages);
                }
            } catch (error) {
                console.error('Error fetching messages:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMessages();
    }, [db]);

    const { recognizing, startRecognition, stopRecognition } = useSpeechRecognition({
        onStart: () => {},
        onEnd: async (finalTranscript) => {
            if (finalTranscript.trim()) {
                await appendMessage(finalTranscript, false);
                setMessages(prev => prev.filter(msg => 
                    !(msg.role === 'user' && msg.isDraft && !msg.content.trim())
                ));
            }
        },
        onTranscriptUpdate: (transcript, isDraft) => {
            appendMessage(transcript, isDraft);
        },
        onError: (error) => {
            console.log("Speech recognition error:", error);
        }
    });

    const appendMessage = async (newMessage: string, isDraft: boolean = false) => {
        if (!newMessage.trim()) return;

        // Handle user message
        setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;

            if (isDraft) {
                if (updated[lastIdx]?.role === 'user' && updated[lastIdx]?.isDraft) {
                    return updated.map((msg, i) => 
                        i === lastIdx ? { ...msg, content: newMessage } : msg
                    );
                }
                return [...updated, {
                    role: 'user',
                    content: newMessage,
                    isDraft: true,
                }];
            }

            // Final message - remove draft and add finalized version
            const finalMessages = updated.filter(msg => 
                !(msg.role === 'user' && msg.isDraft)
            );
            
            return [
                ...finalMessages,
                {
                    role: 'user',
                    content: newMessage,
                    isDraft: false,
                }
            ];
        });

        if (!isDraft) {
            await addMessage(db, {
                role: 'user',
                content: newMessage,
                isDraft: false,
            });

            setMessages(prev => prev.filter(msg => 
                !(msg.role === 'user' && msg.isDraft)
            ));

            try {
                if (!context) {
                    Alert.alert("Model Not Loaded", "Please load the model first.");
                    return;
                }

                if (!newMessage.trim()) {
                    Alert.alert("Input Error", "Please enter a message.");
                    return;
                }
                
                const newConversation: Message[] = [
                    ...messages,
                    { role: "user", content: newMessage, isDraft: false },
                ];
                setIsGenerating(true);
                
                try {
                  const stopWords = [
                    "</s>",
                    "<|end|>",
                    "user:",
                    "assistant:",
                    "<|im_end|>",
                    "<|eot_id|>",
                    "<|end▁of▁sentence|>",
                    "<|end_of_text|>",
                    "<｜end▁of▁sentence｜>",
                  ];

                  // Create chat array with current messages plus the new user message
                  const chat = newConversation;
            
                  // Append a placeholder for the assistant's response
                  setMessages((prev) => [
                    ...prev,
                    {
                      role: 'assistant',
                      content: "",
                      isDraft: true,
                    },
                  ]);
                  let currentAssistantMessage = "";
            
                  interface CompletionData {
                    token: string;
                    // completed?: boolean;
                  }
            
                  interface CompletionResult {
                    timings: {
                      predicted_per_second: number;
                    };
                  }
            
                  const result: CompletionResult = await context.completion(
                    {
                      messages: chat,
                      n_predict: 10000,
                      stop: stopWords,
                    },
                    async (data: CompletionData) => {
                      const token = data.token;
                      currentAssistantMessage += token;

                      const visibleContent = currentAssistantMessage
                          .replace(/<think>.*?<\/think>/gs, "")
                          .trim()
            
                      setMessages((prev) => {
                        const lastIndex = prev.length - 1;
                        const updated = [...prev];
                        updated[lastIndex].content = visibleContent;
                        updated[lastIndex].isDraft = false; // Keep as draft until complete
                        return updated;
                      });

                    }
                  );

                //   After completion is done, save final message
                  const finalContent = currentAssistantMessage
                    .replace(/<think>.*?<\/think>/gs, "")
                    .trim();
                  if (talkingMode) {
                      await useSpeechOutput(finalContent);
                  }
                  setMessages((prev) => {
                    const lastIndex = prev.length - 1;
                    const updated = [...prev];
                    updated[lastIndex].content = finalContent;
                    updated[lastIndex].isDraft = false;
                    return updated;
                  });

                  await addMessage(db, {
                    role: 'assistant',
                    content: finalContent,
                    isDraft: false
                  });
            
                } catch (error) {

                    const errorMessage =
                      error instanceof Error ? error.message : "Unknown error";
                    Alert.alert("Error During Inference", errorMessage);

                } finally {
                  setIsGenerating(false);
                }
            } catch (error) {
                console.error("Error processing query:", error);
            }
        }
    };

    const appendTextMessage = async (text: string) => {
        await appendMessage(text, false);
    }

    const exportDB = async () => {
        await Sharing.shareAsync(FileSystem.documentDirectory + 'SQLite/chatSAM.db')
    }

    const handleStart = async () => {
        await startRecognition();
    };

    return (
        <LinearGradient
            colors={['#250152','#000000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={ styles.container }
        >
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                // keyboardVerticalOffset={70}
                style={{
                    flex: 1,
                }}
            >
                <View style={styles.mainContainer}>
                    { isDownloading && (
                        <View style={styles.downloadContainer}>
                            <Text style={styles.downloadText}>
                                Downloading model... {progress}%
                            </Text>
                        </View>
                    )}
                    { !isDownloading && !isModelReady && (
                        <View style={styles.downloadContainer}>
                            <Text style={styles.downloadText}>
                                Warming up gears...
                            </Text>
                        </View>
                    )}
                    { showReadyMessage && (
                        <View style={styles.downloadContainer}>
                            <Text style={styles.downloadText}>
                                Ready to Talk!
                            </Text>
                        </View>
                    )}
                    <View style={styles.header}>
                        <Image source={require('../assets/images/sam.png')} style={styles.headerImage} />
                    </View>
                
                    <View style={styles.messagesContainer}>
                        <Text style={styles.title}>SAM</Text>
                        <View style={styles.chatBox}>
                            <ScrollView
                                ref={scrollViewRef}
                                bounces={false}
                                style={styles.scrollView}
                                showsVerticalScrollIndicator={false}
                            >
                                { isLoading ? (
                                    <View style={styles.loadingContainer}>
                                        <Text style={styles.loadingText}>Loading messages...</Text>
                                    </View>
                                ) : messages.map((message, index:number) => {
                                        if (message.role === 'assistant') {
                                            return (
                                            <View key={index} style={styles.assistantMessageContainer}>
                                                <View style={styles.assistantMessage}>
                                                <Text style={styles.assistantMessageText}>
                                                    {message.content}
                                                </Text>
                                                </View>
                                            </View>
                                            )
                                        } else if (message.role === 'user') {
                                            return (
                                            <View key={index} style={styles.userMessageContainer}>
                                                <View style={styles.userMessage}>
                                                <Text style={styles.userMessageText}>
                                                    {message.content}
                                                </Text>
                                                </View>
                                            </View>
                                            )
                                        }
                                    })
                                }
                            </ScrollView>
                        </View>
                    </View>
                            
                </View>
                            
                { keyboardEnabled && !recognizing ? (
                    <MessageInput 
                        onMicPress={handleStart}
                        onKeyboardHide={() => setKeyboardEnabled(false)}
                        onShouldSend={appendTextMessage}
                    />
                ) : (
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={() => setKeyboardEnabled(true)}>
                        {/* <TouchableOpacity onPress={() => useSpeechOutput('testing voice initiation')}> */}
                            <Image 
                                style={[
                                    styles.microphone, {backgroundColor: 'rgb(30, 41, 59)'}
                                ]}
                                source={require('../assets/images/keyboard.png')}
                            />
                        </TouchableOpacity>
                        { !recognizing ? (
                            <TouchableOpacity 
                                onPress={handleStart}
                                disabled={isGenerating}
                            >
                                <Image 
                                    style={[
                                        styles.microphone, {backgroundColor: 'rgb(30, 41, 59)'}
                                    ]}
                                    source={require('../assets/images/microphone.png')}
                                />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={stopRecognition}>
                                <Image 
                                    style={[
                                        styles.microphone, {backgroundColor: '#06B6D4'}
                                    ]}
                                    source={require('../assets/images/microphone.png')}
                                />
                            </TouchableOpacity>
                        )}
                    </View>  
                )}
            </KeyboardAvoidingView>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'stretch',
        backgroundColor: '#131313',
        paddingHorizontal: scale(20),
    },
    mainContainer: {
        flex: 1,
        flexDirection: 'column',
        marginTop: scale(30),
        
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    headerImage: {
        height: scale(150),
        width: scale(150),
    },
    messagesContainer: {
        flex: 1,
        marginTop: scale(5),
    },
    title: {
        fontSize: scale(20),
        color: 'rgba(255, 255, 255, 0.7)',
        fontFamily: 'OrbitronBold',
        marginLeft: scale(1),
        marginBottom: scale(4),
    },
    chatBox: {
        flex: 1,
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderRadius: scale(8),
        padding: scale(4),
    },
    scrollView: {
        margin: scale(5),
    },
    assistantMessageContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginVertical: scale(5),
    },
    assistantMessage: {
        maxWidth: scale(240),
        backgroundColor: 'rgb(8, 16, 36)',
        borderRadius: scale(8),
        padding: scale(7),
        borderBottomLeftRadius: 0,
    },
    assistantMessageText: {
        color: '#F9FAFB',
    },
    userMessageContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginVertical: scale(5),
    },
    userMessage: {
        maxWidth: scale(240),
        backgroundColor: 'rgb(5, 153, 179)',
        borderRadius: scale(8),
        padding: scale(7),
        borderBottomRightRadius: 0,
    },
    userMessageText: {
        color: '#FFFFFF',
        textAlign: 'right',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: scale(10),
    },
    microphone: {
        borderRadius: scale(8),
        width: scale(60),
        height: scale(60),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#F9FAFB',
        fontSize: scale(14),
    },
    downloadContainer: {
        position: 'absolute',
        bottom: scale(80),
        alignSelf: 'center',
        backgroundColor: '#07002e',
        padding: scale(10),
        borderRadius: scale(5),
        elevation: 1, // Android shadow
        shadowColor: '#000', // iOS shadow
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.00,
        zIndex: 1000,
    },
    downloadText: {
        color: '#fff',
        fontSize: scale(12),
    },
});
