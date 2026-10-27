import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { apiFetch } from '@/lib/api';

/** No EAS project ID in app.json yet (`eas init`) — Expo can't issue a push token. */
export class PushNotConfiguredError extends Error {}

const projectId = () =>
  (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;

async function expoPushToken() {
  const id = projectId();
  if (!id) throw new PushNotConfiguredError();
  return (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
}

async function post(path: 'subscribe' | 'unsubscribe', body: object) {
  await apiFetch(`push/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Asks for permission and registers the Expo token on the server.
 * Resolves false when the user declines permission.
 */
export async function subscribePush(): Promise<boolean> {
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return false;
  if (Platform.OS === 'android') {
    // Android 13+ needs a channel before a token can be issued.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Нови ревюта',
      importance: AndroidImportance.DEFAULT,
    });
  }
  await post('subscribe', { token: await expoPushToken(), platform: Platform.OS });
  return true;
}

/** Removes the token server-side — a local toggle alone can't stop remote pushes. */
export async function unsubscribePush() {
  await post('unsubscribe', { token: await expoPushToken() });
}

/** Post ID carried in a "Ново ревю" push (`data.id`), if any. */
export function reviewIdFrom(response: Notifications.NotificationResponse | null | undefined) {
  const id = Number(response?.notification.request.content.data?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}
