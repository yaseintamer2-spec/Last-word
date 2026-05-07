# Last Word — Mobile App Build Guide
## From your React project to Google Play Store

---

## WHAT YOU NEED FIRST (one-time setup)

Install these on your computer before anything else:

| Tool | Download link | Why |
|------|--------------|-----|
| **Node.js 20+** | https://nodejs.org | Runs the build tools |
| **Android Studio** | https://developer.android.com/studio | Builds the Android app |
| **Java 17** | Comes with Android Studio | Required by Android |

After installing Android Studio:
1. Open it, go to **SDK Manager** (top-right icon)
2. Install **Android SDK Platform 34** and **Android SDK Build-Tools 34**
3. Set the `ANDROID_HOME` environment variable:
   - Windows: search "Environment Variables" → New → `ANDROID_HOME` = `C:\Users\YOU\AppData\Local\Android\Sdk`
   - Mac/Linux: add to `~/.bashrc` → `export ANDROID_HOME=$HOME/Android/Sdk`

---

## STEP 1 — Merge the new files into your project

Copy these files from this zip into your project, replacing the old ones:

```
package.json                          ← replace
capacitor.config.ts                   ← NEW file (add to root)
vite.config.ts                        ← replace
src/App.tsx                           ← replace
src/components/layout.tsx             ← replace
```

---

## STEP 2 — Get your AdMob App ID

⚠️ This is DIFFERENT from your Ad Unit ID.

1. Go to https://admob.google.com
2. Click **Apps** in the left sidebar
3. Click your app (or **Add app** if not listed)
4. Copy the **App ID** — it looks like: `ca-app-pub-1445407957198527~1234567890`
5. Open `capacitor.config.ts` and replace `~XXXXXXXXXX` with your real App ID

---

## STEP 3 — Install dependencies

Open a terminal in your project folder and run:

```bash
npm install
```

This installs Capacitor and the AdMob plugin automatically.

---

## STEP 4 — Add the Android platform

Run these commands in order:

```bash
# Build your React app into the dist/ folder
npm run build

# Create the Android project inside your repo
npx cap add android

# Copy your built files into the Android project
npx cap sync android
```

After this you'll have an `android/` folder in your project — that's the real Android app.

---

## STEP 5 — Add AdMob to AndroidManifest.xml

Open this file:
```
android/app/src/main/AndroidManifest.xml
```

Find the `<application>` tag and add this line INSIDE it (replace with your real App ID):

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-1445407957198527~XXXXXXXXXX"/>
```

Also add internet permission ABOVE `<application>`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
```

---

## STEP 6 — Set your app icon and splash screen

1. In Android Studio, open your `android/` folder as a project
2. Right-click `app/src/main/res` → **New → Image Asset**
3. Choose **Launcher Icons**, upload your game logo
4. Android Studio generates all the sizes automatically

---

## STEP 7 — Build the release APK / AAB

In Android Studio:
1. **Build → Generate Signed Bundle / APK**
2. Choose **Android App Bundle** (AAB) — Google Play requires this
3. Create a new keystore (this is your signing key — **SAVE IT FOREVER**)
   - Key alias: `lastword`
   - Password: choose something strong
   - Fill in your name and country
4. Choose **Release** and click Finish
5. Your `.aab` file will be in `android/app/release/`

---

## STEP 8 — Upload to Google Play

1. Go to https://play.google.com/console
2. Create a developer account ($25 one-time fee)
3. Click **Create app**
4. Fill in app name, description, screenshots
5. Go to **Production → Releases → Create release**
6. Upload your `.aab` file
7. Submit for review — Google reviews take 1–7 days

---

## TESTING YOUR ADS

While building/testing, change `isTesting: false` to `isTesting: true` in `layout.tsx`.
This shows test ads so you don't accidentally click your own real ads (which violates AdMob policy).
Set it back to `false` before publishing.

---

## COMMON ERRORS

| Error | Fix |
|-------|-----|
| `ANDROID_HOME not set` | Set the environment variable (Step 1) |
| `SDK not found` | Install Android SDK 34 in Android Studio |
| `AdMob not initialized` | Make sure App ID is in AndroidManifest.xml |
| `App crashes on start` | Check `capacitor.config.ts` appId matches your package name |

---

## NEED HELP?

If you get stuck on any step, tell Claude exactly which step and what error message you see.
