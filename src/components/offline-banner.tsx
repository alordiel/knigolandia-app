import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function OfflineBanner() {
  const c = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: c.offlineBanner }]} accessibilityRole="alert">
      <Icon name="wifiOff" color={c.offlineBannerText} size={18} />
      <Text style={[styles.text, { color: c.offlineBannerText }]}>Офлайн режим · изображенията са скрити</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: { fontFamily: FontFamily.sans, fontSize: 13 },
});
