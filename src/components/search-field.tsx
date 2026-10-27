import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { FontFamily } from '@/constants/theme';
import { useTablet } from '@/hooks/use-tablet';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  autoFocus?: boolean;
};

export function SearchField({ value, onChangeText, placeholder, autoFocus }: Props) {
  const c = useTheme();
  const tablet = useTablet();
  return (
    <View style={[styles.wrap, { paddingHorizontal: tablet ? 24 : 16 }]}>
      <View style={[styles.field, { backgroundColor: c.card, borderColor: c.divider }]}>
        <Icon name="search" color={c.textMuted} size={18} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.textMuted}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="never"
          accessibilityLabel={placeholder}
          style={[styles.input, { color: c.text }]}
        />
        {value.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Изчисти"
            onPress={() => onChangeText('')}
            hitSlop={12}
            style={styles.clear}>
            <Icon name="close" color={c.textMuted} size={18} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 4, paddingBottom: 12, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
  },
  input: { flex: 1, height: 44, fontFamily: FontFamily.sans, fontSize: 15 },
  clear: { width: 28, height: 44, alignItems: 'center', justifyContent: 'center' },
});
