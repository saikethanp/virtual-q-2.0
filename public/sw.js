// Virtual-Q 2.0 Web Push Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'Virtual-Q Order Update',
    body: 'Your order status has been updated!',
    icon: '/assets/aistudio/Virtual-Q_Canteen_Menu_Interface_d23341ff.png',
    badge: '/assets/aistudio/Virtual-Q_Canteen_Menu_Interface_d23341ff.png',
    data: { url: '/customer/dashboard' },
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (err) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/assets/aistudio/Virtual-Q_Canteen_Menu_Interface_d23341ff.png',
    badge: data.badge || '/assets/aistudio/Virtual-Q_Canteen_Menu_Interface_d23341ff.png',
    vibrate: [100, 50, 100],
    data: data.data || { url: '/customer/dashboard' },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/customer/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

