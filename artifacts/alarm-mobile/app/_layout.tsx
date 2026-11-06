import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { AlarmRuntimeProvider } from '@/lib/alarm-runtime';
import { LocalDataProvider } from '@/lib/local-data';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <LocalDataProvider>
      <AlarmRuntimeProvider>
        <Stack screenOptions={{ headerBackTitle: 'Indietro', headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="alarm/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="alarm/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="alarm/active/[id]" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        </Stack>
      </AlarmRuntimeProvider>
    </LocalDataProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <RootLayoutNav />
          </KeyboardProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
