import { addMessage } from '@/configs/Database';
import { useModelsManager } from '@/hooks/useModelsManager';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, ModalProps, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { scale } from 'react-native-size-matters';

// type UserInfoProps = ModalProps & {
//     isOpen: boolean;
//     onOpenChange: (open: boolean) => void;
//     isSetup: boolean;
//     onSetupChange: (setup: boolean) => void;
// }

interface UserModalProps {
  handleDownloadModel: () => Promise<void>;
  checkModelExists: () => Promise<boolean | undefined>;
  checkTTSModelExists: () => Promise<boolean | undefined>;
  loadModel: () => Promise<boolean>;
  isDownloading: boolean;
  isTTSDownloading: boolean;
  isModelReady: boolean;
  isTTSModelReady: boolean;
  progress: number;
  setUser: (user: string) => void;
  setChosenLang: (lang: string) => void;
  user: string;
  chosenLang: string;
}

export const UserModal = ({
  handleDownloadModel,
  checkModelExists,
  checkTTSModelExists,
  loadModel,
  isDownloading,
  isTTSDownloading,
  isModelReady,
  isTTSModelReady,
  progress,
  setUser,
  setChosenLang,
  user,
  chosenLang
}: UserModalProps) => {

    const [isSetup, setIsSetup] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [userName, setUserName] = useState('User');
    const [language, setLanguage] = useState('uk');
    const [alertHeader, setAlertHeader] = useState('')
    const [alert, setAlert] = useState('');
    const [showReadyMessage, setShowReadyMessage] = useState<boolean>(false);
    const inputRef = useRef<TextInput>(null);

    const db = useSQLiteContext();

    useEffect(() => {
            if (!isDownloading && !isTTSDownloading && isModelReady && isTTSModelReady) {
                setShowReadyMessage(true);
                const timer = setTimeout(() => {
                    setShowReadyMessage(false);
                }, 2000);
        
                return () => clearTimeout(timer);
            }
    }, [isDownloading, isTTSDownloading, isModelReady, isTTSModelReady]);

    useEffect(() => {
        const checkModel = async () => {
            if (!(await checkModelExists() && await checkTTSModelExists())) {
                setAlert('I need to download my AI and speech models to function properly.');
                setIsSetup(true);
                setIsOpen(true);
            } else if (!(await checkTTSModelExists()) && (await checkModelExists())) {
                setAlertHeader('Speech model is missing or corrupted...')
                setAlert('I need to re-download the speech model to talk.')
                setIsOpen(true);
            } else if ((await checkTTSModelExists()) && !(await checkModelExists())) {
                setAlertHeader('AI model is missing or corrupted...')
                setAlert('I need to re-download the AI model to function properly.')
                setIsOpen(true);
            } else {
                await loadModel();
            }
        };
        checkModel();
    }, []);  

    const onChangeText = (text: string) => {
        setUserName(text);
    };

    const onSubmit = async () => {
        setUser(userName);
        setLanguage(language);
        await addMessage(db, {
            role: 'system',
            content: `You are SAM - a friendly and sarcastic companion. You do not use facial or body expressions in your responses. This is a conversation with ${user}`
        });
        setAlertHeader(`Hi, ${userName}!`);
        setIsSetup(false);
    };

    const onConfirm = async () => {
        setIsOpen(false);
        await handleDownloadModel();
    }

    const content = isSetup ? (
        <View style={styles.modalContainer}>
            <TextInput
                autoFocus
                ref={inputRef}
                placeholder={user}
                placeholderTextColor={'rgba(255, 255, 255, 0.5)'}
                style={styles.messageInput}
                onChangeText={onChangeText}
                value={userName}
                multiline
            />
            <View>
                <Text style={styles.text}>Choose your communication language</Text>
            </View>
            <TouchableOpacity 
                style={styles.button}
                onPress={onSubmit}
            >
                <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
        </View>
    ) : (
        <View style={styles.modalContainer}>
            <Text style={styles.headerText}>{alertHeader}</Text>
            <Text style={styles.text}>{alert}</Text>
            <TouchableOpacity 
                style={styles.button}
                onPress={onConfirm}
            >
                <Text style={styles.buttonText}>Confirm</Text>
            </TouchableOpacity>           
        </View>
    )
  
    return (
        <>
            <Modal
                visible={isOpen}
                transparent
                animationType='fade'
                statusBarTranslucent
                style={{position: 'absolute'}}
            >
                <KeyboardAvoidingView
                    behavior={ Platform.OS === 'ios' ? 'padding' : 'height' }
                    style={styles.modalOverlay}
                >
                    {content}
                </KeyboardAvoidingView>
            </Modal>
            { isDownloading && (
                <View style={styles.downloadContainer}>
                    <Text style={styles.downloadText}>
                        Downloading AI model... {progress}%
                    </Text>
                </View>
            )}
            { isTTSDownloading && (
                <View style={styles.downloadContainer}>
                    <Text style={styles.downloadText}>
                        Downloading Text-to-Speech model... {progress}%
                    </Text>
                </View>
            )}
            { !isOpen && !(isDownloading || isTTSDownloading) && !isModelReady && (
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
        </>
    )
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scale(40),
    },
    modalContainer: {
        padding: scale(15),
        backgroundColor: '#07002e',
        borderRadius: scale(8),
        flexDirection: 'column',
        gap: scale(8),
        elevation: 1, // Android shadow
        shadowColor: '#000', // iOS shadow
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.00,
    },
    messageInput: {
        flex: 0,
        borderRadius: scale(8),
        padding: scale(10),
        color: '#fff',
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
    },
    headerText: {
        color: '#fff',
        fontSize: scale(14),
    },
    text: {
        color: '#fff',
        fontSize: scale(12),
    },
    button: {
        borderRadius: scale(8),
        padding: scale(10),
        backgroundColor: '#06B6D4',
        marginTop: scale(2)
    },
    buttonText: {
        color: '#fff',
        fontSize: scale(12),
        fontFamily: 'OrbitronBold',
        textAlign: 'center'
    },
    downloadContainer: {
        position: 'absolute',
        bottom: scale(110),
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
})
