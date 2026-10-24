/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/** Design tokens — see docs/DESIGN.md. Dark values not listed there are derived from the light palette. */
export const Colors = {
  light: {
    text: '#1C1F1E',
    background: '#F7F6F2',
    surface: '#FFFFFF',
    backgroundElement: '#ECEAE3',
    backgroundSelected: '#E4EFEA',
    textSecondary: '#4A4D4B',
    textMuted: '#5E615F',
    quote: '#4A4D4B',
    border: '#C9C6BC',
    divider: '#ECEAE3',
    accent: '#1F5C4A',
    accentSoft: '#E4EFEA',
    accentText: '#17463A',
    onAccent: '#FFFFFF',
    star: '#C8871E',
    starEmpty: '#D9D4C7',
    danger: '#9B2C2C',
    placeholder: '#D9D4C7',
    offlineBanner: '#F6EBD3',
    offlineBannerText: '#5C4210',
  },
  dark: {
    text: '#E8E6E0',
    background: '#161817',
    surface: '#161817',
    backgroundElement: '#232624',
    backgroundSelected: '#1E3029',
    textSecondary: '#C9C6BC',
    textMuted: '#A9A7A0',
    quote: '#C9C6BC',
    border: '#4A4D4B',
    divider: '#4A4D4B',
    accent: '#8CCBB4',
    accentSoft: '#1E3029',
    accentText: '#8CCBB4',
    onAccent: '#161817',
    star: '#E3A43C',
    starEmpty: '#4A4D4B',
    danger: '#E07A7A',
    placeholder: '#2E3230',
    offlineBanner: '#3A2E17',
    offlineBannerText: '#F2D9A6',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

/** Font family names registered with `useFonts` in the root layout. */
export const FontFamily = {
  serif: 'Literata_400Regular',
  serifMedium: 'Literata_500Medium',
  serifBold: 'Literata_700Bold',
  sans: 'IBMPlexSans_400Regular',
  sansMedium: 'IBMPlexSans_500Medium',
  sansSemiBold: 'IBMPlexSans_600SemiBold',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
