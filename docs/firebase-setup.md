# Firebase setup for Revix online accounts + ranks

The static site works fully without Firebase (offline/guest mode). Follow these steps to enable online accounts and the global ranks list.

## 1. Create the project

1. Go to https://console.firebase.google.com → Add project.
2. Project settings → General → Your apps → Add app → Web. Copy the config values:
   `apiKey`, `authDomain`, `projectId`, `appId`.

## 2. Enable Firebase services

- **Authentication** → Sign-in method → enable **Email/Password**.
- **Firestore Database** → Create database → Start in test mode (or locked mode and add the rules below).

## 3. Firestore rules (Firestore → Rules)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{userId} {
      allow read: if true;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
      // clients may only increment lifetimeXp, capped per write
      allow update: if request.auth != null
        && request.auth.uid == userId
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lifetimeXp', 'updatedAt'])
        && (request.resource.data.lifetimeXp - resource.data.lifetimeXp) <= 500;
    }
  }
}
```

Clients can read all profiles but only write their own, and only via a bounded `lifetimeXp` increment — so nobody can award themselves arbitrary XP or edit ranks directly.

## 4. Wire the frontend

- **Local dev:** copy `.env.example` to `.env` and fill in:
  ```
  VITE_FIREBASE_API_KEY=...
  VITE_FIREBASE_AUTH_DOMAIN=...
  VITE_FIREBASE_PROJECT_ID=...
  VITE_FIREBASE_APP_ID=...
  ```
- **GitHub Pages:** repository Settings → Secrets and variables → Actions → add the four values as **Actions variables**, then reference them in the workflow build step:
  ```yaml
  - run: npm run build
    env:
      VITE_FIREBASE_API_KEY: ${{ vars.VITE_FIREBASE_API_KEY }}
      VITE_FIREBASE_AUTH_DOMAIN: ${{ vars.VITE_FIREBASE_AUTH_DOMAIN }}
      VITE_FIREBASE_PROJECT_ID: ${{ vars.VITE_FIREBASE_PROJECT_ID }}
      VITE_FIREBASE_APP_ID: ${{ vars.VITE_FIREBASE_APP_ID }}
  ```
  These are public Firebase config values, not secrets. **Never** put service-account credentials in the frontend.

Without these variables the app runs in offline mode and says so honestly.

## 5. Test it

1. Sign up two test accounts.
2. Complete quizzes → each account's `profiles/{uid}.lifetimeXp` increases in Firestore.
3. Try direct tampering in Firestore as a non-owner user: writes must be rejected.
4. Sign in on a second device/browser — XP syncs via the profile doc (best-effort; offline activity is queued and sent on next sign-in).

## Account deletion

In-app deletion removes the Firestore profile and the Firebase Auth user (requires a recent sign-in — Firebase reauthenticates the user before deletion).
