import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { CommunityEvent } from '../../domain/models';
import { insertGoogleCalendarEvent } from '../google/googleCalendarService';
import {
  hasGoogleWorkspaceAccessToken,
  requireGoogleWorkspaceAccessToken,
} from '../google/workspaceAccess';
import type { CalendarSyncResult, ICalendarService } from '../interfaces';
import { getFirebaseAuth, getFirebaseDb } from './firebaseApp';
import { FIRESTORE_PATHS } from './firestorePaths';
import { refreshGoogleWorkspaceAccess } from './googleSignIn';

function requireFirebase() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  if (!auth || !db) throw new Error('Firebase is not configured.');
  return { auth, db };
}

async function ensureAccessToken(): Promise<string> {
  if (hasGoogleWorkspaceAccessToken()) return requireGoogleWorkspaceAccessToken();
  const { auth } = requireFirebase();
  return refreshGoogleWorkspaceAccess(auth);
}

async function markCalendarConnected(): Promise<void> {
  const { auth, db } = requireFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await setDoc(
    doc(db, FIRESTORE_PATHS.userPrivateInfo(uid)),
    { uid, preferredCurrency: 'LKR', calendarConnected: true, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export class FirebaseCalendarService implements ICalendarService {
  async isCalendarAuthorized(): Promise<boolean> {
    if (hasGoogleWorkspaceAccessToken()) return true;
    const { auth, db } = requireFirebase();
    const uid = auth.currentUser?.uid;
    if (!uid) return false;
    const snap = await getDoc(doc(db, FIRESTORE_PATHS.userPrivateInfo(uid)));
    return Boolean(snap.data()?.calendarConnected);
  }

  async authorizeCalendarAccess(): Promise<boolean> {
    await ensureAccessToken();
    await markCalendarConnected();
    return true;
  }

  async getCalendarReminderLeadMinutes(): Promise<number> {
    const { auth, db } = requireFirebase();
    const uid = auth.currentUser?.uid;
    if (!uid) return 60;
    const snap = await getDoc(doc(db, FIRESTORE_PATHS.userPrivateInfo(uid)));
    const minutes = snap.data()?.calendarReminderMinutes;
    return typeof minutes === 'number' && minutes > 0 ? minutes : 60;
  }

  async setCalendarReminderLeadMinutes(minutes: number): Promise<void> {
    const { auth, db } = requireFirebase();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await setDoc(
      doc(db, FIRESTORE_PATHS.userPrivateInfo(uid)),
      {
        uid,
        preferredCurrency: 'LKR',
        calendarReminderMinutes: minutes,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  async addEventToGoogleCalendar(event: CommunityEvent): Promise<CalendarSyncResult> {
    const { auth, db } = requireFirebase();
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sign in to add this event to Google Calendar.');
    const token = await ensureAccessToken();
    const reminderMinutes = await this.getCalendarReminderLeadMinutes();
    const created = await insertGoogleCalendarEvent({
      accessToken: token,
      event,
      reminderMinutes,
    });
    await markCalendarConnected();
    const now = new Date().toISOString();
    await setDoc(doc(db, FIRESTORE_PATHS.userCalendarSync(uid, event.id)), {
      eventId: event.id,
      htmlLink: created.htmlLink ?? '',
      syncedAt: now,
    });
    const eventRef = doc(db, FIRESTORE_PATHS.event(event.id));
    const eventSnap = await getDoc(eventRef);
    if (eventSnap.exists()) {
      await setDoc(eventRef, { googleCalendarSynced: true }, { merge: true });
    }
    return {
      synced: true,
      provider: 'google_calendar_api',
      calendarEventLink: created.htmlLink,
      message: `"${event.title}" was added to your Google Calendar.`,
    };
  }
}
