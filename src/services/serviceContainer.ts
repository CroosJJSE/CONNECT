import type {
  IAuthService,
  ICalendarService,
  ICommunityRepository,
  IEventRepository,
  IFeedRepository,
  IFinanceRepository,
  IMediaStorageService,
  IOrbitRepository,
  IPointsRepository,
  ISharingRepository,
  ISmsIngestionBridge,
} from './interfaces';
import {
  MockAuthService,
  MockCalendarService,
  MockCommunityRepository,
  MockDriveMediaService,
  MockEventRepository,
  MockFeedRepository,
  MockFinanceRepository,
  MockOrbitRepository,
  MockPointsRepository,
  MockSharingRepository,
  WebNoopSmsIngestionBridge,
} from './mock/mockRepositories';

export interface ServiceRegistry {
  auth: IAuthService;
  community: ICommunityRepository;
  orbit: IOrbitRepository;
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
  auth: new MockAuthService(),
  community: new MockCommunityRepository(),
  orbit: new MockOrbitRepository(),
  feed: new MockFeedRepository(),
  sharing: new MockSharingRepository(),
  events: new MockEventRepository(),
  finance: new MockFinanceRepository(),
  media: new MockDriveMediaService(),
  calendar: new MockCalendarService(),
  smsBridge: new WebNoopSmsIngestionBridge(),
  points: new MockPointsRepository(),
};
