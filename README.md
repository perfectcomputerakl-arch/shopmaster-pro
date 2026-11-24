# ShopMaster Pro — Signed Android Release Build

React + Vite + Capacitor Android release build for `com.shopmaster.pro`.

## Verified project facts

- Capacitor app ID: `com.shopmaster.pro` (also confirmed from the uploaded `app-debug.apk` manifest).
- Uploaded APK signer: Android Debug certificate, not a production release key.
- Version configured by this build: `1.0.1`, Android `versionCode 2` (the supplied APK reports versionCode 1).
- The separate `android-native/` directory has application ID `com.perfectcomputer.shopmasterpro`. It is not used by this workflow and is intentionally left untouched.
- React app data/features and Supabase auth source are retained. The only UI source change is displaying the supplied ShopMaster Pro logo on the login screen.

## One-time setup

1. Generate the permanent key: `bash scripts/generate-keystore.sh` (or PowerShell script on Windows).
2. Follow [`instructions/GITHUB-SECRETS.md`](instructions/GITHUB-SECRETS.md) to add four Actions Secrets and two Actions Variables.
3. Commit and push this ZIP's project contents to `perfectcomputerakl-arch/shopmaster-pro` (replace/update the repository files; do not upload the outer ZIP as a nested file).
4. Run **Actions → ShopMaster Pro - Signed Android Release APK → Run workflow**.
5. Download the artifact using [`instructions/APK-DOWNLOAD.md`](instructions/APK-DOWNLOAD.md).

## Important signing compatibility note

The supplied `app-debug.apk` uses Android's generic debug certificate. A new release APK signed by the permanent release keystore cannot update an already-installed debug-signed copy in place. Back up the app's local data before uninstalling the debug copy, if Android asks you to uninstall it. All future release APKs built with the same permanent key can update each other (provided the application ID stays the same and versionCode increases).

## Build behavior

- Vite receives `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at build time.
- Workflow generates the Capacitor `android/` platform if absent, syncs `dist`, generates launcher assets from `assets/`, applies signing configuration, and runs `./gradlew assembleRelease`.
- `android-native/` is never copied, renamed, or built.
- `localStorage`, Bills, Products, Customers, Dashboard, and other feature source files are not migrated or reset by the workflow. Android app uninstall/reinstall can clear app-local data; export/backup app data before replacing an existing installation.

## Supabase OAuth note

Email/password auth is wired through the existing Supabase client. Google OAuth also remains in the existing source. For Android Google sign-in, verify the Supabase Auth URL Configuration / redirect allow-list and Google provider OAuth client settings for the redirect URI used by the app. This build system does not change your Supabase dashboard settings.

## Local web development

```bash
npm install
npm run dev
```

See `instructions/` for keystore, GitHub setup, and artifact retrieval.
