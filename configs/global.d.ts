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
