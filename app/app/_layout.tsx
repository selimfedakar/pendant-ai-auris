import { Stack, router, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deviceCodeService } from '../services/DeviceCodeService';

const ONBOARDING_KEY = '@auris:onboarding_complete';

SplashScreen.preventAutoHideAsync();

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error('[Auris] Uncaught:', error); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: '#fff', textAlign: 'center', fontSize: 16 }}>
            Something went wrong. Please restart the app.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const navState = useRootNavigationState();
  const [codeStatus, setCodeStatus] = useState<'pending' | 'found' | 'missing'>('pending');

  // Async check runs once on mount — result stored in state
  useEffect(() => {
    deviceCodeService.getCode().then((code) => {
      setCodeStatus(code ? 'found' : 'missing');
    });
  }, []);

  // Navigate only when BOTH the async check is done AND the navigator is ready.
  // router.replace called before navState.key is set is a silent no-op in Expo Router.
  useEffect(() => {
    if (!navState?.key || codeStatus === 'pending') return;
    if (codeStatus === 'missing') {
      router.replace('/activate');
      SplashScreen.hideAsync();
      return;
    }
    // Code found — check if onboarding has been completed
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      if (!value) {
        router.replace('/onboarding');
      }
      // If value is set, the navigator stays on /(tabs) (default Stack route)
      SplashScreen.hideAsync();
    });
  }, [navState?.key, codeStatus]);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="activate" />
          <Stack.Screen name="onboarding" />
        </Stack>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
