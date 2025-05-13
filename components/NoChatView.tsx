import { memo, useMemo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { scale, isTabletDevice } from '@/configs/Dimensions'

interface NoChatViewProps {
    ttsActive: boolean;
    character: string;
    isThinking: boolean;
}

const characterImages = {
    male: {
        talking: require('../assets/images/talking-male.gif'),
        silent: require('../assets/images/silent-male.png')
    },
    female: {
        talking: require('../assets/images/talking-female.gif'),
        silent: require('../assets/images/silent-female.png')
    }
};

export const NoChatView = memo(({ ttsActive, character, isThinking }: NoChatViewProps) => {
    const selectedCharacter = character || 'female';

    const currentImage = useMemo(() => {
        return ttsActive 
            ? characterImages[selectedCharacter as keyof typeof characterImages].talking
            : characterImages[selectedCharacter as keyof typeof characterImages].silent;
    }, [ttsActive, selectedCharacter]);

    return (
        <View style={styles.header}>
            { isThinking &&
                <Image 
                    source={require('../assets/images/Thinking.gif')}
                    style={styles.bubble}
                    resizeMode="contain"
                />
            }
            <Image 
                key={`${selectedCharacter}-${ttsActive}`}
                source={currentImage}
                style={styles.headerImage}
                resizeMode="contain"
                fadeDuration={0}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    header: {
        position: 'relative',
        flexDirection: 'row',
        justifyContent: 'center',
        bottom: '-15%'
    },
    bubble: {
        position: 'absolute',
        right: scale(40),
        top: scale(30),
        height: scale(30),
    },
    headerImage: {
        height: scale(350),
        width: scale(350),
        alignSelf: 'center'
    },
});