# Aura Finance

Mobile-first personal budget PWA with local-first storage, optional encrypted Firestore backup, Google sign-in, reports, recurring payments, custom categories, savings goals, and an admin allowlist.

## Run Locally

Prerequisite: Node.js.

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and fill the Firebase values.
3. Run the app:
   `npm run dev`

## Firebase Setup

Enable Google sign-in in Firebase Authentication and create a Firestore database. The app uses:

- `allowedUsers/{emailHash}` for access allowlisting
- `backups/{uid}` for optional encrypted cloud backups

Firestore rules are defined in `firestore.rules`.

## Deploy Firebase Hosting

1. Sign in to Firebase:
   `npm run firebase:login`
2. Make sure `VITE_FIREBASE_PROJECT_ID` is set in `.env`, or pass `FIREBASE_PROJECT_ID` when deploying.
3. Build and deploy only Hosting:
   `npm run deploy:hosting`

To deploy to a specific project without editing `.env`:
`FIREBASE_PROJECT_ID=your-project-id npm run deploy:hosting`
