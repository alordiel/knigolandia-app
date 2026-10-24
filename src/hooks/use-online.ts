import { useNetInfo } from '@react-native-community/netinfo';

/** Treats "unknown" (null) as online so the first render doesn't flash the offline state. */
export function useOnline() {
  const { isConnected } = useNetInfo();
  return isConnected !== false;
}
