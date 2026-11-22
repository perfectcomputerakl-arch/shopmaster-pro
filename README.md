# SHOPMASTER PRO

Billing, inventory and shop management app for small shops (GST invoices, quotations, products, customers, expenses, purchases, reports).

## Repository structure

| Folder | Description |
|---|---|
| `web-app/` | Vite + React web version (data in browser localStorage) |
| `android-native/` | Native Android app (Java, SQLite, PDF share/print) |
| `sample-data/` | Sample backup JSON (demo data only) |
| `docs/` | Backup JSON format notes |

## Run the web app
```bash
cd web-app
npm install
npm run dev
```

## Build the Android app
1. Open `android-native/` in Android Studio (Hedgehog or newer).
2. Install Android SDK Platform 35 and sync Gradle.
3. Build > Build Bundle(s) / APK(s) > Build APK(s).

## Status
The native app is a first milestone and not a complete accounting product. See `android-native/README.md` for the list of features and pending work. Test GST calculations with real sample data before business use.

## Privacy
Do not commit real backups (customer data, phone numbers, logos). `.gitignore` already excludes `shopmaster-pro-backup-*.json`.
