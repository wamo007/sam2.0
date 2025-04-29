import { Alert, Image, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useEffect, useState } from 'react'
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
import { NoChatView } from '@/components/NoChatView'
import { AntDesign } from '@expo/vector-icons'

export default function HomeScreen() {

    const [keyboardEnabled, setKeyboardEnabled] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [talkingMode, setTalkingMode] = useState<boolean>(true);
    const [isSetup, setIsSetup] = useState(false);
    const [openSettings, setOpenSettings] = useState<boolean>(false);
    const [user, setUser] = useState('');
    const [userAccent, setUserAccent] = useState('');
    const [character, setCharacter] = useState('');

    const {
        context,
        isModelReady, isTTSModelReady,
        isDownloading, isTTSDownloading,
        progress,
        handleDownloadModel, handleDownloadTTSModel,
        checkModelExists, checkTTSModelExists,
        loadModel,
    } = useModelsManager();

    const db = useSQLiteContext();

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                setIsLoading(true);
                const dbMessages = await getAllMessages(db);
                if (dbMessages) {
                    setMessages(dbMessages);
                }
            } catch (error) {
                console.error('Error fetching messages: ', error);
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
        ttsActive
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
        },
        userAccent: userAccent
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
                
                const lastMessages = messages.length <= 10 ? messages : messages.slice(-10);
                
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
                  // const chat = newConversation;
                  if (newConversation.some(msg => msg.role !== 'system')) {
                    newConversation = [
                        ...newConversation.slice(0, -1),
                        { 
                            role: 'system', 
                            content: `You are SAM - a friendly and sarcastic companion. You do not use facial or body expressions in your responses. This is a dialogue with ${user}.` 
                        },
                        newConversation[newConversation.length - 1]
                    ];
                  }
            
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
                      n_predict: 90,
                      temperature: 0.5,
                      top_p: 0.9,
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
                keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                enabled={Platform.OS === 'ios'} 
                style={{
                    flex: 1,
                }}
            >
                <View style={styles.mainContainer}>
                    <View style={styles.messagesContainer}>
                        <View style={styles.navBar}>
                            { isSetup 
                            ? <Text style={styles.title}>Initial Setup</Text>
                            : (
                                <>
                                    <Text style={styles.title}>{ openSettings ? 'Settings' : 'SAM' }</Text>
                                
                                    { openSettings 
                                    ? <AntDesign name="menuunfold" 
                                        size={24} color="rgba(255, 255, 255, 0.7)" 
                                        onPress={() => setOpenSettings(false)} 
                                    />
                                    : <AntDesign name="menufold" 
                                        size={24} color="rgba(255, 255, 255, 0.7)" 
                                        onPress={() => setOpenSettings(true)} 
                                    />
                                    }
                                </>
                            )}
                            
                            
                        </View>
                        
                        <UserModal 
                            checkModelExists={checkModelExists} checkTTSModelExists={checkTTSModelExists}
                            handleDownloadTTSModel={handleDownloadTTSModel} handleDownloadModel={handleDownloadModel} loadModel={loadModel}
                            isDownloading={isDownloading} isTTSDownloading={isTTSDownloading} progress={progress}
                            isModelReady={isModelReady} isTTSModelReady={isTTSModelReady}
                            openSettings={openSettings} setOpenSettings={setOpenSettings}
                             user={user} setUser={setUser} userAccent={userAccent} setUserAccent={setUserAccent} 
                             setIsSetup={setIsSetup} character={character} setCharacter={setCharacter}
                        />

                        { keyboardEnabled && !openSettings &&
                            <ChatView messages={messages} isLoading={isLoading} /> 
                        }
                        { !keyboardEnabled && !openSettings &&
                            <NoChatView ttsActive={ttsActive} character={character} />
                        }

                    </View>
                </View>

                { !openSettings &&           
                    <View style={styles.footer}>
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
                        { keyboardEnabled ? (
                            <TouchableOpacity onPress={() => setKeyboardEnabled(false)}>
                                <Image 
                                    style={[
                                        styles.microphone, {backgroundColor: '#06B6D4'}
                                    ]}
                                    source={require('../assets/images/keyboard.png')}
                                />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={() => setKeyboardEnabled(true)}>
                                <Image 
                                    style={[
                                        styles.microphone, {backgroundColor: 'rgb(30, 41, 59)'}
                                    ]}
                                    source={require('../assets/images/keyboard.png')}
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
                }
                { !openSettings && keyboardEnabled &&
                    <MessageInput
                        onShouldSend={appendTextMessage}
                    />
                }
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
        paddingTop: scale(10),
        paddingHorizontal: scale(20),
    },
    mainContainer: {
        flex: 1,
        flexDirection: 'column',
        marginTop: scale(30),
        position: 'relative',
        maxHeight: '100%'
    },
    messagesContainer: {
        flex: 1,
        marginTop: scale(5),
        position: 'relative',
    },
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignContent: 'center',
        marginHorizontal: scale(1),
        marginBottom: scale(4),
    },
    title: {
        fontSize: scale(20),
        color: 'rgba(255, 255, 255, 0.7)',
        fontFamily: 'OrbitronBold',
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
});
