# Tracker App

A pink-themed personal habit tracker with badges, local "monthly challenges with friends" (via share codes), and PWA install support.

## Features

- Multiple custom trackers (any activity, unit, daily goal, emoji)
- Animated wavy goal banner
- Daily logging with progress bars + percentage
- Streaks (🔥 N after 3+ consecutive days hitting goal)
- Reminders via browser Notifications API (per-tracker time)
- 16 badges for milestones (first log, streaks, perfect days, etc.)
- Monthly Challenges with leaderboards, using shareable codes (no server needed)
- Theme colors editable in Settings (main, accent 1, accent 2)
- Export / Import JSON backups
- Installable as a PWA (Add to Home Screen on iOS/Android)
- Works offline once installed (service worker caching)

## Run Locally

Just open `index.html` in a browser. For PWA features (service worker, install) you must serve it over HTTP. Easiest:

```bash
cd ~/tracker-app
python3 -m http.server 8000
```

Then open `http://localhost:8000` in Chrome or Safari.

## Deploy to GitHub Pages (free public hosting)

This gives you a real `https://yourname.github.io/tracker-app/` URL you can share with friends and install as a PWA.

### One-time setup

1. Create a free GitHub account at https://github.com if you don't have one.
2. On github.com, click **+ → New repository**. Name it `tracker-app`. Make it Public. Don't add a README (you already have one). Click **Create**.
3. In Terminal:

   ```bash
   cd ~/tracker-app
   git push -u origin main
   ```

   (`git init`, `git add`, `git commit`, and `git remote add origin https://github.com/ellegortithim/tracker-app.git` have already been done.) When prompted for password, paste a **Personal Access Token** from https://github.com/settings/tokens (Generate new (classic) → check `repo` scope → copy the token → use it as the password).
4. On the repo page, click **Settings → Pages**.
5. Under "Build and deployment", set **Source = Deploy from a branch**, **Branch = main**, **Folder = /(root)**, then Save.
6. Wait ~1 minute. Your app is live at **https://ellegortithim.github.io/tracker-app/**.

### Future updates

```bash
cd ~/tracker-app
git add .
git commit -m "What changed"
git push
```

GitHub Pages auto-redeploys.

## Install on your phone

1. Open your deployed URL in **Safari (iPhone)** or **Chrome (Android)**.
2. iPhone: tap the **Share** button → **Add to Home Screen**.
3. Android: tap the **Install** prompt, or menu → **Install app**.
4. Launch from your home screen. It opens full-screen like a real app.

## How "Challenges with Friends" work (no server)

Because there's no backend yet, friends sync via copy-pasted codes:

1. You tap **Challenges → + New Challenge** → fill in name, target, dates.
2. Open the challenge → **Share Invite Code** → send the code to a friend.
3. Friend opens the app → **Challenges → Join via Code** → pastes it.
4. Both of you log progress (**+ Add to My Total**).
5. Each person taps **Send My Result** → sends their result code to the group chat.
6. Everyone pastes received codes via **Paste Friend's Result** → leaderboard updates.

This is manual but requires zero backend. If you later want live sync, see "Upgrading to real cloud sync" below.

## Upgrading to a Real Mobile App (App Store / Play Store)

When you're ready to publish to app stores, use **Capacitor** to wrap this existing code:

```bash
# In ~/tracker-app
npm init -y
npm install @capacitor/core @capacitor/cli
npx cap init Tracker com.yourname.tracker --web-dir .
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
npx cap open ios     # Requires Xcode (Mac only)
npx cap open android # Requires Android Studio
```

From there you build and submit to the stores. Apple Developer = $99/yr, Google Play = $25 one-time.

## Setting Up Firebase (for real accounts + cross-device friends)

The app currently uses local-only mode (no accounts). To enable real accounts and live friend syncing, follow these steps. **You** must do steps 1–6; I cannot create accounts or projects on your behalf.

### 1. Create a Firebase project
1. Go to https://console.firebase.google.com
2. Sign in with Google → **Add project** → name it `tracker-app` → continue → disable Analytics (or enable, your choice) → Create.

### 2. Add a Web App to the project
1. On the project Overview page, click the **`</>`** (web) icon.
2. App nickname: `Tracker Web` → **Register app**.
3. Firebase shows you a config object. Copy the values into `firebase-config.js` in this folder:

   ```js
   window.FIREBASE_CONFIG = {
     apiKey: 'AIza...',
     authDomain: 'tracker-app-xxxx.firebaseapp.com',
     projectId: 'tracker-app-xxxx',
     storageBucket: 'tracker-app-xxxx.appspot.com',
     messagingSenderId: '1234567890',
     appId: '1:1234567890:web:abc123',
   };
   ```

### 3. Enable Authentication
1. In Firebase Console → **Build → Authentication → Get started**.
2. Click **Sign-in method** tab → enable **Email/Password** (and **Google** if you want one-tap login).

### 4. Create the Firestore database
1. **Build → Firestore Database → Create database** → Start in **production mode** → pick a region close to you → Enable.
2. Go to the **Rules** tab and paste:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
       match /challenges/{challengeId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

3. Publish.

### 5. Add your domain to authorized domains
- Authentication → Settings → Authorized domains → Add `ellegortithim.github.io`.

### 6. Tell me you're done
Once you've completed steps 1–5 and pasted your config into `firebase-config.js`, ask me to "wire up Firebase" and I'll add:
- Login / signup screen
- Real username uniqueness check
- Friend requests (send / accept / reject)
- Cross-device challenge sync
- Live leaderboards that update without re-pasting codes

Until then, the app works fully in local mode with QR-code-based friend adding and challenge sharing.

### Alternative: Supabase
If you prefer SQL/Postgres, https://supabase.com is the equivalent. Same general flow but uses Postgres instead of Firestore. I can wire that up too if you'd rather.

## File Structure

```
tracker-app/
├── index.html          # Page structure
├── styles.css          # Styling, animations, responsive
├── script.js           # All app logic, state, badges, challenges, QR
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline caching)
├── icon.svg            # App icon
├── firebase-config.js  # Placeholder for Firebase config (real accounts opt-in)
└── README.md           # This file
```
