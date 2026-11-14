import type {
  IAuthService,
  ICalendarService,
  ICommunityRepository,
  IEventRepository,
  IFeedRepository,
  IFinanceRepository,
  IMediaStorageService,
  IMemoryRepository,
  IOrbitRepository,
  IPointsRepository,
  ISharingRepository,
  ISmsIngestionBridge,
} from './interfaces';
import { FirebaseAuthService } from './firebase/firebaseAuthService';
import { FirebaseCalendarService } from './firebase/calendarConnectService';
import { FirebaseDriveMediaService } from './firebase/driveMediaService';
import { isFirebaseConfigured } from './firebase/firebaseConfig';
import {
  MockAuthService,
  MockCalendarService,
  MockCommunityRepository,
  MockDriveMediaService,
  MockEventRepository,
  MockFeedRepository,
  MockFinanceRepository,
  MockMemoryRepository,
  MockOrbitRepository,
  MockPointsRepository,
  MockSharingRepository,
} from './mock/mockRepositories';
import { AndroidSmsIngestionBridge } from './sms/androidSmsIngestionBridge';

export interface ServiceRegistry {
  auth: IAuthService;
  community: ICommunityRepository;
  orbit: IOrbitRepository;
  memories: IMemoryRepository;
  feed: IFeedRepository;
  sharing: ISharingRepository;
  events: IEventRepository;
  finance: IFinanceRepository;
  media: IMediaStorageService;
  calendar: ICalendarService;
  smsBridge: ISmsIngestionBridge;
  points: IPointsRepository;
}

export const services: ServiceRegistry = {
  auth: isFirebaseConfigured() ? new FirebaseAuthService() : new MockAuthService(),
  community: new MockCommunityRepository(),
  orbit: new MockOrbitRepository(),
  memories: new MockMemoryRepository(),
  feed: new MockFeedRepository(),
  sharing: new MockSharingRepository(),
  events: new MockEventRepository(),
  finance: new MockFinanceRepository(),
  media: isFirebaseConfigured() ? new FirebaseDriveMediaService() : new MockDriveMediaService(),
  calendar: isFirebaseConfigured() ? new FirebaseCalendarService() : new MockCalendarService(),
  smsBridge: new AndroidSmsIngestionBridge(),
  points: new MockPointsRepository(),
};
