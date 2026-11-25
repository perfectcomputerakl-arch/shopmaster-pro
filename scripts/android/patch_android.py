#!/usr/bin/env python3
"""Patch the Capacitor-generated android/ project (never android-native/).

Usage: patch_android.py <android_dir> <application_id> <version_name> <version_code>
"""
import re
import sys
from pathlib import Path

SIGNING_BLOCK = """
    signingConfigs {
        release {
            // Filled from environment variables by CI. Nothing secret is stored in the repository.
            def ksPath = System.getenv('ANDROID_KEYSTORE_PATH')
            if (ksPath) {
                storeFile file(ksPath)
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD')
            }
        }
    }
"""

DEEP_LINK = """            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="shopmasterpro" android:host="auth-callback" />
            </intent-filter>
"""


def die(msg):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def patch_gradle(path: Path, app_id: str, version_name: str, version_code: str):
    s = path.read_text()
    s, n1 = re.subn(r'namespace\s+["\'][^"\']+["\']', f'namespace "{app_id}"', s, count=1)
    s, n2 = re.subn(r'applicationId\s+["\'][^"\']+["\']', f'applicationId "{app_id}"', s, count=1)
    s, n3 = re.subn(r'versionCode\s+\d+', f'versionCode {version_code}', s, count=1)
    s, n4 = re.subn(r'versionName\s+["\'][^"\']*["\']', f'versionName "{version_name}"', s, count=1)
    if not (n1 and n2 and n3 and n4):
        die("app/build.gradle layout not recognised (namespace/applicationId/versionCode/versionName)")
    if "signingConfig signingConfigs.release" not in s:
        if not re.search(r'^\s*buildTypes\s*\{', s, re.M):
            die("buildTypes block not found in app/build.gradle")
        if "signingConfigs {" not in s:
            s = re.sub(r'^(\s*)buildTypes\s*\{', lambda m: SIGNING_BLOCK + m.group(0), s, count=1, flags=re.M)
        s, n = re.subn(r'(buildTypes\s*\{\s*release\s*\{)', r'\1\n            signingConfig signingConfigs.release', s, count=1)
        if n != 1:
            die("could not attach signingConfig to the release build type")
    path.write_text(s)


def patch_manifest(path: Path):
    s = path.read_text()
    if "android.speech.RecognitionService" not in s:
        q = '<queries><intent><action android:name="android.speech.RecognitionService"/></intent></queries>'
        if "<application" not in s:
            die("<application> not found in AndroidManifest.xml")
        s = s.replace("<application", q + "\n    <application", 1)
    if "RECORD_AUDIO" not in s:
        s = s.replace("</manifest>", '    <uses-permission android:name="android.permission.RECORD_AUDIO"/>\n</manifest>', 1)
    if 'android:scheme="shopmasterpro"' not in s:
        m = re.search(r'(<activity\b[^>]*\.MainActivity[^>]*>)(.*?)(</activity>)', s, re.S)
        if not m:
            die("MainActivity <activity> block not found in AndroidManifest.xml")
        s = s[:m.end(2)] + DEEP_LINK + "        " + s[m.start(3):]
    path.write_text(s)


def main():
    if len(sys.argv) != 5:
        die(__doc__)
    root, app_id, vname, vcode = Path(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
    if not re.fullmatch(r'[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+', app_id):
        die(f"invalid application id: {app_id}")
    if not re.fullmatch(r'\d+', vcode) or int(vcode) < 1:
        die(f"invalid version code: {vcode}")
    gradle = root / "app" / "build.gradle"
    manifest = root / "app" / "src" / "main" / "AndroidManifest.xml"
    for f in (gradle, manifest):
        if not f.exists():
            die(f"{f} not found - did `npx cap add android` run?")
    patch_gradle(gradle, app_id, vname, vcode)
    patch_manifest(manifest)
    print(f"Patched {root}: applicationId={app_id} versionName={vname} versionCode={vcode}")


if __name__ == "__main__":
    main()
