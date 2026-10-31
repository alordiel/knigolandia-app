import { useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { FontFamily, type Palette } from '@/constants/theme';
import { useOnline } from '@/hooks/use-online';
import { useTablet } from '@/hooks/use-tablet';
import { useTheme } from '@/hooks/use-theme';
import { useCatalog } from '@/lib/catalog';
import { formatBytes, plural } from '@/lib/format';
import { clearAutoCache, offlineSize, readOfflineIndex } from '@/lib/offline';
import { PushNotConfiguredError, subscribePush, unsubscribePush } from '@/lib/push';
import { FONT_SIZES, useSettings, type ThemeSetting } from '@/stores/settings';

const THEMES: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: 'Системна' },
  { value: 'light', label: 'Светла' },
  { value: 'dark', label: 'Тъмна' },
];

/** "обновен днес" / "обновен вчера" / "обновен 12.09.2026". */
function updatedLabel(unixSeconds: number) {
  const date = new Date(unixSeconds * 1000);
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86400000);
  if (days <= 0) return 'обновен днес';
  if (days === 1) return 'обновен вчера';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `обновен ${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

export default function SettingsScreen() {
  const c = useTheme();
  const tablet = useTablet();
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);
  const queryClient = useQueryClient();

  const { theme, setTheme, push, setPush, fontSize, setFontSize } = useSettings();
  const catalog = useCatalog((s) => s.catalog);
  // Switching the theme re-renders the whole app synchronously (zustand updates can't be transitions),
  // so mark the choice and show a spinner first, then apply it once that frame is on screen.
  const [pendingTheme, setPendingTheme] = useState<ThemeSetting | null>(null);
  const shownTheme = pendingTheme ?? theme;
  const onSelectTheme = (value: ThemeSetting) => {
    if (value === shownTheme) return;
    setPendingTheme(value);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setTheme(value);
        setPendingTheme(null);
      })
    );
  };
  const [pushBusy, setPushBusy] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Shares the 'offline-index' prefix so startup tasks and list changes refresh it too.
  const offline = useQuery({
    queryKey: ['offline-index', 'stats'],
    queryFn: async () => {
      const entries = await readOfflineIndex();
      return {
        count: entries.length,
        bytes: offlineSize(entries.map((e) => e.id)),
        unpinned: entries.filter((e) => !e.pinned).length,
      };
    },
  });

  const sizeIndex = FONT_SIZES.indexOf(fontSize as (typeof FONT_SIZES)[number]);

  const onTogglePush = async (enable: boolean) => {
    setPushBusy(true);
    try {
      if (enable) {
        if (await subscribePush()) {
          setPush(true);
        } else {
          Alert.alert('Известията са изключени', 'Разрешете известията за Книголандия от настройките на телефона.', [
            { text: 'Отказ', style: 'cancel' },
            { text: 'Настройки', onPress: () => Linking.openSettings() },
          ]);
        }
      } else {
        await unsubscribePush();
        setPush(false);
      }
    } catch (e) {
      if (e instanceof PushNotConfiguredError) {
        // Nothing was ever registered, so turning it off locally is accurate.
        if (!enable) setPush(false);
        else Alert.alert('Известията още не са налични', 'Тази функция ще бъде включена в следваща версия.');
      } else {
        Alert.alert('Неуспешна промяна', 'Проверете връзката с интернет и опитайте отново.');
      }
    } finally {
      setPushBusy(false);
    }
  };

  const onClearCache = () => {
    Alert.alert(
      'Изчистване на кеша',
      'Автоматично изтеглените ревюта ще бъдат изтрити. Запазените „За по-късно“ остават.',
      [
        { text: 'Отказ', style: 'cancel' },
        {
          text: 'Изчисти',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              await clearAutoCache();
            } finally {
              setClearing(false);
              queryClient.invalidateQueries({ queryKey: ['offline-index'] });
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Настройки" align="left" large={tablet} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Section title="Тема" styles={styles}>
          <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel="Тема">
            {THEMES.map((t) => {
              const active = t.value === shownTheme;
              const busy = t.value === pendingTheme;
              return (
                <Pressable
                  key={t.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active, busy }}
                  disabled={pendingTheme != null}
                  onPress={() => onSelectTheme(t.value)}
                  style={[styles.segment, active && styles.segmentActive]}>
                  {busy ? (
                    <ActivityIndicator size="small" color={c.textMuted} />
                  ) : (
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{t.label}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Известия" styles={styles}>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>Нови ревюта</Text>
                <Text style={styles.rowNote}>
                  {online ? 'Известие при публикуване на ново ревю' : 'Изисква връзка с интернет'}
                </Text>
              </View>
              {pushBusy ? (
                <ActivityIndicator color={c.textMuted} style={styles.switchSpinner} />
              ) : (
                <Switch
                  value={push}
                  onValueChange={onTogglePush}
                  disabled={!online}
                  trackColor={{ true: c.accent, false: c.border }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={c.border}
                  accessibilityLabel="Нови ревюта"
                />
              )}
            </View>
          </View>
        </Section>

        <Section title="Четене" styles={styles}>
          <View style={[styles.card, styles.stepperRow]}>
            <Text style={[styles.rowTitle, styles.flex]}>Размер на текста</Text>
            <StepButton
              label="По-малък текст"
              glyphSize={14}
              disabled={sizeIndex <= 0}
              onPress={() => setFontSize(FONT_SIZES[Math.max(0, sizeIndex - 1)])}
              styles={styles}
            />
            <Text style={styles.stepValue}>{fontSize}</Text>
            <StepButton
              label="По-голям текст"
              glyphSize={20}
              disabled={sizeIndex >= FONT_SIZES.length - 1}
              onPress={() => setFontSize(FONT_SIZES[Math.min(FONT_SIZES.length - 1, sizeIndex + 1)])}
              styles={styles}
            />
          </View>
        </Section>

        <Section title="Съхранение" styles={styles}>
          <View style={styles.card}>
            <View style={[styles.infoRow, styles.divided]}>
              <Text style={styles.infoLabel}>
                Каталог{catalog ? ` (${plural(catalog.books.length, 'книга', 'книги')})` : ''}
              </Text>
              <Text style={styles.infoValue}>{catalog ? updatedLabel(catalog.v) : 'не е зареден'}</Text>
            </View>
            <View style={[styles.infoRow, styles.divided]}>
              <Text style={styles.infoLabel}>Офлайн ревюта</Text>
              <Text style={styles.infoValue}>
                {offline.data ? `${offline.data.count} · ${formatBytes(offline.data.bytes)}` : '…'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onClearCache}
              disabled={clearing || !offline.data?.unpinned}
              style={({ pressed }) => [styles.dangerButton, pressed && { opacity: 0.6 }]}>
              <Text
                style={[styles.dangerText, (clearing || !offline.data?.unpinned) && { color: c.textMuted }]}>
                Изчисти автоматичния кеш
              </Text>
            </Pressable>
          </View>
        </Section>

        <Text style={styles.version}>Книголандия · версия {Constants.expoConfig?.version ?? '—'}</Text>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  styles,
  children,
}: {
  title: string;
  styles: ReturnType<typeof createStyles>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function StepButton({
  label,
  glyphSize,
  disabled,
  onPress,
  styles,
}: {
  label: string;
  glyphSize: number;
  disabled: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.stepButton, (pressed || disabled) && { opacity: 0.4 }]}>
      <Text style={[styles.stepGlyph, { fontSize: glyphSize }]}>A</Text>
    </Pressable>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { gap: 24, paddingHorizontal: 16, paddingTop: 8, width: '100%', maxWidth: 640, alignSelf: 'center' },
    flex: { flex: 1 },
    section: { gap: 8 },
    sectionLabel: {
      marginHorizontal: 4,
      fontFamily: FontFamily.sansSemiBold,
      fontSize: 12,
      letterSpacing: 0.6,
      color: c.textMuted,
    },
    card: { backgroundColor: c.card, borderRadius: 12 },
    segmented: {
      flexDirection: 'row',
      gap: 4,
      padding: 4,
      borderRadius: 12,
      backgroundColor: c.backgroundElement,
    },
    segment: { flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    segmentActive: { backgroundColor: c.card, boxShadow: '0 1px 2px rgba(28,31,30,0.1)' },
    segmentText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.textSecondary },
    segmentTextActive: { fontFamily: FontFamily.sansSemiBold, color: c.text },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      minHeight: 44,
    },
    switchSpinner: { width: 51 },
    rowTitle: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.text },
    rowNote: { fontFamily: FontFamily.sans, fontSize: 12, color: c.textMuted, marginTop: 2 },
    stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
    stepButton: {
      width: 44,
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepGlyph: { fontFamily: FontFamily.serifMedium, color: c.text },
    stepValue: { width: 36, textAlign: 'center', fontFamily: FontFamily.sans, fontSize: 14, color: c.textSecondary },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    divided: { borderBottomWidth: 1, borderBottomColor: c.divider },
    infoLabel: { flexShrink: 1, fontFamily: FontFamily.sans, fontSize: 15, color: c.text },
    infoValue: { fontFamily: FontFamily.sans, fontSize: 14, color: c.textMuted },
    dangerButton: { height: 52, justifyContent: 'center', paddingHorizontal: 16 },
    dangerText: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.danger },
    version: { textAlign: 'center', fontFamily: FontFamily.sans, fontSize: 12, color: c.textMuted },
  });
}
