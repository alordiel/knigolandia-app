import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/offline-banner';
import { ScreenHeader } from '@/components/screen-header';
import { SearchField } from '@/components/search-field';
import { FontFamily, type Palette } from '@/constants/theme';
import { useOnline } from '@/hooks/use-online';
import { useTablet } from '@/hooks/use-tablet';
import { useTheme } from '@/hooks/use-theme';
import { BROWSE, browseEntries, isBrowseKind, type BrowseEntry, type BrowseKind } from '@/lib/browse';
import { useCatalog } from '@/lib/catalog';

export default function BrowseScreen() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  if (!isBrowseKind(kind)) return <Redirect href="/" />;
  // Keyed so the filter text resets when switching between kinds in the drawer.
  return <BrowseIndex key={kind} kind={kind} />;
}

function BrowseIndex({ kind }: { kind: BrowseKind }) {
  const c = useTheme();
  const tablet = useTablet();
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c, tablet), [c, tablet]);
  const catalog = useCatalog((s) => s.catalog);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const entries = useMemo(() => (catalog ? browseEntries(catalog, kind) : []), [catalog, kind]);
  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLocaleLowerCase('bg');
    return q ? entries.filter((e) => e.name.toLocaleLowerCase('bg').includes(q)) : entries;
  }, [entries, deferredQuery]);

  const renderItem = useCallback<ListRenderItem<BrowseEntry>>(
    ({ item }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.count}`}
        onPress={() =>
          router.push({ pathname: '/browse/[kind]/[id]', params: { kind, id: String(item.id) } })
        }
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.backgroundElement }]}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.count}>{item.count}</Text>
      </Pressable>
    ),
    [kind, styles, c]
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader title={BROWSE[kind].title} align="left" large={tablet} />
      {!online && <OfflineBanner />}
      <SearchField value={query} onChangeText={setQuery} placeholder={BROWSE[kind].filter} />
      {catalog ? (
        <FlatList
          data={filtered}
          keyExtractor={(e) => String(e.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<Text style={styles.empty}>Няма съвпадения.</Text>}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          initialNumToRender={20}
        />
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color={c.textMuted} />
        </View>
      )}
    </View>
  );
}

function createStyles(c: Palette, tablet: boolean) {
  const gutter = tablet ? 24 : 16;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    list: { width: '100%', maxWidth: 800, alignSelf: 'center' },
    row: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: gutter,
      paddingVertical: 12,
    },
    name: { flex: 1, fontFamily: FontFamily.sans, fontSize: 15, color: c.text },
    count: { fontFamily: FontFamily.sans, fontSize: 13, color: c.textMuted },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: gutter },
    empty: {
      fontFamily: FontFamily.sans,
      fontSize: 15,
      color: c.textMuted,
      textAlign: 'center',
      paddingVertical: 48,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
}
