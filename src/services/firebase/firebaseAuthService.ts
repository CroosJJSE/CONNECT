import {
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { DEFAULT_COMMUNITY, DEFAULT_COMMUNITY_ID, deriveInitials } from '../../domain/membership';
import type {
  AuthIdentity,
  AuthSession,
  JoinRequest,
  MembershipStatus,
  UserProfile,
} from '../../domain/models';
import type { IAuthService } from '../interfaces';
import { hasGoogleWorkspaceAccessToken } from '../google/workspaceAccess';
import { workspaceTokenStore } from '../google/workspaceTokenStore';
import { getFirebaseAuth, getFirebaseDb } from './firebaseApp';
import { FIRESTORE_PATHS } from './firestorePaths';
import { signInWithGoogleNative } from './googleSignIn';

function requireAuth() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  if (!auth || !db) throw new Error('Firebase is not configured.');
  return { auth, db };
}

function identityFromUser(user: User): AuthIdentity {
  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Member',
    avatarUrl: user.photoURL ?? undefined,
  };
}

function mapPublicProfile(
  uid: string,
  data: Record<string, unknown>,
  email: string
): UserProfile {
  const membershipStatus = (data.membershipStatus as MembershipStatus | undefined) ?? 'pending';
  return {
    uid,
    displayName: String(data.displayName ?? 'Member'),
    initials: String(data.initials ?? 'GCF'),
    email,
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : undefined,
    clusterName: String(data.clusterName ?? ''),
    unitLabel: String(data.unitLabel ?? ''),
    bio: String(data.bio ?? ''),
    role: (data.role as UserProfile['role']) ?? 'member',
    verified: Boolean(data.verified),
    membershipStatus,
    joinedAtIso: typeof data.joinedAt === 'string' ? data.joinedAt : new Date().toISOString(),
    communityIds: [DEFAULT_COMMUNITY_ID],
    preferredCurrency: 'LKR',
    phoneVisibleToHousemates: false,
    driveConnected: false,
    calendarConnected: false,
    financeEnabled: false,
    points: typeof data.points === 'number' ? data.points : 0,
  };
}

async function loadSession(user: User): Promise<AuthSession> {
  const { db } = requireAuth();
  const identity = identityFromUser(user);
  const [publicSnap, privateSnap, adminSnap] = await Promise.all([
    getDoc(doc(db, FIRESTORE_PATHS.userPublic(user.uid))),
    getDoc(doc(db, FIRESTORE_PATHS.userPrivateInfo(user.uid))),
    getDoc(doc(db, FIRESTORE_PATHS.admin(user.uid))),
  ]);
  const isAdmin = adminSnap.exists();
  if (!publicSnap.exists()) {
    return { identity, profile: null, accessState: 'unknown', isAdmin };
  }
  const email =
    (privateSnap.exists() && typeof privateSnap.data().email === 'string'
      ? privateSnap.data().email
      : identity.email) || identity.email;
  const profile = mapPublicProfile(user.uid, publicSnap.data() as Record<string, unknown>, email);
  if (privateSnap.exists()) {
    const priv = privateSnap.data();
    if (priv.preferredCurrency === 'LKR' || priv.preferredCurrency === 'USD') {
      profile.preferredCurrency = priv.preferredCurrency;
    }
    if (typeof priv.financeEnabled === 'boolean') profile.financeEnabled = priv.financeEnabled;
    if (typeof priv.phoneVisibleToHousemates === 'boolean') {
      profile.phoneVisibleToHousemates = priv.phoneVisibleToHousemates;
    }
    if (typeof priv.driveConnected === 'boolean') profile.driveConnected = priv.driveConnected;
    if (typeof priv.calendarConnected === 'boolean') profile.calendarConnected = priv.calendarConnected;
  }
  if (profile.role === 'admin' || isAdmin) {
    profile.role = isAdmin ? 'admin' : profile.role;
    return { identity, profile, accessState: 'active', isAdmin: true };
  }
  return { identity, profile, accessState: profile.membershipStatus, isAdmin: false };
}

