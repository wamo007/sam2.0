import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDbIfNeeded } from '@/configs/Database';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    OrbitronReg: require('../assets/fonts/Orbitron-Regular.ttf'),
    OrbitronSb: require('../assets/fonts/Orbitron-SemiBold.ttf'),
    OrbitronMd: require('../assets/fonts/Orbitron-Medium.ttf'),
    OrbitronBold: require('../assets/fonts/Orbitron-Bold.ttf'),
    OrbitronEx: require('../assets/fonts/Orbitron-ExtraBold.ttf'),
    MegamaxJonathanToo: require('../assets/fonts/MegamaxJonathanToo.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SQLiteProvider 
        databaseName='chatSAM.db'
        onInit={async (db) => {
          await migrateDbIfNeeded(db);
        }}
      >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(routes)/onboarding/index" />
        <Stack.Screen name="(routes)/home/index" />
      </Stack>
      </SQLiteProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
