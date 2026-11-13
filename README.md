# CONNECT

Society-based community platform for sharing, feeds, My Orbit, events, and optional personal finance tracking.

## Web app

```bash
npm install
npm run dev
```

Runs the mobile-first Vite web client on port 3000 with in-memory mock services (Firebase adapters can be wired later).

## Android app (React Native + Expo)

The Android client lives in `apps/mobile`. It reuses `src/domain`, `src/hooks`, and `src/services` from this repo. Native adapters:

- `platformStorage.native.ts` — AsyncStorage
- `serviceContainer.native.ts` — Android SMS bridge stub (no `READ_SMS` permission)

```bash
cd apps/mobile
npm start
```

Then press `a` for Android, or run `npm run android`. Install Expo Go on a device, or use an emulator.

See `docs/ANDROID_MIGRATION.md` for the shared-module map and Play policy notes.
