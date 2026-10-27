import { Image } from 'expo-image';
import { memo, useMemo } from 'react';
import { PixelRatio, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { StarRating } from '@/components/star-rating';
import { FontFamily, type Palette } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { coverUrl, type Book } from '@/lib/catalog';
import { offlineCoverUri } from '@/lib/offline';

type Props = {
  book: Book;
  author: string;
  translator: string;
  genre: string | undefined;
  offline: boolean;
  /** Prefer the downloaded cover file (no network). */
  preferLocalCover: boolean;
  tablet: boolean;
  onPress: (book: Book) => void;
};

export const BookCard = memo(function BookCard({
  book,
  author,
  translator,
  genre,
  offline,
  preferLocalCover,
  tablet,
  onPress,
}: Props) {
  const c = useTheme();
  const styles = useMemo(() => createStyles(c, tablet), [c, tablet]);
  const coverWidth = tablet ? 96 : 72;
  const source = useMemo(() => {
    const local = preferLocalCover ? offlineCoverUri(book.id) : null;
    return local ?? coverUrl(book, PixelRatio.get() * coverWidth > 200 ? 'large' : 'thumb');
  }, [book, preferLocalCover, coverWidth]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${book.heading}, ${author}`}
      onPress={() => onPress(book)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={styles.cover}>
        <Text style={styles.coverTitle} numberOfLines={4}>
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
      </View>
      <View style={styles.body}>
        <Text style={styles.headline}>{book.heading}</Text>
        {!!author && <Text style={styles.author}>{author}</Text>}
        {!!translator && <Text style={styles.translator}>Превод: {translator}</Text>}
        <StarRating rating={book.rating} size={tablet ? 16 : 14} />
        <View style={styles.meta}>
          {!!genre && <Text style={styles.genre}>{genre}</Text>}
          {book['reading-time'] > 0 && <Text style={styles.metaText}>{book['reading-time']} мин</Text>}
          {offline && (
            <View style={styles.offline}>
              <Icon name="download" color={c.accent} size={13} />
              <Text style={[styles.metaText, { color: c.accent }]}>офлайн</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

function createStyles(c: Palette, tablet: boolean) {
  return StyleSheet.create({
    card: {
      flex: 1,
      flexDirection: 'row',
      gap: tablet ? 16 : 14,
      padding: tablet ? 14 : 12,
      borderRadius: 12,
      backgroundColor: c.card,
      boxShadow: '0 1px 2px rgba(28,31,30,0.06)',
    },
    cover: {
      width: tablet ? 96 : 72,
      height: tablet ? 144 : 108,
      borderRadius: 4,
      overflow: 'hidden',
      backgroundColor: c.placeholder,
      justifyContent: 'flex-end',
      padding: 8,
    },
    coverTitle: {
      fontFamily: FontFamily.serifBold,
      fontSize: tablet ? 12 : 11,
      lineHeight: tablet ? 14 : 13,
      color: c.textSecondary,
    },
    body: { flex: 1, minWidth: 0, gap: tablet ? 5 : 4 },
    headline: {
      fontFamily: FontFamily.serifBold,
      fontSize: tablet ? 18 : 16,
      lineHeight: tablet ? 23 : 21,
      color: c.text,
    },
    author: { fontFamily: FontFamily.sans, fontSize: tablet ? 14 : 13, color: c.textSecondary },
    translator: { fontFamily: FontFamily.sans, fontSize: tablet ? 13 : 12, color: c.textMuted },
    meta: {
      marginTop: 'auto',
      paddingTop: 2,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
    },
    genre: {
      fontFamily: FontFamily.sans,
      fontSize: tablet ? 13 : 12,
      color: c.textMuted,
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 6,
      overflow: 'hidden',
      backgroundColor: c.divider,
    },
    metaText: { fontFamily: FontFamily.sans, fontSize: tablet ? 13 : 12, color: c.textMuted },
    offline: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  });
}
