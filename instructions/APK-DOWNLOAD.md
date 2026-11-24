# Download the signed APK

1. Open the repository on GitHub and select **Actions**.
2. Open the latest successful **ShopMaster Pro - Signed Android Release APK** run.
3. In the **Artifacts** section, download `ShopMaster-Pro-v1.0.1-signed-release`.
4. Extract the ZIP and install `app-release.apk` on the Android device.
5. For updates, keep the same four signing Secrets and do not generate another keystore. Increase `versionCode` for every future release.

The workflow uploads the APK artifact for 90 days. It does not publish to Google Play.
