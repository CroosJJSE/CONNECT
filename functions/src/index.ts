/**
 * CONNECT — Firebase Cloud Functions
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { defineString } from 'firebase-functions/params';

initializeApp();
setGlobalOptions({ region: 'asia-south1', maxInstances: 10 });

export * from './logic.js';
export * from './community.js';

const playStoreUrl = defineString('PLAY_STORE_URL', {
  default: 'https://play.google.com/store/apps',
});
const publicWebUrl = defineString('APP_PUBLIC_URL', { default: 'http://localhost:3000' });
const resendApiKey = defineString('RESEND_API_KEY', { default: '' });
const mailFrom = defineString('MAIL_FROM', { default: 'CONNECT <noreply@gcf-connect-lk.firebaseapp.com>' });

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const key = resendApiKey.value();
  if (!key) {
    console.log('Skipping email (RESEND_API_KEY unset):', subject, to);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: mailFrom.value(),
      to: [to],
      subject,
      text,
    }),
  });
  if (!res.ok) {
    console.error('Resend error', res.status, await res.text());
  }
}

function notifId(): string {
  return `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const onJoinRequestCreated = onDocumentCreated('joinRequests/{uid}', async (event) => {
  const data = event.data?.data();
  if (!data) return;
  const db = getFirestore();
  const admins = await db.collection('admins').get();
  const now = new Date().toISOString();
  const title = 'New CONNECT application';
  const message = `${data.displayName ?? 'Someone'} (${data.email ?? ''}) applied from ${data.locality ?? 'an unknown place'}.`;
  const writes = admins.docs.map(async (adminDoc) => {
    const adminId = adminDoc.id;
    await db.collection('users').doc(adminId).collection('notifications').doc(notifId()).set({
      title,
      message,
      createdAtIso: now,
      read: false,
      route: 'profile',
      recipientUserId: adminId,
    });
    const priv = await db.collection('users').doc(adminId).collection('private').doc('info').get();
    const email = priv.data()?.email as string | undefined;
    if (email) {
      await sendEmail(
        email,
        title,
        `${message}\n\nApprove them on the website: ${publicWebUrl.value()}/login`
      );
    }
  });
  await Promise.all(writes);
});

export const onJoinRequestReviewed = onDocumentUpdated('joinRequests/{uid}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  if (before.status === after.status) return;
  if (after.status !== 'active') return;
  const email = after.email as string | undefined;
  if (!email) return;
  await sendEmail(
    email,
    'You are approved for GCF CONNECT',
    `Your membership was approved.\n\nOpen the website: ${publicWebUrl.value()}\nDownload the Android app: ${playStoreUrl.value()}`
  );
});


