import { router } from 'expo-router';
import { Drawer, type DrawerContentComponentProps } from 'expo-router/drawer';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Deferred } from '@/components/loading-screen';
import { FontFamily, type Palette } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCatalog } from '@/lib/catalog';
import { useLists } from '@/stores/lists';

export default function DrawerLayout() {
  const c = useTheme();
  return (
    <Drawer
      drawerContent={(props) => <DrawerMenu {...props} />}
      // Loading screen first on every newly opened screen. Browse / library reuse one route for
      // several lists, so switching list (params) counts as a new screen too.
      screenLayout={({ route, children }) => (
        <Deferred key={route.name === 'index' ? route.key : `${route.key}:${JSON.stringify(route.params ?? {})}`}>
          {children}
        </Deferred>
      )}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { width: 304, backgroundColor: c.surface },
        overlayColor: 'rgba(28,31,30,0.45)',
        // Hidden screens skip re-renders (e.g. the home list on a theme change) until focused again.
        freezeOnBlur: true,
      }}>
      {/* SDK 58: only declared screens render. */}
      <Drawer.Screen name="index" />
      <Drawer.Screen name="search" />
      <Drawer.Screen name="library/[list]" />
      <Drawer.Screen name="browse/[kind]" />
      <Drawer.Screen name="settings" />
    </Drawer>
  );
}

type Item = {
  key: string;
  label: string;
  icon?: IconName;
  count?: number;
  href: Parameters<typeof router.navigate>[0];
};

function DrawerMenu({ state, navigation }: DrawerContentComponentProps) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);

  // Counts skip IDs that are no longer in the catalogue.
  const byId = useCatalog((s) => s.byId);
  const count = (ids: number[]) => (byId.size ? ids.filter((id) => byId.has(id)).length : ids.length);
  const bookmarks = count(useLists((s) => s.bookmarks));
  const wishlist = count(useLists((s) => s.wishlist));
  const readLater = count(useLists((s) => s.readLater));

  const route = state.routes[state.index];
  const params = (route.params ?? {}) as Record<string, string | undefined>;
  const activeKey =
    route.name === 'index'
      ? (params.category ?? 'fiction')
      : route.name === 'library/[list]'
        ? params.list
        : route.name === 'browse/[kind]'
          ? params.kind
          : route.name;

  const go = (href: Item['href']) => {
    navigation.closeDrawer();
    router.navigate(href);
  };

  const sections: { title: string; items: Item[] }[] = [
    {
      title: 'Ревюта',
      items: [
        { key: 'fiction', label: 'Художествена', icon: 'book', href: { pathname: '/', params: { category: 'fiction' } } },
        { key: 'nonfiction', label: 'Нехудожествена', icon: 'clock', href: { pathname: '/', params: { category: 'nonfiction' } } },
        { key: 'search', label: 'Търсене', icon: 'search', href: '/search' },
      ],
    },
    {
      title: 'Моята библиотека',
      items: [
        { key: 'bookmarks', label: 'Отметки', icon: 'bookmark', count: bookmarks, href: '/library/bookmarks' },
        { key: 'wishlist', label: 'Списък с желания', icon: 'heart', count: wishlist, href: '/library/wishlist' },
        { key: 'readLater', label: 'За по-късно', icon: 'download', count: readLater, href: '/library/readLater' },
      ],
    },
    {
      title: 'Разглеждане',
      items: [
        { key: 'publishers', label: 'Издателства', href: '/browse/publishers' },
        { key: 'genres', label: 'Жанрове', href: '/browse/genres' },
      ],
    },
  ];

  return (
    <View style={[styles.drawer, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.brand}>
        <Text style={styles.brandTitle}>Книголандия</Text>
        <Text style={styles.brandTagline}>Книжен блог от 2009 г.</Text>
      </View>
      <ScrollView style={styles.nav} contentContainerStyle={styles.navContent}>
        {sections.map((section, i) => (
          <View key={section.title}>
            <Text style={[styles.sectionLabel, i > 0 && { paddingTop: 16 }]}>{section.title.toUpperCase()}</Text>
            {section.items.map((item) => (
              <MenuItem key={item.key} item={item} active={item.key === activeKey} onPress={go} styles={styles} />
            ))}
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <MenuItem
          item={{ key: 'settings', label: 'Настройки', icon: 'sliders', href: '/settings' }}
          active={activeKey === 'settings'}
          onPress={go}
          styles={styles}
        />
      </View>
    </View>
  );
}

function MenuItem({
  item,
  active,
  onPress,
  styles,
}: {
  item: Item;
  active: boolean;
  onPress: (href: Item['href']) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const c = useTheme();
  const color = active ? c.accentText : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.count != null ? `${item.label}, ${item.count}` : item.label}
      onPress={() => onPress(item.href)}
      style={({ pressed }) => [
        styles.item,
        !item.icon && styles.itemPlain,
        active && styles.itemActive,
        pressed && !active && styles.itemPressed,
      ]}>
      {item.icon && <Icon name={item.icon} color={color} size={20} />}
      <Text style={[styles.itemText, { color }, active && styles.itemTextActive]} numberOfLines={1}>
        {item.label}
      </Text>
      {item.count != null && <Text style={styles.count}>{item.count}</Text>}
    </Pressable>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    drawer: { flex: 1, backgroundColor: c.surface },
    brand: { paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: c.divider },
    brandTitle: { fontFamily: FontFamily.serifBold, fontSize: 24, color: c.text },
    brandTagline: { fontFamily: FontFamily.sans, fontSize: 13, color: c.textMuted, marginTop: 4 },
    nav: { flex: 1 },
    navContent: { padding: 12, gap: 2 },
    sectionLabel: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 4,
      fontFamily: FontFamily.sansSemiBold,
      fontSize: 12,
      letterSpacing: 0.6,
      color: c.textMuted,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      height: 48,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    itemPlain: { height: 44, paddingLeft: 46 },
    itemActive: { backgroundColor: c.accentSoft },
    itemPressed: { backgroundColor: c.backgroundElement },
    itemText: { flex: 1, fontFamily: FontFamily.sans, fontSize: 15 },
    itemTextActive: { fontFamily: FontFamily.sansSemiBold },
    count: { fontFamily: FontFamily.sans, fontSize: 13, color: c.textMuted },
    footer: { paddingTop: 12, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: c.divider },
  });
}
