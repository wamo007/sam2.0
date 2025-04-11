import { StyleSheet, Text, View, StatusBar, Image, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Dimensions, Pressable } from 'react-native'
import React, { useRef, useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { scale, verticalScale } from 'react-native-size-matters'
import { onBoardingData } from '@/constants/OnboardingPages'
import type { onBoardingDataType, TextSegment } from '@/constants/OnboardingPages'
import AntDesign from '@expo/vector-icons/AntDesign'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router'

export default function OnBoardingScreen() {

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(
        contentOffsetX / event.nativeEvent.layoutMeasurement.width
    );
    setActiveIndex(currentIndex);
  };

  // const handleSkip = async () => {
  //   const nextIndex = activeIndex + 1;
  //   if (nextIndex < onBoardingData.length) {
  //     scrollViewRef.current?.scrollTo({ 
  //       x: Dimensions.get('window').width * (onBoardingData.length - 1), animated: true 
  //     });
  //     setActiveIndex(nextIndex);
  //   } else {
  //     await AsyncStorage.setItem('onboarding', 'true');
  //     router.push("/(routes)/home");
  //   }
  // };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('onboarding', 'completed'); // Save onboarding status as completed
      router.push("/(routes)/home"); // Redirect to the home screen
    } catch (error) {
      console.error("Error saving onboarding status:", error);
    }
  };
  
  return (
    <LinearGradient
        colors={['#250152','#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={ styles.container }
    >
      <StatusBar barStyle="light-content" />
      <Pressable 
        style={styles.skipContainer}
        onPress={handleSkip}
      >
        <Text style={styles.skipText}>{(activeIndex + 1 < onBoardingData.length) ? 'Skip' : 'Get Started!' }</Text>
        <AntDesign name="arrowright" size={scale(20)} color="rgb(255, 255, 255)" />
      </Pressable>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        ref={scrollViewRef}
      >
        {onBoardingData.map((item:onBoardingDataType, index:number) => (
            <View key={index} style={ styles.slide }>
                <Image source={item.image} style={{ width: scale(290), height: scale(290) }} />
                <Text style={item.titleStyle}>
                    {Array.isArray(item.title) ? 
                        item.title.map((segment: TextSegment, i: number) => (
                            <Text key={i} style={[item.titleStyle, segment.style]}>{segment.text}</Text>
                        )) : 
                        item.title
                    }
                </Text>
                <Text style={styles.description}>{item.description}</Text>
            </View>
        ))}
      </ScrollView>
      <View style={styles.paginationContainer}>
        {onBoardingData.map((_, index) => (
            <View 
              key={index} 
              style={[styles.dot, 
                { backgroundColor: activeIndex === index ? '#34fff8' : 'rgba(255, 255, 255, 0.5)' }]} />
        ))}
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#131313',
    },
    slide: {
        width: Dimensions.get('window').width,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scale(20),
    },
    description: {
        fontSize: scale(16),
        fontFamily: 'OrbitronBold',
        letterSpacing: 2,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
    },
    paginationContainer: {
        position: 'absolute',
        bottom: verticalScale(60),
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: scale(8),
    },
    dot: {
      width: scale(8),
      height: scale(8),
      borderRadius: 100,
      marginHorizontal: scale(2),
    },
    skipContainer: {
        position: 'absolute',
        top: verticalScale(45),
        right: scale(30),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
        padding: scale(10),
        zIndex: 100,
    },
    skipText: {
      fontSize: scale(14),
      fontFamily: 'OrbitronBold',
      letterSpacing: 2,
      color: 'rgb(255, 255, 255)',
    }
});
