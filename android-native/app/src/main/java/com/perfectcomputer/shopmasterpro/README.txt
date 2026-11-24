SHOPMASTER PRO — Native Android source project

This is the first native Android implementation milestone, built from the user's existing SHOPMASTER PRO prototype and the supplied Swipe reference screenshots. It uses original SHOPMASTER PRO branding and does not contain Swipe source code or assets.

Included in this milestone:
- Native Android Java application shell and navigation
- Local SQLite database (persists after app restart)
- Dashboard summaries
- Product create/list/delete and stock fields
- Customer create/list/delete
- Invoice and quotation creation (single product line per document in this milestone)
- Manual GST percentage and discount entry
- Invoice creation reduces stock; quotation does not
- PDF generation, Android share sheet, Android print framework, Save PDF via system document picker
- Shop profile details and shop logo upload; logo is included in generated PDF
- Expenses and basic purchase record entry
- Basic reports

Known scope still to complete before production use:
- Multi-line invoice editor, editing/deleting documents, payment ledger and balances
- Purchase item-level entry and automatic stock increase
- Supplier management, returns, challans, credit/debit notes
- GST split CGST/SGST/IGST and tax invoice validation
- Excel export, barcode scanning, thermal/Bluetooth printer integration
- Automated backup/restore, cloud sync, user accounts and robust migration tests
- Dashboard logo thumbnail and full visual parity with every supplied reference screen

Build:
1. Open this folder in Android Studio (Hedgehog or newer).
2. Install Android SDK Platform 35 and Android Gradle Plugin dependencies.
3. Sync Gradle.
4. Build > Build Bundle(s) / APK(s) > Build APK(s).

No APK is included because this environment has no Android SDK/Gradle installation, so a device-installable build could not be compiled or verified here. Do not use this milestone as the sole accounting record until the remaining modules and tax calculations are tested.
