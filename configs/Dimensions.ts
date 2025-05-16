import { Dimensions } from 'react-native';
import { scale as reactNativeScale } from 'react-native-size-matters';

const isTablet = Dimensions.get('window').width > Dimensions.get('window').height; // Common tablet breakpoint
const isSmallPhone = Dimensions.get('window').height <= 768;

export const scale = (size: number): number => {
  if (isTablet) {
    return reactNativeScale(size * 0.6);
  }
  if (isSmallPhone) {
    // Reduce scaling factor for tablets
    return reactNativeScale(size * 0.9);
  }
  return reactNativeScale(size);
};

export const isTabletDevice = isTablet;
export const isSmallDevice = isSmallPhone;