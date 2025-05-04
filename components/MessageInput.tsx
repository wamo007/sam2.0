import Ionicons from '@expo/vector-icons/Ionicons';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import {
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRef, useState } from 'react';
import { scale } from 'react-native-size-matters'

// export type Props = {
//   onShouldSend: (message: string) => void;
// };

type MessageInputProps = {
    onShouldSend: (message: string) => void;
};

// const MessageInput = ({ onShouldSend }: Props) => {
const MessageInput = ({ onShouldSend }: MessageInputProps ) => {
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
    <View style={{ paddingBottom: bottom }}>
      <View style={styles.row}>

        <TextInput
          ref={inputRef}
          placeholder="Message"
          placeholderTextColor={'rgba(255, 255, 255, 0.5)'}
          style={styles.messageInput}
          onFocus={collapseItems}
          onChangeText={onChangeText}
          value={message}
          multiline
        />
        <TouchableOpacity>
          <Ionicons 
            onPress={onSend} 
            name="send" 
            size={scale(22)} 
            color={'rgb(5, 153, 179)'} 
          />
        </TouchableOpacity>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(5),
  },
  messageInput: {
    flex: 1,
    marginRight: scale(12),
    borderRadius: scale(8),
    padding: scale(10),
    color: '#fff',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
  },
});
export default MessageInput;