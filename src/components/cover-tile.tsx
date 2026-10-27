import { Image } from 'expo-image';
import { memo, useMemo } from 'react';
import { PixelRatio, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { coverUrl, type Book } from '@/lib/catalog';
import { offlineCoverUri } from '@/lib/offline';

type Props = {
  book: Book;
  author: string;
  width: number;
  /** Downloaded for offline reading — shows the check badge. */
  offline: boolean;
  /** Prefer the downloaded cover file (no network). */
  preferLocalCover: boolean;
  onPress: (book: Book) => void;
  onLongPress?: (book: Book) => void;
};

/** Grid tile: 2:3 cover with optional offline check, author below (docs/design/Library.dc.html). */
export const CoverTile = memo(function CoverTile({
  book,
  author,
  width,
  offline,
  preferLocalCover,
  onPress,
  onLongPress,
}: Props) {
  const c = useTheme();
  const source = useMemo(() => {
    const local = preferLocalCover ? offlineCoverUri(book.id) : null;
    return local ?? coverUrl(book, PixelRatio.get() * width > 200 ? 'large' : 'thumb');
  }, [book, preferLocalCover, width]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${book.title}, ${author}${offline ? ', офлайн' : ''}`}
      accessibilityHint={onLongPress ? 'Задръжте, за да премахнете от списъка' : undefined}
      onPress={() => onPress(book)}
      onLongPress={onLongPress && (() => onLongPress(book))}
      style={({ pressed }) => [{ width, gap: 6 }, pressed && { opacity: 0.7 }]}>
      <View style={[styles.cover, { width, height: width * 1.5, backgroundColor: c.placeholder }]}>
        <Text style={[styles.coverTitle, { color: c.textSecondary }]} numberOfLines={4}>
          {book.title}
        </Text>
        <Image
          source={source}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="disk"
          recyclingKey={String(book.id)}
          transition={150}
          accessibilityIgnoresInvertColors
        />
        {offline && (
          <View style={[styles.badge, { backgroundColor: c.card }]}>
            <Icon name="check" color={c.accent} size={13} />
          </View>
        )}
      </View>
      <Text style={[styles.author, { color: c.textSecondary }]} numberOfLines={2}>
        {author}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cover: { borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end', padding: 8 },
  coverTitle: { fontFamily: FontFamily.serifBold, fontSize: 12, lineHeight: 14 },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  author: { fontFamily: FontFamily.sans, fontSize: 12, lineHeight: 16 },
});
