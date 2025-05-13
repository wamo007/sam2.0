import { scale } from "react-native-size-matters";
import { TextStyle } from 'react-native';

export interface TextSegment {
    text: string;
    style?: TextStyle;
}

export interface onBoardingDataType {
    id: number;
    title: string | TextSegment[];
    titleStyle: TextStyle;
    description: string;
    image: any;
}

export const onBoardingData:onBoardingDataType[] = [
    {
        id: 1,
        title: 'S A M',
        titleStyle: {
            fontSize: scale(60),
            height: scale(60),
            fontFamily: 'MegamaxJonathanToo',
            color: '#fff',
            margin: scale(10),
        },
        description: 'Secure AI Mate',
        image: require('../assets/images/sam-female.png'),
    },
    {
        id: 2,
        title: [
            {text: 'AI Companion that ', style: {color: '#fff'}},
            {text: 'Remembers', style: {color: '#34fff8'}}
        ],
        titleStyle: {
            fontSize: scale(20),
            height: scale(50),
            textAlign: 'center',
            fontFamily: 'MegamaxJonathanToo',
        },
        description: "Powered by advanced local AI that remembers previous interactions and learns naturally while working completely offline.",
        image: require('../assets/images/LLMem.png'),
    },
    {
        id: 3,
        title: [
            {text: 'Conversations that are ', style: {color: '#fff'}},
            {text: 'Truly Private', style: {color: '#34fff8'}}
        ],
        titleStyle: {
            fontSize: scale(20),
            height: scale(50),
            textAlign: 'center',
            fontFamily: 'MegamaxJonathanToo',
        },
        description: "Talk naturally knowing your voice and data stay 100% private on your device.\nNo cloud connection is required to operate.",
        image: require('../assets/images/micLock.png'),
    },
];
