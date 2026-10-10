import { Cairo_500Medium, Cairo_700Bold, Cairo_800ExtraBold, useFonts } from '@expo-google-fonts/cairo';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';

void SplashScreen.preventAutoHideAsync();

// واجهة عربية من اليمين لليسار. على الجوال يسري التغيير بعد إعادة تشغيل التطبيق أول مرة.
if (Platform.OS === 'web') {
  if (typeof document !== 'undefined') {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  }
} else {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

/** يوجّه حسب حالة الجلسة: بلا جلسة → الدخول، ومع جلسة → خارج شاشة الدخول. */
function AuthGate() {
  const { session } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const inLogin = (segments as string[])[0] === 'login';

  useEffect(() => {
    if (session.status === 'loading') return;
    if (session.status === 'signedOut' && !inLogin) router.replace('/login');
    if (session.status !== 'signedOut' && inLogin) router.replace('/');
  }, [session.status, inLogin, router]);

  return null;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Cairo_500Medium, Cairo_700Bold, Cairo_800ExtraBold });

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AuthGate />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.navy },
            headerTintColor: '#fff',
            headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17 },
            headerTitleAlign: 'center',
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: colors.canvas },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(employee)" options={{ headerShown: false }} />
          <Stack.Screen name="(manager)" options={{ headerShown: false }} />
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
