# Permanent Android signing key

The uploaded `app-debug.apk` was inspected: its package/application ID is `com.shopmaster.pro`. Its certificate owner is **Android Debug** (SHA-256 `10:26:AF:BD:85:94:F8:B5:D0:52:FC:4B:C3:66:71:6E:78:4A:E5:1F:E2:00:7E:22:0A:05:14:9A:0D:96:CC:0F`). This is a debug certificate, not a reusable production release key. Android will not accept a release APK signed with a different key as an in-place update over an installation signed with this debug key. Uninstalling the debug build may be required before installing the signed release; back up local data first.

## Generate the permanent release key ONCE

Linux/macOS/Git Bash:

```bash
bash scripts/generate-keystore.sh
```

Windows PowerShell (with JDK `keytool` on PATH):

```powershell
.\scripts\generate-keystore.ps1
```

The script creates `release-signing/shopmaster-pro-release.jks` and `release-signing/ANDROID_KEYSTORE_BASE64.txt`. Keep both in at least two secure backups. Do not regenerate this key for updates. If it is lost, you cannot sign updates compatible with installs made using it.

The key is created locally; it is not committed or uploaded automatically. The GitHub workflow reads it only from Actions Secrets.
