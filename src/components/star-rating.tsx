import { StyleSheet, Text, View } from 'react-native';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** "4.5" → "4,5" (Bulgarian decimal comma). */
export const formatRating = (rating: number) => String(rating).replace('.', ',');

/** 5 stars with halves drawn as a clipped filled overlay; the number follows. */
export function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const c = useTheme();
  const star = { fontSize: size, lineHeight: size + 2, width: size };

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Рейтинг ${formatRating(rating)} от 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <View key={i} style={{ width: size, height: size + 2 }}>
            <Text style={[styles.glyph, star, { color: c.starEmpty }]}>★</Text>
            {fill > 0 && (
              <View style={[styles.overlay, { width: size * fill }]}>
                <Text style={[styles.glyph, star, { color: c.star }]}>★</Text>
              </View>
            )}
          </View>
        );
      })}
      <Text style={[styles.value, { color: c.textSecondary, fontSize: size - 2 }]}>
        {formatRating(rating)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  glyph: { textAlign: 'center' },
  overlay: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  value: { marginLeft: 6, fontFamily: FontFamily.sansSemiBold },
});
