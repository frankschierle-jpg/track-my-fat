// Firebase Messaging Service Worker for background push
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCfKzlgqZLjvQtWikRfB5xiVVOpimYUDzM",
  projectId: "track-my-fat",
  messagingSenderId: "1256649219",
  appId: "1:1256649219:web:6f0e350ea13032f572d436"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Track My Speck';
  const options = {
    body: payload.notification?.body || 'Neue Nachricht',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'tms-push'
  };
  self.registration.showNotification(title, options);
});
