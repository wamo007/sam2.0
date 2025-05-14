import { Dimensions } from 'react-native';
import { scale as reactNativeScale, verticalScale as reactNativeVerticalScale } from 'react-native-size-matters';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768; // Common tablet breakpoint
const isSmallPhone = height <= 768;

export const scale = (size: number): number => {
  if (isTablet) {
    // Reduce scaling factor for tablets
    return reactNativeScale(size * 0.7);
  } else if (isSmallPhone) {
    // Reduce scaling factor for tablets
    return reactNativeScale(size * 0.9);
  }
  return reactNativeScale(size);
};

export const verticalScale = (size: number): number => {
  if (isTablet) {
    // Reduce vertical scaling for tablets
    return reactNativeVerticalScale(size * 0.7);
  } else if (isSmallPhone) {
    // Reduce scaling factor for tablets
    return reactNativeScale(size * 0.9);
  }
  return reactNativeVerticalScale(size);
};

export const isTabletDevice = isTablet;
export const isSmallDevice = isSmallPhone;