# SHOPMASTER PRO

Billing, inventory and shop management app for small shops (GST invoices, quotations, products, customers, expenses, purchases, reports).

## Structure
- `src/`, `index.html`, `package.json`, `vite.config.js`: Vite + React web app
- `android-native/`: Native Android app (Java, SQLite)
- `docs/`: Documentation

## Run the web app
npm install
npm run dev

## Build the Android app
1. Open `android-native/` in Android Studio.
2. Install Android SDK Platform 35 and sync Gradle.
3. Build > Build APK(s).

## Status
The native Android app is a first milestone, not a complete accounting product. Test GST calculations with sample data before business use.

## Privacy
Never commit real backups (customer data, phone numbers, logos).
