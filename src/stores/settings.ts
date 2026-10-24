import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeSetting = 'system' | 'light' | 'dark';

/** Review body sizes on phone; iPad adds 2px on top (see docs/DESIGN.md). */
export const FONT_SIZES = [15, 17, 19, 21, 23] as const;

type SettingsState = {
  theme: ThemeSetting;
  push: boolean;
  fontSize: number;
  setTheme: (theme: ThemeSetting) => void;
  setPush: (push: boolean) => void;
  setFontSize: (fontSize: number) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      push: false,
      fontSize: 17,
      setTheme: (theme) => set({ theme }),
      setPush: (push) => set({ push }),
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ theme, push, fontSize }) => ({ theme, push, fontSize }),
    }
  )
);
