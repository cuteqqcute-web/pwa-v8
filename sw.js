// V8 離線支援（網頁採網路優先，確保更新即時生效；失敗才用快取）
var CACHE = 'pwa-v8-v1';
var PRECACHE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-180.png'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) {
    return c.addAll(PRECACHE);
  }).then(function() { return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.map(function(k) {
      if (k !== CACHE) return caches.delete(k);
    }));
  }).then(function() { return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // 網頁本身：網路優先（更新會即時生效），失敗才用快取
  var isNav = req.mode === 'navigate' || url.pathname === '/' || /\/index\.html$/.test(url.pathname);
  if (url.origin === location.origin && isNav) {
    e.respondWith(fetch(req).then(function(res) {
      if (res && res.status === 200) {
        var copy = res.clone();
        caches.open(CACHE).then(function(c) { c.put(req, copy); });
      }
      return res;
    }).catch(function() {
      return caches.match(req).then(function(m) {
        return m || caches.match('./index.html');
      });
    }));
    return;
  }

  // 其他資源（CDN 庫、圖示等）：快取優先，快取沒有才抓網路並順手存起來
  e.respondWith(caches.match(req).then(function(hit) {
    if (hit) return hit;
    return fetch(req).then(function(res) {
      if (res && res.status === 200 && url.protocol === 'https:') {
        var copy = res.clone();
        caches.open(CACHE).then(function(c) { c.put(req, copy); });
      }
      return res;
    }).catch(function() {
      return caches.match('./index.html');
    });
  }));
});

