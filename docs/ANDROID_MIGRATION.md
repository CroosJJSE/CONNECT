# Android Migration Guide (React Native + Expo)

This codebase is structured so **Cursor** (or another AI coding agent) can share core TypeScript modules between this **Mobile-First Web App** and the **React Native + Expo Android App** in `apps/mobile`.

Run the Android client:

```bash
cd apps/mobile
npm start
```

## 1. Directly Portable Modules (Zero DOM / Browser APIs)

Copy or extract these directories directly into your shared workspace package:

- `src/domain/models/` — All entity definitions (`UserProfile`, `Post`, `SharingItem`, `SharingRequest`, `SkillOffer`, `OrbitConnection`, `CommunityEvent`, `EventTask`, `FinanceTransaction`, `DriveMediaMetadata`, etc.).
- `src/domain/validation/` — Pure validation helpers aligned with `firebase-blueprint.json` and `firestore.rules`.
- `src/domain/logic/` — Pure business logic:
  - `feedAudience.ts` (chronological ordering + private/Orbit/community filtering)
  - `sharingRules.ts` (donate vs. lend/return state transitions)
  - `financeCategorizer.ts` (Kiwi-Money-style automatic categorization & budget math)
  - `smsParserBridge.ts` (pure regex/heuristic parser for bank/card transaction SMS strings)
- `src/services/interfaces/` — Repository and platform service interfaces (`IAuthService`, `IMediaStorageService`, `ICalendarService`, `ISmsIngestionBridge`, etc.).
- `src/hooks/` — Shared React hooks (`useAuth`, `useAppState`) which only consume the `services` registry and standard React hooks.

## 2. Native Adapters Required for React Native + Expo

Replace only the web-specific adapters in `src/services/` and UI components in `src/components/` / `src/pages/`:

| Responsibility | Web Implementation (Current) | Android Expo Replacement |
| :--- | :--- | :--- |
| **Auth (Google Sign-In)** | `IAuthService` (`signInWithPopup` / Mock) | `@react-native-google-signin/google-signin` + `@react-native-firebase/auth` |
| **Firestore** | `firebase/firestore` Web SDK | `@react-native-firebase/firestore` |
| **Local Key-Value Storage** | `window.localStorage` (isolated in `platformStorage.ts`) | `@react-native-async-storage/async-storage` or `expo-secure-store` |
| **Google Drive Media Upload** | Browser `File` / multipart upload in `googleDriveService.ts` | `expo-image-picker` + `expo-file-system` uploading via Drive v3 REST API using fresh OAuth access token |
| **Google Drive Media Preview** | `DriveMediaCard.tsx` (`<img>` + Drive Viewer fallback) | `Image` / `expo-web-browser` / `Linking.openURL(driveViewerLink)` |
| **Calendar Sync** | Google Calendar REST API + `.ics` download | Google Calendar REST API + optional `expo-calendar` native fallback |
| **Finance SMS Ingestion** | `NoopSmsIngestionBridge` (Web never requests SMS permissions) | Native Android module (`react-native-get-sms-android` or Kotlin BroadcastReceiver) feeding raw text into `parseBankSmsText()` from `src/domain/logic/smsParserBridge.ts` |

## 3. Google Play Policy Note for Android SMS Reading

- Do **not** declare `READ_SMS` or `RECEIVE_SMS` until Google Play permissions compliance review is prepared.
- Keep `ISmsIngestionBridge.isSupported()` returning `false` on Web and iOS, and guard Android permission prompts behind explicit user opt-in inside the Finance settings sheet.
- Store only parsed transaction metadata (`FinanceTransaction`) in Firestore under `/users/{uid}/transactions/{id}`; never upload raw full SMS inbox dumps.
