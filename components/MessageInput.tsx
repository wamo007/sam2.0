import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import {
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRef, useState } from 'react';
import { BlurView } from 'expo-blur';

// export type Props = {
//   onShouldSend: (message: string) => void;
// };

type MessageInputProps = {
    onMicPress: () => void;
    onKeyboardHide: () => void;
    onShouldSend: (message: string) => void;
};

// const MessageInput = ({ onShouldSend }: Props) => {
const MessageInput = ({ onMicPress, onKeyboardHide, onShouldSend }: MessageInputProps ) => {
  const [message, setMessage] = useState('');
  const { bottom } = useSafeAreaInsets();
  const expanded = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);

  const collapseItems = () => {
    expanded.value = withTiming(0, { duration: 400 });
  };

  const onChangeText = (text: string) => {
    collapseItems();
    setMessage(text);
  };

  const onSend = () => {
    onShouldSend(message);
    setMessage('');
  };

  return (
    <BlurView intensity={80} tint='systemChromeMaterialDark' style={{ paddingBottom: bottom, paddingTop: 5 }}>
      <View style={styles.row}>

        <TextInput
          autoFocus
          ref={inputRef}
          placeholder="Message"
          placeholderTextColor={'rgba(255, 255, 255, 0.5)'}
          style={styles.messageInput}
          onFocus={collapseItems}
          onChangeText={onChangeText}
          value={message}
          multiline
        />
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <AntDesign 
                onPress={onSend} 
                name="arrowup" 
                size={24} 
                color={'rgb(5, 153, 179)'} 
            />
            <FontAwesome6 
                onPress={() => {
                    onMicPress();
                    onKeyboardHide();
                }} 
                name="microphone-lines" 
                size={24} 
                color="rgb(5, 153, 179)" 
            />
        </TouchableOpacity>

      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  messageInput: {
    flex: 1,
    marginHorizontal: 10,
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
  },
});
export default MessageInput;