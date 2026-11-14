import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import type { NotificationItem } from '../../domain/models';
import { getFirebaseDb } from './firebaseApp';
import { FIRESTORE_PATHS } from './firestorePaths';

export async function listUserNotifications(userId: string): Promise<NotificationItem[]> {
  const db = getFirebaseDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, FIRESTORE_PATHS.userNotifications(userId)));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      recipientUserId: userId,
      title: String(data.title ?? 'Notice'),
      message: String(data.message ?? ''),
      createdAtIso: String(data.createdAtIso ?? ''),
      read: Boolean(data.read),
      route: (data.route as NotificationItem['route']) ?? 'home',
    };
  });
}

export async function markUserNotificationsRead(userId: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  const snap = await getDocs(collection(db, FIRESTORE_PATHS.userNotifications(userId)));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    if (!d.data().read) batch.update(doc(db, FIRESTORE_PATHS.userNotifications(userId), d.id), { read: true });
  });
  await batch.commit();
}
