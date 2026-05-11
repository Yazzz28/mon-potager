const CACHE_NAME = 'mon-potager-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './data.json',
    './js/main.js',
    './js/state.js',
    './js/storage.js',
    './js/utils.js',
    './js/db.js',
    './js/navigation.js',
    './js/backup.js',
    './js/toast.js',
    './js/alerts.js',
    './js/mutations.js',
    './js/predictions.js',
    './js/weather.js',
    './js/diseaseRisks.js',
    './js/sunriseSunset.js',
    './js/watering.js',
    './js/terrain-storage.js',
    './js/renders/form.js',
    './js/renders/garden.js',
    './js/renders/calendar.js',
    './js/renders/library.js',
    './js/renders/detail.js',
    './js/renders/stats.js',
    './js/renders/dashboard.js',
    './js/renders/terrain.js',
    './css/design-tokens.css',
    './css/base.css',
    './css/layout.css',
    './css/buttons.css',
    './css/components.css',
    './css/plants.css',
    './css/forms.css',
    './css/calendar.css',
    './css/library.css',
    './css/modal.css',
    './css/weather.css',
    './css/sunriseSunset.css',
    './css/stats.css',
    './css/terrain.css',
    './css/responsive.css',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (url.origin !== location.origin) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            const fetchPromise = fetch(event.request).then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => cached);

            return cached || fetchPromise;
        })
    );
});
