import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlantProvider } from '@/lib/store';
import { configureHandler } from '@/lib/notifications';
import { colors } from '@/lib/theme';

configureHandler();

/** Toccando il promemoria serale si apre il calendario. */
function useNotificationRouting() {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const route = response?.notification.request.content.data?.route;
    if (typeof route === 'string') {
      router.push(route as never);
      Notifications.clearLastNotificationResponseAsync();
    }
  }, [response]);
}

export default function RootLayout() {
  useNotificationRouting();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PlantProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
            }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="plant/[id]" />
            <Stack.Screen name="edit/[id]" options={{ presentation: 'modal' }} />
          </Stack>
        </PlantProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
