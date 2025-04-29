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

export const NoChatView = ({ ttsActive, character }: NoChatViewProps) => {
    const selectedCharacter = character || 'female';

    return (
        <View style={styles.header}>

            <Image 
                source={ttsActive 
                    ? characterImages[selectedCharacter as keyof typeof characterImages].talking
                    : characterImages[selectedCharacter as keyof typeof characterImages].silent
                } 
                style={styles.headerImage} 
            />
        </View>
    );
};

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