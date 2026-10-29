/* Minimal service worker: it makes the studio installable and shows a clear
   page when the network is gone. It never caches the app, its API routes or
   server actions — generation and uploads always go to the server. */
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open("ohf-shell-v1").then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.mode !== "navigate" || request.method !== "GET") return;
  event.respondWith(
    fetch(request).catch(() => caches.match(OFFLINE_URL).then((hit) => hit || Response.error())),
  );
});
