/* Placeholder service worker to avoid 404 noise when Firebase Messaging is probed by browser extensions or SDKs. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
