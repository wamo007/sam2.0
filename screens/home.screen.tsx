import { Alert, Button, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useState } from 'react'
import { dummyMessages } from '../constants';
import { LinearGradient } from 'expo-linear-gradient'
import { scale } from 'react-native-size-matters'
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
  } from "expo-speech-recognition";

export default function HomeScreen() {

    const [messages, setMessages] = useState(dummyMessages);
    const [recognizing, setRecognizing] = useState(false);

    useSpeechRecognitionEvent("start", () => setRecognizing(true));
    useSpeechRecognitionEvent("end", () => setRecognizing(false));
    useSpeechRecognitionEvent("result", (event) => {
        appendMessage(event.results[0]?.transcript);
    });
    useSpeechRecognitionEvent("error", (event) => {
        console.log("error code:", event.error, "error message:", event.message);
    });

    const appendMessage = (newMessage:string) => {
        setMessages((prevMessages) => [
            ...prevMessages, 
            { role: "user", content: newMessage },
        ]);
    };

    const handleStart = async () => {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
            console.warn("Permissions not granted", result);
        return;
        }
        // Start speech recognition
        ExpoSpeechRecognitionModule.start({
            lang: "en-US",
            interimResults: true,
            continuous: false,
        });
    };

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
            <Text style={styles.title}>SAM</Text>
            <View style={styles.chatBox}>
                <ScrollView
                    bounces={false}
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                >
                    {messages.map((message, index:number) => {
                    if (message.role == 'assistant') {
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
                    })}
                </ScrollView>
            </View>
        </View>

        <View style={styles.footer}>
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
                <TouchableOpacity onPress={() => ExpoSpeechRecognitionModule.stop()}>
                    <Image 
                        style={[
                            styles.microphone, {backgroundColor: '#06B6D4'}
                        ]}
                        source={require('../assets/images/microphone.png')}
                    />
                </TouchableOpacity>
            )}
        </View>
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
        marginBottom: scale(20),
        marginHorizontal: scale(20),
        // justifyContent: 'center',
        // alignItems: 'center',
        // width: '100%',
        // paddingHorizontal: scale(10),
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    microphone: {
        borderRadius: scale(8),
        marginTop: scale(-5),
        width: scale(70),
        height: scale(70),
    },
});