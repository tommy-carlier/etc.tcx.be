// 20260129.001
const CACHE_NAME = 'bib-v1';

self.addEventListener('install', ev => {
    ev.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(['/bib/', '/bib/bib.css', '/bib/bib.js', '/bib/bib-152.png'])));
});

self.addEventListener('fetch', ev => {
    ev.respondWith(caches.match(ev.request).then(response => response || fetch(ev.request)));
});
