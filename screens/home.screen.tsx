import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { scale } from 'react-native-size-matters'
import { useKeepAwake } from 'expo-keep-awake'
import MessageInput from '../components/MessageInput';
import { useModelsManager } from '@/hooks/useModelsManager';
import { useVoiceInteraction } from '../hooks/useVoiceInOut';
import { addMessage, getAllMessages } from '@/configs/Database';
import { Message } from '@/configs/dbTypes';
import { useSQLiteContext } from 'expo-sqlite';
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'
import { UserModal } from '@/components/UserModal'
import { ChatView } from '@/components/ChatView'

export default function HomeScreen() {

    const [keyboardEnabled, setKeyboardEnabled] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [talkingMode, setTalkingMode] = useState<boolean>(true);

    const {
        context,
        isModelReady,
        isDownloading,
        isTTSDownloading,
        isTTSModelReady,
        progress,
        handleDownloadModel,
        checkModelExists,
        checkTTSModelExists,
        loadModel,
        setUser,
        setChosenLang,
        user,
        chosenLang
    } = useModelsManager();

    const db = useSQLiteContext()

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

    const {
        recognizing,
        speak,
        startRecognition,
        stopRecognition,
    } = useVoiceInteraction({
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
        },
        onTTSComplete: () => {
            if (talkingMode) {
                handleStart();
            }
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
                
                const lastMessages = messages.length <= 16 ? messages : messages.slice(-16);
                // if (lastMessages.some(msg => msg.role !== 'system')) {
                //     lastMessages.unshift({ 
                //         role: 'system', 
                //         content: `You are SAM - a friendly and sarcastic female companion. This is a conversation with ${userName}` 
                //     });
                // }
                
                let newConversation = [];
                if (lastMessages[lastMessages.length - 1].role === 'user' && lastMessages[lastMessages.length - 1].content === newMessage) {
                    newConversation = lastMessages
                } else {
                    newConversation = 
                        [
                            ...lastMessages,
                            { role: "user", content: newMessage, isDraft: false },
                        ];
                }
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
                //   const chat = newConversation;
            
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
                      messages: newConversation,
                      n_predict: 10000,
                      stop: stopWords,
                    },
                    
                    async (data: CompletionData) => {
                      const token = data.token;
                      currentAssistantMessage += token;

                      const visibleContent = currentAssistantMessage
                        .replace(/<think>.*?<\/think>/gs, "")
                        .replace(/\*/g, "")
                        .replace(/\#/g, "")
                        .replace(/\+/g, "-")
                        .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")  // Remove emojis
                        .replace(/[\u{1F600}-\u{1F64F}]/gu, "")  // Remove emoticons
                        .replace(/[\u{2700}-\u{27BF}]/gu, "")    // Remove dingbats
                        .replace(/[^\x00-\x7F]/g, "")            // Remove non-ASCII characters
                        .replace(/\s+/g, " ")                     // Normalize whitespace
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

                  // After completion is done, save final message
                  const finalContent = currentAssistantMessage
                    .replace(/<think>.*?<\/think>/gs, "")
                    .replace(/\*/g, "")
                    .replace(/\#/g, "")
                    .replace(/\+/g, "-")
                    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")  // Remove emojis
                    .replace(/[\u{1F600}-\u{1F64F}]/gu, "")  // Remove emoticons
                    .replace(/[\u{2700}-\u{27BF}]/gu, "")    // Remove dingbats
                    .replace(/[^\x00-\x7F]/g, "")            // Remove non-ASCII characters
                    .replace(/\s+/g, " ") 
                    .trim();
                  
                  if (talkingMode) {
                    try {
                        await speak(finalContent);
                    } catch (error) {
                        console.error("Error in speech sequence: ", error);
                        // Optionally disable talking mode if there's an error
                        setTalkingMode(false);
                    }
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
        // await speak('Testing voice');
        await Sharing.shareAsync(FileSystem.documentDirectory + 'SQLite/chatSAM.db')
    }

    const handleStart = async () => {
        await startRecognition();
    };

    // const checkModelsDirectory = async () => {
    //     const modelsDirPath = `${FileSystem.documentDirectory}models`;
        
    //     try {
    //         const dirInfo = await FileSystem.getInfoAsync(modelsDirPath);
            

    //         if (dirInfo.exists) {
    //             console.log('Models directory exists');
                
    //             // List directory contents
    //             const contents = await FileSystem.readDirectoryAsync(modelsDirPath);
    //             console.log('Contents of models directory:', contents);
                
    //             return contents;
    //         } else {
    //             console.log('Models directory does not exist');
    //             return [];
    //         }
    //     } catch (error) {
    //         console.error('Error checking models directory:', error);
    //         return [];
    //     }
    // };

    // useEffect(() => {
    //     checkModelsDirectory();
    // }, []);
    
    useKeepAwake();
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
                style={{
                    flex: 1, 
                    position: 'relative',
                    maxHeight: '100%'
                }}
                keyboardVerticalOffset={0}
            >
                <UserModal 
                    handleDownloadModel={handleDownloadModel}
                    checkModelExists={checkModelExists}
                    checkTTSModelExists={checkTTSModelExists}
                    loadModel={loadModel}
                    isDownloading={isDownloading}
                    isTTSDownloading={isTTSDownloading}
                    isModelReady={isModelReady}
                    isTTSModelReady={isTTSModelReady}
                    progress={progress}
                    setUser={setUser}
                    setChosenLang={setChosenLang}
                    user={user}
                    chosenLang={chosenLang}
                />
                  {/* <View style={styles.header}>
                        <Image source={require('../assets/images/sam.png')} style={styles.headerImage} />
                    </View> */}
                <ChatView messages={messages} isLoading={isLoading} />
                            
                <View style={styles.footer}>
                    <TouchableOpacity onPress={() => setKeyboardEnabled(true)}>
                        <Image 
                            style={[
                                styles.microphone, {backgroundColor: 'rgb(30, 41, 59)'}
                            ]}
                            source={require('../assets/images/keyboard.png')}
                        />
                    </TouchableOpacity>
                    {/* <TouchableOpacity>
                        <Image 
                            style={[
                                styles.microphone, {backgroundColor: 'rgb(30, 41, 59)'}
                            ]}
                            source={require('../assets/images/hideText.png')}
                        />
                    </TouchableOpacity> */}
                    { !talkingMode ? (
                        <TouchableOpacity onPress={() => setTalkingMode(true)}>
                            <Image 
                                style={[
                                    styles.microphone, {backgroundColor: 'rgb(30, 41, 59)'}
                                ]}
                                source={require('../assets/images/mute.png')}
                            />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={() => setTalkingMode(false)}>
                            <Image 
                                style={[
                                    styles.microphone, {backgroundColor: '#06B6D4'}
                                ]}
                                source={require('../assets/images/speaker.png')}
                            />
                        </TouchableOpacity>
                    )}
                    
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
                <MessageInput 
                    onMicPress={handleStart}
                    onKeyboardHide={() => setKeyboardEnabled(false)}
                    onShouldSend={appendTextMessage}
                />
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
        position: 'relative',
        maxHeight: '100%'
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
        position: 'relative',
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
        maxHeight: '100%'
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
        marginTop: scale(10),
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
});
