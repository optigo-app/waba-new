/* ── WABA Next Service Worker ──
   Required for reliable browser notifications when the tab is inactive.
   Socket.io events trigger notifications via reg.showNotification() from the page.
*/

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] notificationclick fired:', event.notification.data);
  event.notification.close();
  const data = event.notification.data || {};
  const basePath = data.redirectVersion || '';
  const chatUrl = `${basePath}/chat`;
  console.log('[SW] Opening/focusing:', chatUrl, 'conversationId:', data.conversationId);
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus an existing window if available
        for (const client of windowClients) {
          if (client.focus) {
            client.focus();
            // Notify the client to select the conversation if data exists
            if (data.conversationId) {
              client.postMessage({
                type: 'SELECT_CONVERSATION',
                conversationId: data.conversationId,
              });
            }
            return;
          }
        }
        // No open window — open the app chat page with redirect_version
        return clients.openWindow(chatUrl);
      })
      .catch(() => {
        return clients.openWindow(chatUrl);
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] notificationclose:', event.notification.data);
});

self.addEventListener('message', (event) => {
  // Listen for pings or manual notification triggers from the page if needed
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
