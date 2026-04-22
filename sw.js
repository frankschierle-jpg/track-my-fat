// TMF Service Worker v1
const CACHE = 'tmf-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

// ── Install: cache shell ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first, fallback cache ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('firebasejs') || e.request.url.includes('googleapis')) return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Push: show notification ──
self.addEventListener('push', e => {
  let data = { title: '🔥 TRACK MY FAT', body: 'Zeit dein Gewicht einzutragen!', tag: 'tmf-reminder' };
  try { data = { ...data, ...e.data.json() }; } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      actions: [
        { action: 'open', title: '📊 App öffnen' },
        { action: 'dismiss', title: 'Später' }
      ]
    })
  );
});

// ── Notification click: open app ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      const open = cls.find(c => c.url.includes(self.location.origin) && 'focus' in c);
      if (open) return open.focus();
      return clients.openWindow('/');
    })
  );
});

// ── Background Sync: check reminders ──
self.addEventListener('sync', e => {
  if (e.tag === 'tmf-check-reminders') {
    e.waitUntil(checkRemindersInBackground());
  }
});

// ── Periodic Background Sync (Chrome Android) ──
self.addEventListener('periodicsync', e => {
  if (e.tag === 'tmf-daily-reminder') {
    e.waitUntil(checkRemindersInBackground());
  }
});

async function checkRemindersInBackground() {
  // Read reminder data from IndexedDB (since localStorage not available in SW)
  try {
    const db = await openReminderDB();
    const reminders = await db.getAll('reminders');
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    for (const rem of reminders) {
      if (rem.tracked) continue; // already tracked today
      if (rem.h === h && rem.m === m) {
        await self.registration.showNotification(`🔥 ${rem.userName} — Gewicht eintragen!`, {
          body: `${rem.label}: Heute noch nicht getrackt. Bad tracker — gets fatter.`,
          tag: `tmf-rem-${rem.userId}-${rem.key}`,
          icon: '/icon-192.png',
          vibrate: [200, 100, 200],
          requireInteraction: false,
        });
      }
    }
  } catch (err) {
    console.warn('SW reminder check failed:', err);
  }
}

function openReminderDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('tmf-reminders', 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('reminders')) {
        db.createObjectStore('reminders', { keyPath: 'id' });
      }
    };
    req.onsuccess = e => {
      const db = e.target.result;
      db.getAll = (store) => new Promise((res, rej) => {
        const tx = db.transaction(store, 'readonly');
        const req2 = tx.objectStore(store).getAll();
        req2.onsuccess = () => res(req2.result);
        req2.onerror = rej;
      });
      resolve(db);
    };
    req.onerror = reject;
  });
}
