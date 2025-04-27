import { View, StyleSheet, Image } from 'react-native';
import { scale } from 'react-native-size-matters';

interface NoChatViewProps {
    ttsActive: boolean;
}

export const NoChatView = ({ ttsActive }: NoChatViewProps) => {

    return (
        <View style={styles.header}>
            { ttsActive 
                ? <Image source={require('../assets/images/talking.gif')} style={styles.headerImage} />
                : <Image source={require('../assets/images/silent.png')} style={styles.headerImage} />
            }
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