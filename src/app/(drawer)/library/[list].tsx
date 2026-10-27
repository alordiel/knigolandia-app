import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverTile } from '@/components/cover-tile';
import { OfflineBanner } from '@/components/offline-banner';
import { ScreenHeader } from '@/components/screen-header';
import { FontFamily, type Palette } from '@/constants/theme';
import { useOfflineIds } from '@/hooks/use-offline-ids';
import { useOnline } from '@/hooks/use-online';
import { useTablet } from '@/hooks/use-tablet';
import { useTheme } from '@/hooks/use-theme';
import { names, useCatalog, type Book } from '@/lib/catalog';
import { formatBytes, plural } from '@/lib/format';
import { offlineSize } from '@/lib/offline';
import { useLists } from '@/stores/lists';

type ListName = 'bookmarks' | 'wishlist' | 'readLater';

const LISTS: Record<ListName, { title: string; emptyTitle: string; emptyText: string }> = {
  bookmarks: {
    title: 'Отметки',
    emptyTitle: 'Няма отметки',
    emptyText: 'Докоснете „Отметни“ в ревю, за да го запазите тук.',
  },
  wishlist: {
    title: 'Списък с желания',
    emptyTitle: 'Списъкът с желания е празен',
    emptyText: 'Добавете книги с „Желания“ от страницата на ревюто.',
  },
  readLater: {
    title: 'За по-късно',
    emptyTitle: 'Нищо за по-късно',
    emptyText: 'Ревютата, добавени „За по-късно“, се изтеглят за четене без интернет.',
  },
};

const GAP = 12;

export default function LibraryScreen() {
  const { list } = useLocalSearchParams<{ list: string }>();
  if (!(list in LISTS)) return <Redirect href="/" />;
  return <LibraryList list={list as ListName} />;
}

function LibraryList({ list }: { list: ListName }) {
  const config = LISTS[list];
  const c = useTheme();
  const tablet = useTablet();
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(c, tablet), [c, tablet]);

  const catalog = useCatalog((s) => s.catalog);
  const byId = useCatalog((s) => s.byId);
  const ids = useLists((s) => s[list]);
  const toggle = useLists((s) => s.toggle);
  const toggleReadLater = useLists((s) => s.toggleReadLater);
  const offlineIds = useOfflineIds();

  // Most recently added first (the store prepends); books gone from the catalogue are skipped.
  const books = useMemo(() => ids.flatMap((id) => byId.get(id) ?? []), [ids, byId]);
  const bytes = useMemo(() => (list === 'readLater' ? offlineSize(ids) : 0), [list, ids]);

  // Three columns on phones; as many ~128pt tiles as fit on wider screens.
  const gutter = tablet ? 24 : 16;
  const contentWidth = Math.min(windowWidth, 1100) - gutter * 2;
  const columns = Math.max(3, Math.floor((contentWidth + GAP) / (128 + GAP)));
  const tileWidth = Math.floor((contentWidth - GAP * (columns - 1)) / columns);

  const openBook = useCallback((book: Book) => {
    router.push({ pathname: '/review/[id]', params: { id: String(book.id) } });
  }, []);

  const confirmRemove = useCallback(
    (book: Book) => {
      Alert.alert(
        book.title,
        list === 'readLater' ? 'Премахване от „За по-късно“ и изтриване от устройството?' : `Премахване от „${config.title}“?`,
        [
          { text: 'Отказ', style: 'cancel' },
          {
            text: 'Премахни',
            style: 'destructive',
            onPress: () => {
              if (list === 'readLater') {
                toggleReadLater(book).catch(() => Alert.alert('Неуспешно премахване', 'Опитайте отново.'));
              } else {
                toggle(list, book.id);
              }
            },
          },
        ]
      );
    },
    [list, config.title, toggle, toggleReadLater]
  );

  const renderItem = useCallback(
    ({ item }: { item: Book }) => (
      <CoverTile
        book={item}
        author={names(catalog?.authors, item.author_id).join(', ')}
        width={tileWidth}
        offline={offlineIds.has(item.id)}
        preferLocalCover={!online && offlineIds.has(item.id)}
        onPress={openBook}
        onLongPress={confirmRemove}
      />
    ),
    [catalog, tileWidth, offlineIds, online, openBook, confirmRemove]
  );

  const summary =
    list === 'readLater' && books.length > 0 ? (
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryCount}>{plural(books.length, 'ревю', 'ревюта')} на устройството</Text>
          <Text style={styles.summarySize}>{formatBytes(bytes)}</Text>
        </View>
        <Text style={styles.summaryNote}>Всичко добавено тук се изтегля за четене без интернет.</Text>
      </View>
    ) : undefined;

  let body: React.ReactNode;
  if (!catalog) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={c.textMuted} />
      </View>
    );
  } else {
    body = (
      <FlatList
        key={columns}
        data={books}
        keyExtractor={(b) => String(b.id)}
        renderItem={renderItem}
        numColumns={columns}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={summary}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{config.emptyTitle}</Text>
            <Text style={styles.emptyText}>{config.emptyText}</Text>
          </View>
        }
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
        style={styles.column}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={config.title} align="left" large={tablet} />
      {!online && <OfflineBanner />}
      {body}
    </View>
  );
}

function createStyles(c: Palette, tablet: boolean) {
  const gutter = tablet ? 24 : 16;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    column: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
    list: { paddingHorizontal: gutter, paddingTop: 4, gap: 16 },
    row: { gap: GAP },
    summary: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: c.card,
      gap: 8,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    summaryCount: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.text },
    summarySize: { fontFamily: FontFamily.sans, fontSize: 13, color: c.textMuted },
    summaryNote: { fontFamily: FontFamily.sans, fontSize: 12, lineHeight: 17, color: c.textMuted },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 64, gap: 8 },
    emptyTitle: { fontFamily: FontFamily.serifBold, fontSize: 18, color: c.text, textAlign: 'center' },
    emptyText: {
      fontFamily: FontFamily.sans,
      fontSize: 15,
      lineHeight: 21,
      color: c.textMuted,
      textAlign: 'center',
      maxWidth: 320,
    },
  });
}
