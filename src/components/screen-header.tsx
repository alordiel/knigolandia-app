import { router, useNavigation } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Action = { icon: IconName; label: string; onPress: () => void };

type Props = {
  title: string;
  action?: Action;
  large?: boolean;
  align?: 'center' | 'left';
  /** Drawer screens open the menu; pushed screens go back. */
  leading?: 'menu' | 'back';
};

/** Top bar: menu or back button · title · optional right action. */
export function ScreenHeader({ title, action, large, align = 'center', leading = 'menu' }: Props) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 4, paddingHorizontal: large ? 16 : 8 }]}>
      {leading === 'menu' ? (
        <HeaderButton
          icon="menu"
          label="Меню"
          size={24}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        />
      ) : (
        <HeaderButton
          icon="back"
          label="Назад"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      )}
      <Text
        style={[
          styles.title,
          { color: c.text, fontSize: large ? 24 : 22, textAlign: align },
          align === 'left' && styles.titleLeft,
        ]}
        numberOfLines={1}
        accessibilityRole="header">
        {title}
      </Text>
      {action ? <HeaderButton {...action} /> : align === 'center' && <View style={styles.button} />}
    </View>
  );
}

function HeaderButton({ icon, label, onPress, size = 22 }: Action & { size?: number }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.5 }]}>
      <Icon name={icon} color={c.text} size={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  title: { flex: 1, fontFamily: FontFamily.serifBold, letterSpacing: -0.2 },
  titleLeft: { marginLeft: 4 },
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
