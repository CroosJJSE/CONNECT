"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onJoinRequestReviewed = exports.onJoinRequestCreated = void 0;
exports.resolveAuthorizedPostRecipients = resolveAuthorizedPostRecipients;
exports.isLentItemDueSoon = isLentItemDueSoon;
exports.evaluateCreationPointAward = evaluateCreationPointAward;
exports.evaluateEventRsvpPointTransition = evaluateEventRsvpPointTransition;
/**
 * CONNECT — Firebase Cloud Functions
 */
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const v2_1 = require("firebase-functions/v2");
const firestore_2 = require("firebase-functions/v2/firestore");
const params_1 = require("firebase-functions/params");
/**
 * Computes recipients for a newly created post while strictly honoring
 * private, My Orbit, and community membership boundaries.
 */
function resolveAuthorizedPostRecipients(params) {
    if (params.audienceType === 'private') {
        return [];
    }
    const unique = new Set(params.audienceType === 'orbit' ? params.orbitMemberIds : params.communityMemberIds);
    unique.delete(params.authorId);
    return Array.from(unique);
}
/**
 * Evaluates lent sharing items whose return due date falls within the next 24 hours.
 */
function isLentItemDueSoon(dueDateIso, nowMs) {
    if (!dueDateIso)
        return false;
    const dueMs = Date.parse(dueDateIso);
    if (Number.isNaN(dueMs))
        return false;
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    return dueMs >= nowMs && dueMs - nowMs <= twentyFourHoursMs;
}
/**
 * Evaluates whether a newly created post/item/request/offer qualifies for points,
 * enforcing daily caps, Orbit/Private exclusions, and duplicate prevention.
 */
function evaluateCreationPointAward(params) {
    if (!params.rule.enabled || params.rule.points <= 0) {
        return { eligible: false, points: 0, reason: 'Rule disabled or zero points' };
    }
    if (params.activityType === 'community_post_create' && params.audienceType !== 'communities') {
        return { eligible: false, points: 0, reason: 'Orbit/private posts excluded' };
    }
    const reversedIds = new Set(params.existingTransactions
        .filter((t) => t.transactionType === 'reversal' && t.reversedTransactionId)
        .map((t) => t.reversedTransactionId));
    const duplicateExists = params.existingTransactions.some((t) => t.memberId === params.memberId &&
        t.activityType === params.activityType &&
        t.relatedPostId === params.entityId &&
        t.transactionType === 'award' &&
        !reversedIds.has(t.id));
    if (duplicateExists) {
        return { eligible: false, points: 0, reason: 'Duplicate award prevented' };
    }
    if (params.rule.dailyLimit && params.rule.dailyLimit > 0) {
        const dayPrefix = params.nowIso.slice(0, 10);
        const todayCount = params.existingTransactions.filter((t) => t.memberId === params.memberId &&
            t.activityType === params.activityType &&
            t.transactionType === 'award' &&
            t.createdAtIso.slice(0, 10) === dayPrefix &&
            !reversedIds.has(t.id)).length;
        if (todayCount >= params.rule.dailyLimit) {
            return { eligible: false, points: 0, reason: 'Daily limit reached' };
        }
    }
    return { eligible: true, points: params.rule.points };
}
/**
 * Evaluates event RSVP transitions against a single stored points balance:
 * - Initial -> Going: +points
 * - Going -> Maybe/Not Going: -points (reversal)
 * - Maybe/Not Going -> Going (re-select after reversal): +points (reinstatement)
 */
function evaluateEventRsvpPointTransition(params) {
    const eventAwards = params.existingTransactions.filter((t) => t.memberId === params.memberId &&
        t.activityType === 'event_rsvp_yes' &&
        t.relatedEventId === params.eventId &&
        t.transactionType === 'award');
    const reversedIds = new Set(params.existingTransactions
        .filter((t) => t.transactionType === 'reversal' && t.reversedTransactionId)
        .map((t) => t.reversedTransactionId));
    const activeAward = eventAwards.find((a) => !reversedIds.has(a.id));
    if (params.newStatus === 'going') {
        if (activeAward) {
            return { action: 'none', pointsDelta: 0 };
        }
        const originalAward = eventAwards[eventAwards.length - 1];
        if (originalAward) {
            return {
                action: 'reinstate',
                pointsDelta: originalAward.points,
                originalAwardId: originalAward.id,
            };
        }
        if (!params.rule.enabled || params.rule.points <= 0) {
            return { action: 'none', pointsDelta: 0 };
        }
        return {
            action: 'award',
            pointsDelta: params.rule.points,
        };
    }
    if (params.previousStatus === 'going' && activeAward) {
        return {
            action: 'reverse',
            pointsDelta: -activeAward.points,
            reversedTransactionId: activeAward.id,
        };
    }
    return { action: 'none', pointsDelta: 0 };
}
(0, app_1.initializeApp)();
(0, v2_1.setGlobalOptions)({ region: 'asia-south1', maxInstances: 10 });
const playStoreUrl = (0, params_1.defineString)('PLAY_STORE_URL', {
    default: 'https://play.google.com/store/apps',
});
const publicWebUrl = (0, params_1.defineString)('APP_PUBLIC_URL', { default: 'http://localhost:3000' });
const resendApiKey = (0, params_1.defineString)('RESEND_API_KEY', { default: '' });
const mailFrom = (0, params_1.defineString)('MAIL_FROM', { default: 'CONNECT <noreply@gcf-connect-lk.firebaseapp.com>' });
async function sendEmail(to, subject, text) {
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
function notifId() {
    return `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
exports.onJoinRequestCreated = (0, firestore_2.onDocumentCreated)('joinRequests/{uid}', async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const db = (0, firestore_1.getFirestore)();
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
        const email = priv.data()?.email;
        if (email) {
            await sendEmail(email, title, `${message}\n\nApprove them on the website: ${publicWebUrl.value()}/login`);
        }
    });
    await Promise.all(writes);
});
exports.onJoinRequestReviewed = (0, firestore_2.onDocumentUpdated)('joinRequests/{uid}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    if (before.status === after.status)
        return;
    if (after.status !== 'active')
        return;
    const email = after.email;
    if (!email)
        return;
    await sendEmail(email, 'You are approved for GCF CONNECT', `Your membership was approved.\n\nOpen the website: ${publicWebUrl.value()}\nDownload the Android app: ${playStoreUrl.value()}`);
});
