import { router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet, type ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookCard } from '@/components/book-card';
import { useOfflineIds } from '@/hooks/use-offline-ids';
import { useOnline } from '@/hooks/use-online';
import { useTablet } from '@/hooks/use-tablet';
import { names, useCatalog, type Book } from '@/lib/catalog';

type Props = {
  books: Book[];
  /** Remounts the list (back to top) when it changes, e.g. on a tab switch. */
  listKey?: string;
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
  keyboardDismissMode?: 'none' | 'on-drag';
};

/** BookCard list: one column on phones, two on iPad (docs/DESIGN.md → iPad). */
export function BookList({ books, listKey = '', ListHeaderComponent, ListEmptyComponent, keyboardDismissMode }: Props) {
  const tablet = useTablet();
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const catalog = useCatalog((s) => s.catalog);
  const offlineIds = useOfflineIds();

  const openBook = useCallback((book: Book) => {
    router.push({ pathname: '/review/[id]', params: { id: String(book.id) } });
  }, []);

  const renderItem = useCallback<ListRenderItem<Book>>(
    ({ item }) => (
      <BookCard
        book={item}
        author={names(catalog?.authors, item.author_id).join(', ')}
        translator={names(catalog?.translators, item.translator_id).join(', ')}
        genre={names(catalog?.genres, item.genre_id)[0]}
        offline={offlineIds.has(item.id)}
        preferLocalCover={!online && offlineIds.has(item.id)}
        tablet={tablet}
        onPress={openBook}
      />
    ),
    [catalog, offlineIds, online, tablet, openBook]
  );

  const gutter = tablet ? 24 : 16;
  return (
    <FlatList
      key={`${listKey}-${tablet ? 2 : 1}`}
      data={books}
      keyExtractor={(b) => String(b.id)}
      renderItem={renderItem}
      numColumns={tablet ? 2 : 1}
      columnWrapperStyle={tablet ? styles.columns : undefined}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      keyboardDismissMode={keyboardDismissMode}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: tablet ? 16 : 12, paddingHorizontal: gutter, paddingBottom: insets.bottom + 16 }}
      style={styles.list}
      initialNumToRender={8}
      windowSize={7}
    />
  );
}

const styles = StyleSheet.create({
  list: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  columns: { gap: 16 },
});
