import { useWindowDimensions } from 'react-native';

/** iPad / large-screen layout: two-column home, wider gutters (docs/DESIGN.md → iPad). */
export function useTablet() {
  return useWindowDimensions().width >= 768;
}
