import { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans';
import { Literata_400Regular, Literata_500Medium, Literata_700Bold } from '@expo-google-fonts/literata';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useScheme } from '@/hooks/use-theme';
import { useCatalog } from '@/lib/catalog';
import { reviewIdFrom } from '@/lib/push';
import { runStartupTasks } from '@/lib/startup';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Show "Ново ревю" pushes even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const scheme = useScheme();
  const loadCatalog = useCatalog((s) => s.load);
  const catalog = useCatalog((s) => s.catalog);
  const notification = Notifications.useLastNotificationResponse();
  const [fontsLoaded] = useFonts({
    Literata_400Regular,
    Literata_500Medium,
    Literata_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
  });

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (catalog) runStartupTasks(catalog, queryClient);
  }, [catalog]);

  // Tapping a push opens its review (also when it launched the app).
  const notificationKey = notification?.notification.request.identifier;
  const notificationReviewId = reviewIdFrom(notification);
  useEffect(() => {
    if (!fontsLoaded || notificationReviewId == null) return;
    router.push({ pathname: '/review/[id]', params: { id: String(notificationReviewId) } });
  }, [fontsLoaded, notificationKey, notificationReviewId]);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(drawer)" />
          <Stack.Screen name="review/[id]" />
          <Stack.Screen name="browse/[kind]/[id]" />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