function nextNotifId(): string {
  return `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class FirebaseAuthService implements IAuthService {
  usesLiveFirebase(): boolean {
    return true;
  }

  subscribeSession(listener: (session: AuthSession | null) => void): () => void {
    const { auth } = requireAuth();
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        listener(null);
        return;
      }
      void loadSession(user)
        .then(listener)
        .catch(() => listener(null));
    });
  }

  async getSession(): Promise<AuthSession | null> {
    const { auth } = requireAuth();
    const user = auth.currentUser;
    if (!user) return null;
    return loadSession(user);
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    const session = await this.getSession();
    if (!session || session.accessState !== 'active' || !session.profile) return null;
    return session.profile;
  }

  async signInWithGoogle(): Promise<AuthSession> {
    const { auth, db } = requireAuth();
    const cred = await signInWithGoogleNative(auth);
    if (hasGoogleWorkspaceAccessToken()) {
      const privateRef = doc(db, FIRESTORE_PATHS.userPrivateInfo(cred.user.uid));
      const privateSnap = await getDoc(privateRef);
      if (privateSnap.exists()) {
        await setDoc(
          privateRef,
          {
            uid: cred.user.uid,
            preferredCurrency: 'LKR',
            driveConnected: true,
            calendarConnected: true,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    }
    return loadSession(cred.user);
  }

  async signOut(): Promise<void> {
    const { auth } = requireAuth();
    workspaceTokenStore.clearAll();
    await auth.signOut();
  }

  async updateProfile(
    uid: string,
    patch: Partial<
      Pick<
        UserProfile,
        | 'displayName'
        | 'clusterName'
        | 'unitLabel'
        | 'bio'
        | 'preferredCurrency'
        | 'phoneVisibleToHousemates'
        | 'financeEnabled'
      >
    >
  ): Promise<UserProfile> {
    const { db } = requireAuth();
    const publicRef = doc(db, FIRESTORE_PATHS.userPublic(uid));
    const privateRef = doc(db, FIRESTORE_PATHS.userPrivateInfo(uid));
    const publicSnap = await getDoc(publicRef);
    if (!publicSnap.exists()) throw new Error('User profile not found.');
    const existing = publicSnap.data() as Record<string, unknown>;
    const displayName = patch.displayName?.trim() || String(existing.displayName ?? 'Member');
    const publicPatch: Record<string, unknown> = {};
    if (patch.displayName !== undefined) {
      publicPatch.displayName = displayName;
      publicPatch.initials = deriveInitials(displayName);
    }
    if (patch.clusterName !== undefined) publicPatch.clusterName = patch.clusterName;
    if (patch.unitLabel !== undefined) publicPatch.unitLabel = patch.unitLabel;
    if (patch.bio !== undefined) publicPatch.bio = patch.bio;
    if (Object.keys(publicPatch).length > 0) await updateDoc(publicRef, publicPatch);

    const privatePatch: Record<string, unknown> = { uid };
    if (patch.preferredCurrency !== undefined) privatePatch.preferredCurrency = patch.preferredCurrency;
    if (patch.phoneVisibleToHousemates !== undefined) {
      privatePatch.phoneVisibleToHousemates = patch.phoneVisibleToHousemates;
    }
    if (patch.financeEnabled !== undefined) privatePatch.financeEnabled = patch.financeEnabled;
    if (Object.keys(privatePatch).length > 1) {
      await setDoc(privateRef, privatePatch, { merge: true });
    }
    const session = await this.getSession();
    if (!session?.profile) throw new Error('Unable to reload profile.');
    return session.profile;
  }

  async getDemoAccounts(): Promise<UserProfile[]> {
    return [];
  }

  async submitJoinRequest(input: { displayName: string; locality: string }): Promise<AuthSession> {
    const { auth, db } = requireAuth();
    const user = auth.currentUser;
    if (!user?.email) throw new Error('Sign in with Google before applying.');
    const displayName = input.displayName.trim();
    const locality = input.locality.trim();
    if (!displayName) throw new Error('Please enter your name.');
    if (!locality) throw new Error('Please enter your place of living.');

    const batch = writeBatch(db);
    const publicRef = doc(db, FIRESTORE_PATHS.userPublic(user.uid));
    const privateRef = doc(db, FIRESTORE_PATHS.userPrivateInfo(user.uid));
    const requestRef = doc(db, FIRESTORE_PATHS.joinRequest(user.uid));
    const now = new Date().toISOString();
    batch.set(publicRef, {
      uid: user.uid,
      displayName,
      initials: deriveInitials(displayName),
      avatarUrl: user.photoURL ?? '',
      clusterName: locality,
      unitLabel: '',
      bio: '',
      role: 'member',
      verified: false,
      membershipStatus: 'pending',
      joinedAt: now,
      points: 0,
    });
    batch.set(privateRef, {
      uid: user.uid,
      email: user.email,
      preferredCurrency: 'LKR',
      phoneVisibleToHousemates: false,
      driveConnected: false,
      calendarConnected: false,
      financeEnabled: false,
      updatedAt: now,
    });
    batch.set(requestRef, {
      uid: user.uid,
      displayName,
      email: user.email,
      locality,
      status: 'pending',
      createdAt: now,
    });
    await batch.commit();
    return loadSession(user);
  }

  async listJoinRequests(): Promise<JoinRequest[]> {
    const { db } = requireAuth();
    const snap = await getDocs(
      query(
        collection(db, FIRESTORE_PATHS.joinRequests()),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      )
    );
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: String(data.uid ?? d.id),
        displayName: String(data.displayName ?? ''),
        email: String(data.email ?? ''),
        locality: String(data.locality ?? ''),
        status: (data.status as JoinRequest['status']) ?? 'pending',
        createdAtIso: String(data.createdAt ?? ''),
        reviewedAtIso: typeof data.reviewedAt === 'string' ? data.reviewedAt : undefined,
        reviewedByUid: typeof data.reviewedByUid === 'string' ? data.reviewedByUid : undefined,
      };
    });
  }

  async approveJoinRequest(uid: string): Promise<void> {
    const { auth, db } = requireAuth();
    const actor = auth.currentUser;
    if (!actor) throw new Error('Not signed in.');
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    const publicRef = doc(db, FIRESTORE_PATHS.userPublic(uid));
    const publicSnap = await getDoc(publicRef);
    if (!publicSnap.exists()) throw new Error('Applicant profile not found.');
    const existing = publicSnap.data() as Record<string, unknown>;
    batch.update(publicRef, {
      membershipStatus: 'active',
      verified: true,
      role: existing.role === 'admin' ? 'admin' : 'member',
    });
    batch.update(doc(db, FIRESTORE_PATHS.joinRequest(uid)), {
      status: 'active',
      reviewedAt: now,
      reviewedByUid: actor.uid,
    });
    const communityRef = doc(db, FIRESTORE_PATHS.communities(), DEFAULT_COMMUNITY_ID);
    const communitySnap = await getDoc(communityRef);
    if (!communitySnap.exists()) {
      batch.set(communityRef, {
        id: DEFAULT_COMMUNITY.id,
        name: DEFAULT_COMMUNITY.name,
        description: DEFAULT_COMMUNITY.description,
        location: DEFAULT_COMMUNITY.location,
        memberCount: 1,
        category: DEFAULT_COMMUNITY.category,
      });
    }
    batch.set(doc(db, FIRESTORE_PATHS.communityMembers(DEFAULT_COMMUNITY_ID), uid), {
      userId: uid,
      communityId: DEFAULT_COMMUNITY_ID,
      role: 'member',
      status: 'active',
      joinedAt: now,
    });
    batch.set(doc(db, FIRESTORE_PATHS.userNotifications(uid), nextNotifId()), {
      title: 'Welcome to CONNECT',
      message: 'Your membership was approved. You can use the website and the Android app.',
      createdAtIso: now,
      read: false,
      route: 'home',
      recipientUserId: uid,
    });
    await batch.commit();
  }

  async rejectJoinRequest(uid: string): Promise<void> {
    const { auth, db } = requireAuth();
    const actor = auth.currentUser;
    if (!actor) throw new Error('Not signed in.');
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    batch.update(doc(db, FIRESTORE_PATHS.userPublic(uid)), {
      membershipStatus: 'rejected',
      verified: false,
    });
    batch.update(doc(db, FIRESTORE_PATHS.joinRequest(uid)), {
      status: 'rejected',
      reviewedAt: now,
      reviewedByUid: actor.uid,
    });
    await batch.commit();
  }
}
