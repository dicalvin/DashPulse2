/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'DashPulse Update', body: 'Checkout the new market signal!' };
  
  const options = {
    body: data.body,
    icon: '/logo.png', // Fallback to a default icon if needed
    badge: '/badge.png',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
