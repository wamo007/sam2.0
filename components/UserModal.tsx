import { addMessage, changeUser, getUser } from '@/configs/Database';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { scale } from 'react-native-size-matters';
import { Dropdown } from 'react-native-element-dropdown';
import { AntDesign } from '@expo/vector-icons';
import { User } from '@/configs/dbTypes';

interface UserModalProps {
  handleDownloadModel: (char: string, charAccent:string) => Promise<void>;
  handleDownloadTTSModel: (char: string, charAccent:string) => Promise<void>;
  checkModelExists: () => Promise<boolean | undefined>;
  checkTTSModelExists: () => Promise<boolean | undefined>;
  loadModel: () => Promise<boolean>;
  isDownloading: boolean;
  isTTSDownloading: boolean;
  isModelReady: boolean;
  isTTSModelReady: boolean;
  progress: number;
  setOpenSettings: (openSettings: boolean) => void;
  openSettings: boolean;
  user: string;
  setUser: (user: string) => void;
  userAccent: string;
  setUserAccent: (accent: string) => void;
  character: string;
  setCharacter: (character: string) => void;
  characterAccent: string;
  setCharacterAccent: (characterAccent: string) => void;
  setIsSetup: (isSetup: boolean) => void;
}

export const UserModal = ({
  handleDownloadModel,
  handleDownloadTTSModel,
  checkModelExists,
  checkTTSModelExists,
  loadModel,
  isDownloading,
  isTTSDownloading,
  isModelReady,
  isTTSModelReady,
  progress,
  openSettings,
  setOpenSettings,
  user,
  setUser,
  userAccent,
  setUserAccent,
  character,
  setCharacter,
  characterAccent,
  setCharacterAccent,
  setIsSetup
}: UserModalProps) => {

    const [isOpen, setIsOpen] = useState(false);
    const [alertHeader, setAlertHeader] = useState('')
    const [alert, setAlert] = useState('');
    const [showReadyMessage, setShowReadyMessage] = useState<boolean>(false);
    const [oldUser, setOldUser] = useState<User[]>([]);

    const inputRef = useRef<TextInput>(null);

    const db = useSQLiteContext();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const dbUser = await getUser(db);
                if (dbUser && dbUser.length > 0) {
                    setOldUser(dbUser);
                    setUser(dbUser[0].name);
                    setUserAccent(dbUser[0].accent);
                    setCharacter(dbUser[0].char);
                    setCharacterAccent(dbUser[0].charAccent);
                };
            } catch (error) {
                console.error('Error fetching messages: ', error);
            }
        };

        fetchUser()
    }, []);

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
                setOpenSettings(true);
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

    const onSubmit = async () => {
        // First update the user in database
        await changeUser(db, {
            name: user,
            accent: userAccent,
            char: character,
            charAccent: characterAccent
        });

        // If name changed, add the system message
        if (!oldUser || !oldUser.length || user !== oldUser[0].name) {
            await addMessage(db, {
                role: 'system',
                content: `Your are SAM, a friendly and sarcastic ${character} companion. This is a conversation with a user - ${user}.
                Please respond clearly and concisely, using no more than 3 sentences per answer.
                Do not repeat or paraphrase ${user}'s input.
                Do not use stage directions (e.g., sigh, shrugs, laughs) in your responses.`
            });
            setAlertHeader(`Hi, ${user}!`);
            setIsSetup(false);
        } else if (user === oldUser[0].name && (character !== oldUser[0].char || characterAccent !== oldUser[0].charAccent)) {
            setAlertHeader(`Applying requested changes...`);
            setAlert(`Hey ${user}, I need to download voice module to speak properly.`)
        } else if (user === oldUser[0].name && character === oldUser[0].char && characterAccent === oldUser[0].charAccent) {
            setAlertHeader(`Successfully updated`);
            setAlert(``)
        }

        // Close settings and show confirmation
        setOpenSettings(false);
        setIsOpen(true);
    };

    const onConfirm = async () => {
        setIsOpen(false);
        
        if (!oldUser || !oldUser.length) {
            await handleDownloadModel(character, characterAccent);
        } else if (character !== oldUser[0].char || characterAccent !== oldUser[0].charAccent) {
            await handleDownloadTTSModel(character, characterAccent);
        }
        
        const dbUser = await getUser(db);
        setOldUser(dbUser);
    }

    const char = [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
    ];

    const renderChar = (item: any) => {
      return (
        <View style={styles.item}>
          <Text style={styles.textItem}>{item.label}</Text>
          {item.value === character && (
            <AntDesign
              style={styles.icon}
              color="white"
              name="checksquareo"
              size={20}
            />
          )}
        </View>
      );
    };

    const charAccent = [
        { label: 'US', value: 'us' },
        { label: 'UK', value: 'uk' }
    ];

    const renderCharAccent = (item: any) => {
      return (
        <View style={styles.item}>
          <Text style={styles.textItem}>{item.label}</Text>
          {item.value === characterAccent && (
            <AntDesign
              style={styles.icon}
              color="white"
              name="checksquareo"
              size={20}
            />
          )}
        </View>
      );
    };

    const usrAccent = [
        { label: 'US', value: 'en-US' },
        { label: 'UK', value: 'en-GB' },
        { label: 'Australia', value: 'en-AU' },
        { label: 'Canada', value: 'en-CA' },
        { label: 'Ghana', value: 'en-GH' },
        { label: 'Hong Kong', value: 'en-HK' },
        { label: 'India', value: 'en-IN' },
        { label: 'Ireland', value: 'en-IE' },
        { label: 'Kenya', value: 'en-KE' },
        { label: 'New Zealandia', value: 'en-NZ' },
        { label: 'Nigeria', value: 'en-NG' },
        { label: 'Pakistan', value: 'en-PK' },
        { label: 'Philippines', value: 'en-PH' },
        { label: 'Singapore', value: 'en-SG' },
        { label: 'South Africa', value: 'en-ZA' },
        { label: 'Tanzania', value: 'en-TZ' },
    ]

    const renderUsrAccent = (item: any) => {
      return (
        <View style={styles.item}>
          <Text style={styles.textItem}>{item.label}</Text>
          {item.value === userAccent && (
            <AntDesign
              style={styles.icon}
              color="white"
              name="checksquareo"
              size={20}
            />
          )}
        </View>
      );
    };

    const content = openSettings ? (
        <View style={styles.settingsContainer}>
            <View style={styles.header}>
                { character === 'male'
                    ? <Image source={require('../assets/images/sam-male.png')} style={styles.headerImage} />
                    : <Image source={require('../assets/images/sam-female.png')} style={styles.headerImage} />
                }
            </View>
            <View style={styles.settingsSubcontainer}>
                <View>
                    <Text style={styles.label}>Enter your name:</Text>
                    <TextInput
                        ref={inputRef}
                        placeholder='Name'
                        placeholderTextColor={'rgba(255, 255, 255, 0.5)'}
                        style={styles.messageInput}
                        onChangeText={(value) => setUser(value)}
                        value={user}
                        multiline
                    />
                </View>
                <View>
                    <Text style={styles.label}>Choose your english pronunciation:</Text>
                    <Dropdown
                        style={styles.dropdown}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.selectedTextStyle}
                        iconStyle={styles.iconStyle}
                        data={usrAccent}
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        placeholder="Pronunciation"
                        searchPlaceholder="Search..."
                        value={userAccent}
                        onChange={item => {
                            setUserAccent(item.value);
                        }}
                        renderItem={renderUsrAccent}
                    />
                </View>
                <View>
                    <Text style={styles.label}>Choose character's voice:</Text>
                    <Dropdown
                        style={styles.dropdown}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.selectedTextStyle}
                        iconStyle={styles.iconStyle}
                        data={char}
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        placeholder="Voice"
                        searchPlaceholder="Search..."
                        value={character}
                        onChange={item => {
                            setCharacter(item.value);
                        }}
                        renderItem={renderChar}
                    />
                </View>
                <View>
                    <Text style={styles.label}>Choose character's accent:</Text>
                    <Dropdown
                        style={styles.dropdown}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.selectedTextStyle}
                        iconStyle={styles.iconStyle}
                        data={charAccent}
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        placeholder="Accent"
                        searchPlaceholder="Search..."
                        value={characterAccent}
                        onChange={item => {
                            setCharacterAccent(item.value);
                        }}
                        renderItem={renderCharAccent}
                    />
                </View>
            </View>
            <TouchableOpacity 
                style={styles.button}
                onPress={onSubmit}
            >
                <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
        </View>
    ) : (
        <Modal
            visible={isOpen}
            transparent
            animationType='fade'
            statusBarTranslucent
            style={{position: 'absolute'}}
        >
            <View style={styles.modalOverlay}>
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
            </View>
        </Modal>
    )
  
    return (
        <>
            { content }
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
            { !isOpen && !openSettings && !isDownloading && isTTSDownloading && !isModelReady && (
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
    settingsContainer: {
        flexDirection: 'column',
        justifyContent: 'space-evenly',
        flex: 1,
        gap: scale(8),
        paddingVertical: scale(16)
    },
    settingsSubcontainer: {
        flexDirection: 'column',
        gap: scale(6)
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    headerImage: {
        height: scale(200),
        width: scale(200),
    },
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
        fontSize: scale(13),
        fontFamily: 'OrbitronMd',
        letterSpacing: scale(1),
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
    },
    headerText: {
        color: '#fff',
        fontSize: scale(16),
        fontFamily: 'OrbitronBold',
        letterSpacing: scale(1),
        textAlign: 'center'
    },
    text: {
        color: '#fff',
        fontSize: scale(13),
    },
    label: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: scale(16),
        padding: scale(10)
    },
    button: {
        borderRadius: scale(8),
        padding: scale(10),
        backgroundColor: '#06B6D4',
        marginTop: scale(2)
    },
    buttonText: {
        color: '#fff',
        fontSize: scale(13),
        fontFamily: 'OrbitronBold',
        letterSpacing: scale(1),
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
    dropdown: {
      borderRadius: scale(8),
      padding: scale(10),
      backgroundColor: 'rgba(30, 41, 59, 0.8)',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    icon: {
      marginRight: 5,
    },
    item: {
      padding: scale(10),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'rgba(30, 41, 59, 0.8)',
    },
    textItem: {
      flex: 1,
      fontSize: scale(13),
      fontFamily: 'OrbitronMd',
      letterSpacing: scale(1),
      color: '#fff',
    },
    placeholderStyle: {
      fontSize: scale(13),
      fontFamily: 'OrbitronMd',
      letterSpacing: scale(1),
      color: 'rgba(255, 255, 255, 0.5)',
    },
    selectedTextStyle: {
      fontSize: scale(13),
      fontFamily: 'OrbitronMd',
      letterSpacing: scale(1),
      color: '#fff',
    },
    iconStyle: {
      width: 20,
      height: 20,
    },
})

// import * as Sharing from 'expo-sharing'
// import * as FileSystem from 'expo-file-system'

// const exportDB = async () => {
//     await Sharing.shareAsync(FileSystem.documentDirectory + 'SQLite/chatSAM.db')
// }