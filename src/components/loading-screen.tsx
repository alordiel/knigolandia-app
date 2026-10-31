import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ICON = require('../../assets/images/icon.png');

/** Full-screen placeholder: app icon + "Зареждане...". */
export function LoadingScreen() {
  const c = useTheme();
  return (
    <View
      style={[styles.screen, { backgroundColor: c.background }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Зареждане">
      <Image source={ICON} style={styles.icon} contentFit="cover" accessibilityIgnoresInvertColors />
      <Text style={[styles.text, { color: c.textMuted }]}>Зареждане...</Text>
    </View>
  );
}

/**
 * Renders <LoadingScreen> first and mounts `children` only after that frame is on screen,
 * so a tap gets instant feedback instead of freezing while a heavy screen builds.
 */
export function Deferred({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setReady(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return ready ? children : <LoadingScreen />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  icon: { width: 88, height: 88, borderRadius: 20 },
  text: { fontFamily: FontFamily.sans, fontSize: 15 },
});
