/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Example script to send a push notification from a Node.js environment
// Requires: npm install web-push
// Run: node scripts/send-push.js

const webpush = require('web-push');

// Replace these with your real keys from .env
const vapidPublicKey = 'BPIV6y7Z-G_p7u1v8u2y3z4w5x6v7u8t9s0r1q2p3o4n5m6l7k8j9i0h1g2f3e4d5c6b7a';
const vapidPrivateKey = 'YOUR_PRIVATE_KEY';

webpush.setVapidDetails(
  'mailto:example@yourdomain.org',
  vapidPublicKey,
  vapidPrivateKey
);

// This would come from your Supabase push_subscriptions table
const pushSubscription = {
  endpoint: '...',
  keys: {
    auth: '...',
    p256dh: '...'
  }
};

const payload = JSON.stringify({
  title: 'DashPulse Alert',
  body: 'AI BUY Signal detected at $32.45!',
  url: 'https://your-dashpulse-app.vercel.app/'
});

webpush.sendNotification(pushSubscription, payload)
  .then(result => console.log('Push sent:', result))
  .catch(err => console.error('Push error:', err));
