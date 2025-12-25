# TODO

## GitHub Actions Setup

- [ ] Generate Firebase CI token (`firebase login:ci`)
- [ ] Download Firebase service account JSON from Firebase Console
- [ ] Add the following secrets to GitHub repository (Settings → Secrets → Actions):
  - [ ] `FIREBASE_TOKEN`
  - [ ] `FIREBASE_SERVICE_ACCOUNT`
  - [ ] `VITE_FIREBASE_API_KEY`
  - [ ] `VITE_FIREBASE_AUTH_DOMAIN`
  - [ ] `VITE_FIREBASE_PROJECT_ID`
  - [ ] `VITE_FIREBASE_STORAGE_BUCKET`
  - [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - [ ] `VITE_FIREBASE_APP_ID`
  - [ ] `VITE_FIREBASE_MEASUREMENT_ID`

## PWA Setup (Completed)

- [x] Installed vite-plugin-pwa
- [x] Created manifest.json with app metadata
- [x] Generated PWA icons (192x192, 512x512) from BS logo
- [x] Configured service worker with workbox
- [x] Added PWA meta tags to index.html
- [x] Implemented mobile-responsive navigation with drill-down pattern
