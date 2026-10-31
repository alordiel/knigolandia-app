import { router } from 'expo-router';

/** Home button on pushed screens: drop the whole back stack and land on the home screen. */
export function goHome() {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/');
}
