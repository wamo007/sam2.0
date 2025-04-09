import { View, Text } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function index() {

  const [isOnboarding, setIsOnboarding] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
        try {
            const onboarding = await AsyncStorage.getItem('onboarding');
            if (onboarding === null) {
                // First launch, show onboarding
                await AsyncStorage.setItem('onboarding', 'completed');
                setIsOnboarding(true);
            } else {
                // Onboarding already completed
                setIsOnboarding(false);
            }
        } catch (error) {
            console.error("Error checking onboarding status:", error);
        }
        setIsLoading(false);
    };
    checkOnboarding();
  }, []);

  if (isLoading) return null;

  return <Redirect href={isOnboarding ? "/(routes)/onboarding" : "/(routes)/home"} />
}