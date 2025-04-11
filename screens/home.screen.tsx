import { Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { scale } from 'react-native-size-matters'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import MessageInput from '../components/MessageInput';
import { Message, Role } from '@/configs/dbTypes';
import { addMessage, getMessages } from '@/configs/Database';
import { useSQLiteContext } from 'expo-sqlite';
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'

export default function HomeScreen() {
    const [keyboardEnabled, setKeyboardEnabled] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const scrollViewRef = useRef<ScrollView>(null);

    const db = useSQLiteContext()

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                setIsLoading(true);
                const dbMessages = await getMessages(db);
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
                // await chatDB.addMessage({
                //     role: 'user',
                //     content: finalTranscript,
                //     timestamp: Date.now(),
                //     isDraft: false
                // });
                await appendMessage(finalTranscript, false);
                // Remove any empty draft messages
                setMessages(prev => prev.filter(msg => 
                    !(msg.role === Role.User && msg.isDraft && !msg.content.trim())
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
        setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            const lastMessageIndex = updatedMessages.length - 1;
    
            if (!newMessage.trim()) return prevMessages;

            if (isDraft) {
                // Always update the last message if it's a user message (if draft)
                if (updatedMessages[lastMessageIndex]?.role === Role.User 
                    && updatedMessages[lastMessageIndex]?.isDraft) {
                    return updatedMessages.map((msg, i) => 
                        i === lastMessageIndex 
                            ? { ...msg, content: newMessage, isDraft: true }
                            : msg
                    );
                }
    
                // Add a new draft message if none exists
                return [
                    ...updatedMessages,
                    {
                        role: Role.User,
                        content: newMessage,
                        isDraft: true,
                        timestamp: Date.now(),
                    },
                ];
            }
    
            // Finalize existing draft
            if (updatedMessages[lastMessageIndex]?.isDraft) {
                return updatedMessages.map((msg, i) => 
                    i === lastMessageIndex 
                        ? { ...msg, content: newMessage, isDraft: false }
                        : msg
                );
            }

            // Only add new message if we have content and no draft exists
            return newMessage.trim() 
                ? [
                    ...updatedMessages, 
                    { 
                        role: Role.User,
                        content: newMessage,
                        isDraft: false,
                        timestamp: Date.now(),
                    },
                ]
                : prevMessages;
        });

        if (!isDraft) {
            await addMessage(db, {
                role: Role.User,
                content: newMessage,
                timestamp: Date.now(),
                isDraft: false,
            });
        }
    };

    const appendTextMessage = async (text: string) => {
        setMessages([...messages, { role: Role.User, content: text, timestamp: Date.now(), isDraft: false }]);
        await addMessage(db, { role: Role.User, content: text, timestamp: Date.now(), isDraft: false })
    }

    
    const exportDB = async () => {
        await Sharing.shareAsync(FileSystem.documentDirectory + 'SQLite/chatSAM.db')
    }

    const handleStart = async () => {
        await startRecognition();
    };

    // const getCompletion = async (text: string) => {
    //     if (messages.length === 0) {
    //       addChat(db, text).then((res) => {
    //         const chatID = res.lastInsertRowId;
    //         setChatId(chatID.toString());
    //         addMessage(db, chatID, { content: text, role: Role.User });
    //       });
    //     }
    
    //     setMessages([...messages, { role: Role.User, content: text }, { role: Role.Bot, content: '' }]);
    //     messages.push();
    //     openAI.chat.stream({
    //       messages: [
    //         {
    //           role: 'user',
    //           content: text,
    //         },
    //       ],
    //       model: gptVersion == '4' ? 'gpt-4' : 'gpt-3.5-turbo',
    //     });
    // };

    return (
        <LinearGradient
            colors={['#250152','#000000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={ styles.container }
        >
            <StatusBar barStyle="light-content" />
        
            <View style={styles.mainContainer}>
                <View style={styles.header}>
                    <Image source={require('../assets/images/sam.png')} style={styles.headerImage} />
                </View>
        
                <View style={styles.messagesContainer}>
                    {/* <TouchableOpacity onPress={exportDB}>
                        <Image 
                            style={[
                                styles.microphone, {backgroundColor: 'rgb(30, 41, 59)'}
                            ]}
                            source={require('../assets/images/keyboard.png')}
                        />
                    </TouchableOpacity> */}
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
                                    if (message.role === Role.Assistant) {
                                        return (
                                        <View key={index} style={styles.assistantMessageContainer}>
                                            <View style={styles.assistantMessage}>
                                            <Text style={styles.assistantMessageText}>
                                                {message.content}
                                            </Text>
                                            </View>
                                        </View>
                                        )
                                    } else {
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
            <View style={styles.footer}>
                { keyboardEnabled && !recognizing ? (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={70}
                        style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        }}>
                        <MessageInput 
                            onMicPress={handleStart}
                            onKeyboardHide={() => setKeyboardEnabled(false)}
                            onShouldSend={appendTextMessage}
                        />
                    </KeyboardAvoidingView>
                ) : (
                    <>
                        <TouchableOpacity onPress={() => setKeyboardEnabled(true)}>
                            <Image 
                                style={[
                                    styles.microphone, {backgroundColor: 'rgb(30, 41, 59)'}
                                ]}
                                source={require('../assets/images/keyboard.png')}
                            />
                        </TouchableOpacity>
                        { !recognizing ? (
                            <TouchableOpacity onPress={handleStart}>
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
                    </>  
                )}
                
                {/* <MessageInput onShouldSend={getCompletion} /> */}
            </View>
            
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'stretch',
        backgroundColor: '#131313',
    },
    mainContainer: {
        flex: 1,
        flexDirection: 'column',
        marginTop: scale(30),
        marginHorizontal: scale(20),
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
        height: '90%',
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
        borderTopLeftRadius: 0,
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
        borderTopRightRadius: 0,
    },
    userMessageText: {
        color: '#FFFFFF',
        textAlign: 'right',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scale(20),
    },
    microphone: {
        borderRadius: scale(8),
        marginTop: scale(-5),
        marginHorizontal: scale(20),
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
    }
});
