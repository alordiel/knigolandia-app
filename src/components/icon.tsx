import { SymbolView } from 'expo-symbols';

/** App icons — SF Symbols on iOS, Material Symbols on Android/web (see docs/DESIGN.md → Icons). */
const ICONS = {
  back: { ios: 'chevron.left', android: 'arrow_back_ios_new', web: 'arrow_back_ios_new' },
  menu: { ios: 'line.3.horizontal', android: 'menu', web: 'menu' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  book: { ios: 'book.closed', android: 'book', web: 'book' },
  clock: { ios: 'clock', android: 'schedule', web: 'schedule' },
  bookmark: { ios: 'bookmark', android: 'bookmark', web: 'bookmark' },
  heart: { ios: 'heart', android: 'favorite', web: 'favorite' },
  download: { ios: 'arrow.down.to.line', android: 'download', web: 'download' },
  sliders: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  close: { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' },
  wifiOff: { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' },
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, color, size = 22 }: { name: IconName; color: string; size?: number }) {
  return <SymbolView name={ICONS[name]} tintColor={color} size={size} />;
}
