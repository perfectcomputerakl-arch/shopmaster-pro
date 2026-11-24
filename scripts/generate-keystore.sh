#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-./release-signing}"
mkdir -p "$OUT_DIR"
KEYSTORE="$OUT_DIR/shopmaster-pro-release.jks"
if [[ -e "$KEYSTORE" ]]; then
  echo "Refusing to overwrite existing keystore: $KEYSTORE" >&2
  exit 1
fi
read -r -s -p "Choose a strong keystore password: " STORE_PASS; echo
read -r -s -p "Choose a strong key password (may be same): " KEY_PASS; echo
read -r -p "Key alias [shopmasterpro]: " ALIAS
ALIAS="${ALIAS:-shopmasterpro}"
keytool -genkeypair -v -keystore "$KEYSTORE" -storetype JKS -alias "$ALIAS" -keyalg RSA -keysize 4096 -validity 10000 -dname "CN=ShopMaster Pro, OU=Mobile, O=ShopMaster, L=Akola, ST=Maharashtra, C=IN" -storepass "$STORE_PASS" -keypass "$KEY_PASS"
chmod 600 "$KEYSTORE"
base64 -w 0 "$KEYSTORE" > "$OUT_DIR/ANDROID_KEYSTORE_BASE64.txt"
printf '\n'
echo "Created permanent signing key: $KEYSTORE"
echo "Alias: $ALIAS"
echo "Base64 secret file: $OUT_DIR/ANDROID_KEYSTORE_BASE64.txt"
echo "BACK UP BOTH FILES SECURELY. Never commit them to GitHub."
