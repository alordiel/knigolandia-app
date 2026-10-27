import { useDeferredValue, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BookList } from '@/components/book-list';
import { OfflineBanner } from '@/components/offline-banner';
import { ScreenHeader } from '@/components/screen-header';
import { SearchField } from '@/components/search-field';
import { FontFamily } from '@/constants/theme';
import { useOnline } from '@/hooks/use-online';
import { useTablet } from '@/hooks/use-tablet';
import { useTheme } from '@/hooks/use-theme';
import { names, useCatalog } from '@/lib/catalog';
import { plural } from '@/lib/format';

const lower = (s: string) => s.toLocaleLowerCase('bg');

export default function SearchScreen() {
  const c = useTheme();
  const tablet = useTablet();
  const online = useOnline();
  const catalog = useCatalog((s) => s.catalog);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  // One lowercase haystack per book: title, headline, authors, translators (docs/SPEC.md → Search).
  const index = useMemo(
    () =>
      [...(catalog?.books ?? [])]
        .sort((a, b) => b.id - a.id)
        .map((book) => ({
          book,
          text: lower(
            [
              book.title,
              book.heading,
              ...names(catalog?.authors, book.author_id),
              ...names(catalog?.translators, book.translator_id),
            ].join(' ')
          ),
        })),
    [catalog]
  );

  // Every word must match somewhere, in any order.
  const hasQuery = deferredQuery.trim().length > 0;
  const results = useMemo(() => {
    const terms = lower(deferredQuery).split(/\s+/).filter(Boolean);
    return terms.length ? index.filter((e) => terms.every((t) => e.text.includes(t))).map((e) => e.book) : [];
  }, [index, deferredQuery]);

  const message = (text: string) => (
    <Text style={[styles.message, { color: c.textMuted }]}>{text}</Text>
  );

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <ScreenHeader title="Търсене" align="left" large={tablet} />
      {!online && <OfflineBanner />}
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Заглавие, автор или преводач"
        autoFocus
      />
      <BookList
        books={results}
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          results.length > 0 ? (
            <Text style={[styles.count, { color: c.textMuted }]}>
              {plural(results.length, 'резултат', 'резултата')}
            </Text>
          ) : undefined
        }
        ListEmptyComponent={
          !catalog
            ? message('Каталогът все още се зарежда…')
            : hasQuery
              ? message('Няма намерени ревюта.')
              : message('Търсете по заглавие, автор или преводач.')
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  count: { fontFamily: FontFamily.sans, fontSize: 13 },
  message: { fontFamily: FontFamily.sans, fontSize: 15, textAlign: 'center', paddingVertical: 48 },
});
