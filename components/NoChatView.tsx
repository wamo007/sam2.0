import { memo, useMemo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { scale } from 'react-native-size-matters';

interface NoChatViewProps {
    ttsActive: boolean;
    character: string;
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

export const NoChatView = memo(({ ttsActive, character }: NoChatViewProps) => {
    const selectedCharacter = character || 'female';

    const currentImage = useMemo(() => {
        return ttsActive 
            ? characterImages[selectedCharacter as keyof typeof characterImages].talking
            : characterImages[selectedCharacter as keyof typeof characterImages].silent;
    }, [ttsActive, selectedCharacter]);

    return (
        <View style={styles.header}>
            <Image 
                key={`${selectedCharacter}-${ttsActive}`}
                source={currentImage}
                style={styles.headerImage}
                fadeDuration={0}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        bottom: '-15%'
    },
    headerImage: {
        height: scale(350),
        width: scale(350),
    },
});