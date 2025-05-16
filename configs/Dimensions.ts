import { Dimensions } from 'react-native';
import { scale as reactNativeScale } from 'react-native-size-matters';

// const isTablet = width >= 768; // Common tablet breakpoint
const isSmallPhone = Dimensions.get('window').height <= 768;

export const scale = (size: number): number => {
  if (isSmallPhone) {
    // Reduce scaling factor for tablets
    return reactNativeScale(size * 0.6);
  }
  return reactNativeScale(size);
};

export const isTabletDevice = isSmallPhone;
export const isSmallDevice = isSmallPhone;