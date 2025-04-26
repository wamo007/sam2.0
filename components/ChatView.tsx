import React, { useEffect, useRef } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { scale } from 'react-native-size-matters';
import { Message } from '@/configs/dbTypes';

interface ChatViewProps {
    messages: Message[];
    isLoading: boolean;
}

export const ChatView = ({ messages, isLoading }: ChatViewProps) => {
    
    const scrollViewRef = useRef<ScrollView>(null);
    
    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    return (
        <View style={styles.mainContainer}>
            <View style={styles.messagesContainer}>
                <Text style={styles.title}>SAM</Text>
                <View style={styles.chatBox}>
                    <ScrollView
                        ref={scrollViewRef}
                        bounces={false}
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                    >
                        {isLoading ? (
                            <View style={styles.loadingContainer}>
                                <Text style={styles.loadingText}>Loading messages...</Text>
                            </View>
                        ) : messages.map((message, index: number) => {
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
                        })}
                    </ScrollView>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
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