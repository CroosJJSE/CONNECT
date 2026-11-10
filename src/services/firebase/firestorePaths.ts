/**
 * Canonical Firestore collection & document paths synchronized with firebase-blueprint.json
 * and firestore.rules. Portable across Web SDK and @react-native-firebase/firestore.
 */
export const FIRESTORE_PATHS = {
  userPublic: (userId: string) => `users/${userId}`,
  userPrivateInfo: (userId: string) => `users/${userId}/private/info`,
  userTransactions: (userId: string) => `users/${userId}/transactions`,
  userBudgets: (userId: string) => `users/${userId}/budgets`,
  userSavingsGoals: (userId: string) => `users/${userId}/savingsGoals`,
  communities: () => 'communities',
  communityMembers: (communityId: string) => `communities/${communityId}/members`,
  orbitMembers: (ownerId: string) => `orbits/${ownerId}/members`,
  posts: () => 'posts',
  postComments: (postId: string) => `posts/${postId}/comments`,
  sharingItems: () => 'sharingItems',
  sharingRequests: () => 'sharingRequests',
  skillOffers: () => 'skillOffers',
  events: () => 'events',
  eventTasks: (eventId: string) => `events/${eventId}/tasks`,
  eventDiscussions: (eventId: string) => `events/${eventId}/discussions`,
  driveMedia: () => 'driveMedia',
} as const;
