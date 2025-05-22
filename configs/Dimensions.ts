import { Dimensions } from 'react-native';
import { scale as reactNativeScale } from 'react-native-size-matters';

export const scale = (size: number): number => {
  if (Dimensions.get('window').width > Dimensions.get('window').height) {
    return reactNativeScale(size * 0.5);
  }
  if (Dimensions.get('window').height <= 768) {
    return reactNativeScale(size * 0.9);
  }
  return reactNativeScale(size);
};

export const isTabletDevice = Dimensions.get('window').width > Dimensions.get('window').height;
export const isSmallDevice = Dimensions.get('window').height <= 768 && Dimensions.get('window').width <= Dimensions.get('window').height;
console.log(isSmallDevice)
console.log(isTabletDevice)