import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BookList } from '@/components/book-list';
import { Deferred } from '@/components/loading-screen';
import { OfflineBanner } from '@/components/offline-banner';
import { ScreenHeader } from '@/components/screen-header';
import { FontFamily } from '@/constants/theme';
import { useOnline } from '@/hooks/use-online';
import { useTablet } from '@/hooks/use-tablet';
import { useTheme } from '@/hooks/use-theme';
import { booksFor, isBrowseKind, type BrowseKind } from '@/lib/browse';
import { useCatalog } from '@/lib/catalog';
import { plural } from '@/lib/format';
import { goHome } from '@/lib/home';

export default function BrowseBooksScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  if (!isBrowseKind(kind)) return <Redirect href="/" />;
  return (
    <Deferred>
      <BrowseBooks kind={kind} id={Number(id)} />
    </Deferred>
  );
}

/** Books by one publisher / genre. */
function BrowseBooks({ kind, id }: { kind: BrowseKind; id: number }) {
  const c = useTheme();
  const tablet = useTablet();
  const online = useOnline();
  const catalog = useCatalog((s) => s.catalog);
  const books = useMemo(() => (catalog ? booksFor(catalog, kind, id) : []), [catalog, kind, id]);
  const name = catalog?.[kind][id];

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <ScreenHeader
        title={name ?? ''}
        leading="back"
        align="left"
        large={tablet}
        action={{ icon: 'home', label: 'Начало', onPress: goHome }}
      />
      {!online && <OfflineBanner />}
      {catalog ? (
        <BookList
          books={books}
          ListHeaderComponent={
            books.length > 0 ? (
              <Text style={[styles.count, { color: c.textMuted }]}>{plural(books.length, 'ревю', 'ревюта')}</Text>
            ) : undefined
          }
          ListEmptyComponent={<Text style={[styles.empty, { color: c.textMuted }]}>Няма ревюта.</Text>}
        />
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color={c.textMuted} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  count: { fontFamily: FontFamily.sans, fontSize: 13 },
  empty: { fontFamily: FontFamily.sans, fontSize: 15, textAlign: 'center', paddingVertical: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
