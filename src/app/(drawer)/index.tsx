import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BookList } from '@/components/book-list';
import { OfflineBanner } from '@/components/offline-banner';
import { ScreenHeader } from '@/components/screen-header';
import { FontFamily, type Palette } from '@/constants/theme';
import { useOnline } from '@/hooks/use-online';
import { useTablet } from '@/hooks/use-tablet';
import { useTheme } from '@/hooks/use-theme';
import { useCatalog, type Book } from '@/lib/catalog';

type Category = Book['category'];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'fiction', label: 'Художествена' },
  { value: 'nonfiction', label: 'Нехудожествена' },
];

export default function HomeScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const category: Category = params.category === 'nonfiction' ? 'nonfiction' : 'fiction';
  const c = useTheme();
  const tablet = useTablet();
  const online = useOnline();
  const styles = useMemo(() => createStyles(c, tablet), [c, tablet]);

  const catalog = useCatalog((s) => s.catalog);
  const status = useCatalog((s) => s.status);
  const load = useCatalog((s) => s.load);

  // Genre filter belongs to the category it was picked in; switching tabs shows "Всички".
  const [filter, setFilter] = useState<{ category: Category; genre: number } | null>(null);
  const genre = filter?.category === category ? filter.genre : null;

  // Newest first — post IDs follow publish order.
  const inCategory = useMemo(
    () => (catalog?.books ?? []).filter((b) => b.category === category).sort((a, b) => b.id - a.id),
    [catalog, category]
  );

  // Chips: genres present in this category, most-reviewed first.
  const genres = useMemo(() => {
    const counts = new Map<number, number>();
    for (const b of inCategory) for (const g of b.genre_id) counts.set(g, (counts.get(g) ?? 0) + 1);
    return [...counts]
      .filter(([id]) => catalog?.genres[id])
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => ({ id, name: catalog!.genres[id] }));
  }, [inCategory, catalog]);

  const books = useMemo(
    () => (genre == null ? inCategory : inCategory.filter((b) => b.genre_id.includes(genre))),
    [inCategory, genre]
  );

  let list: React.ReactNode;
  if (catalog) {
    list = (
      <BookList
        books={books}
        listKey={category}
        ListEmptyComponent={<Text style={styles.empty}>Няма ревюта в тази категория.</Text>}
      />
    );
  } else if (status === 'error') {
    list = (
      <View style={styles.center}>
        <Text style={styles.messageTitle}>Каталогът не е зареден</Text>
        <Text style={styles.messageText}>Свържете се с интернет, за да изтеглите ревютата.</Text>
        <Pressable accessibilityRole="button" onPress={load} style={styles.messageButton}>
          <Text style={styles.messageButtonText}>Опитай отново</Text>
        </Pressable>
      </View>
    );
  } else {
    list = (
      <View style={styles.center}>
        <ActivityIndicator color={c.textMuted} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Книголандия"
        large={tablet}
        action={{ icon: 'search', label: 'Търсене', onPress: () => router.push('/search') }}
      />
      {!online && <OfflineBanner />}
      <View style={styles.column}>
        <View style={styles.tabs} accessibilityRole="tablist">
          {CATEGORIES.map((cat) => {
            const active = cat.value === category;
            return (
              <Pressable
                key={cat.value}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => router.setParams({ category: cat.value })}
                style={[styles.tab, active ? styles.tabActive : styles.tabInactive]}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {genres.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chips}>
            <Chip label="Всички" active={genre == null} onPress={() => setFilter(null)} styles={styles} />
            {genres.map((g) => (
              <Chip
                key={g.id}
                label={g.name}
                active={genre === g.id}
                onPress={() => setFilter({ category, genre: g.id })}
                styles={styles}
              />
            ))}
          </ScrollView>
        )}
        {list}
      </View>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(c: Palette, tablet: boolean) {
  const gutter = tablet ? 24 : 16;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    column: { flex: 1, width: '100%', maxWidth: tablet ? 1100 : undefined, alignSelf: 'center' },
    tabs: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: gutter,
      paddingTop: 8,
      paddingBottom: 12,
      maxWidth: tablet ? 520 + gutter * 2 : undefined,
    },
    tab: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    tabActive: { backgroundColor: c.accent },
    tabInactive: { borderWidth: 1, borderColor: c.border },
    tabText: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.text },
    tabTextActive: { fontFamily: FontFamily.sansSemiBold, color: c.onAccent },
    chipsScroll: { flexGrow: 0 },
    chips: { gap: 8, paddingHorizontal: gutter, paddingBottom: tablet ? 16 : 12 },
    chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: c.backgroundElement },
    chipActive: { backgroundColor: c.accentSoft },
    chipText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.textSecondary },
    chipTextActive: { fontFamily: FontFamily.sansMedium, color: c.accentText },
    empty: {
      fontFamily: FontFamily.sans,
      fontSize: 15,
      color: c.textMuted,
      textAlign: 'center',
      paddingVertical: 48,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
    messageTitle: { fontFamily: FontFamily.serifBold, fontSize: 18, color: c.text, textAlign: 'center' },
    messageText: {
      fontFamily: FontFamily.sans,
      fontSize: 15,
      lineHeight: 21,
      color: c.textMuted,
      textAlign: 'center',
    },
    messageButton: {
      marginTop: 12,
      height: 44,
      paddingHorizontal: 20,
      borderRadius: 22,
      backgroundColor: c.accent,
      justifyContent: 'center',
    },
    messageButtonText: { fontFamily: FontFamily.sansSemiBold, fontSize: 15, color: c.onAccent },
  });
}
