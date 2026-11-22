# SHOPMASTER PRO — Native Android project

This folder contains a first native Android implementation plus a copy of the existing web prototype for reference. The reference screenshots supplied in `Billing.zip` were reviewed for navigation and feature direction. The app uses SHOPMASTER PRO's own branding; it does not reproduce Swipe's proprietary assets or code.

## Current implementation
- Native Java Android app, Android Studio / Gradle project
- SQLite local persistence
- Dashboard, Sales, Products, Customers, Expenses, Purchases, Reports, Shop Profile
- Add Product, Add Customer, Expense, Purchase entry
- Invoice and Quotation creation with one product line, manual GST %, discount, selectable PDF template label
- Invoice stock reduction; quotation does not reduce stock
- PDF generation, system print, save-to-device PDF picker and Android share sheet
- Shop profile and uploaded logo included in generated PDF

## Important limitations
This is a first native milestone, not yet a complete production accounting app. It still needs multi-line invoice editing, product image catalog and barcode scan, supplier ledger, purchase line items with stock increment, payment/receipt ledger, GST CGST/SGST/IGST handling, returns/challans/credit/debit notes, export/backup, full dashboard design parity and device testing. Template selection is stored but currently shares the same PDF layout; distinct layouts are a follow-up milestone.

## Build the APK
Open this folder in Android Studio, install Android SDK Platform 35, sync Gradle, then choose **Build → Build Bundle(s) / APK(s) → Build APK(s)**. The generated APK will be under `app/build/outputs/apk/debug/`.

The current execution environment does not have Android SDK or Gradle installed, so an APK could not be compiled or device-tested here. Do not treat this milestone as tax/accounting-certified software until calculations and workflows are tested with real sample data.
