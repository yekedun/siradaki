import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

type ExpoNotifications = typeof import('expo-notifications');

let notificationsModule: Promise<ExpoNotifications> | null = null;

export function canUseExpoPushNotifications(): boolean {
  return !(Platform.OS === 'android' && Constants.appOwnership === 'expo');
}

async function loadNotifications(): Promise<ExpoNotifications | null> {
  if (!canUseExpoPushNotifications()) return null;
  notificationsModule ??= Promise.resolve(require('expo-notifications') as ExpoNotifications).then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    return Notifications;
  });
  return notificationsModule;
}

export function buildExpoPushToken(token: string): string | null {
  if (!token || !token.startsWith('ExponentPushToken[')) return null;
  return token;
}

export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Randevu Bildirimleri',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E3A8A',
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: '25ac450c-8b07-4703-805f-3d4fea1b8db7',
  });

  const token = buildExpoPushToken(tokenData.data);
  if (!token) {
    console.error('[notifications] Invalid Expo push token format:', tokenData.data);
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error: updateError } = await supabase
    .from('staff')
    .update({ push_token: token })
    .eq('user_id', user.id);
  if (updateError) {
    console.error('[notifications] Failed to save push token:', updateError);
  }
}
