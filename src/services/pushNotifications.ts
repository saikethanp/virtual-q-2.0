import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { NotificationItem } from '../types';

export const isPushNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

export const getNotificationPermissionState = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'default';
  return Notification.permission;
};

// Converts base64 URL safe string to Uint8Array for PushManager subscribe
export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (err) {
    console.warn('Service worker registration note:', err);
    return null;
  }
};

export const subscribeToWebPush = async (
  userId: string
): Promise<{ success: boolean; message?: string }> => {
  if (!isPushNotificationSupported()) {
    return { success: false, message: 'Push notifications are not supported on this browser or platform.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Notification permission was denied. You can enable it in your browser site settings.' };
    }

    const reg = await registerServiceWorker();
    if (!reg) {
      return { success: false, message: 'Could not register service worker.' };
    }

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      // In-app fallback notifications still function seamlessly
      return { success: true, message: 'Browser notification permission granted! In-app live alerts are enabled.' };
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey as unknown as BufferSource,
    });

    const subJson = subscription.toJSON();

    if (isSupabaseConfigured() && supabase && userId) {
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh || '',
        auth: subJson.keys?.auth || '',
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' });

      if (error) {
        console.warn('Could not save push subscription to Supabase:', error);
      }
    }

    return { success: true, message: 'Push notifications successfully enabled!' };
  } catch (err: unknown) {
    console.error('Error subscribing to push notifications:', err);
    return { success: false, message: err instanceof Error ? err.message : 'Subscription error' };
  }
};

export const getCustomerNotifications = async (userId: string): Promise<NotificationItem[]> => {
  if (isSupabaseConfigured() && supabase && userId) {
    try {
      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) return data as NotificationItem[];
    } catch (e) {
      console.warn('Error fetching notifications:', e);
    }
  }

  // Local storage fallback for offline / preview
  try {
    const raw = localStorage.getItem('vq_notifications_' + userId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string, userId: string): Promise<void> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('notification_history').update({ is_read: true }).eq('id', notificationId);
    } catch (e) {
      console.warn('Error marking notification read:', e);
    }
  }

  try {
    const raw = localStorage.getItem('vq_notifications_' + userId);
    if (raw) {
      const list: NotificationItem[] = JSON.parse(raw);
      const updated = list.map(n => n.id === notificationId ? { ...n, is_read: true } : n);
      localStorage.setItem('vq_notifications_' + userId, JSON.stringify(updated));
    }
  } catch { }
};

