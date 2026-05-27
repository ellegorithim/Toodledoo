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
   git init
   git add .
   git commit -m "Initial tracker app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/tracker-app.git
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` with your GitHub username.
4. On the repo page on github.com, click **Settings → Pages**.
5. Under "Build and deployment", set **Source = Deploy from a branch**, **Branch = main**, **Folder = /(root)**, then Save.
6. Wait ~1 minute. Your app is live at `https://YOUR_USERNAME.github.io/tracker-app/`.

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

## Upgrading to Real Cloud Sync (real friends, real-time)

Two free-tier options:

- **Firebase** (firebase.google.com) — NoSQL Firestore + built-in Google/email auth. Easier for live updates.
- **Supabase** (supabase.com) — open-source Postgres + auth. Easier if you like SQL.

Both require: create project, copy the config snippet, and replace the localStorage calls in `script.js` with calls to their SDK. Roughly 100–200 lines of code to wire up.

## File Structure

```
tracker-app/
├── index.html      # Page structure
├── styles.css      # Styling, animations, responsive
├── script.js       # All app logic, state, badges, challenges
├── manifest.json   # PWA manifest
├── sw.js           # Service worker (offline caching)
├── icon.svg        # App icon
└── README.md       # This file
```
