import fs from 'node:fs';
import path from 'node:path';

const required = ['ANDROID_KEYSTORE_BASE64','ANDROID_KEYSTORE_PASSWORD','ANDROID_KEY_ALIAS','ANDROID_KEY_PASSWORD'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing GitHub Secret: ${name}`);
}
const root = process.cwd();
const appDir = path.join(root, 'android', 'app');
const gradleFile = path.join(appDir, 'build.gradle');
if (!fs.existsSync(gradleFile)) throw new Error('android/app/build.gradle not found. Capacitor Android platform generation failed.');
const keystorePath = path.join(appDir, 'shopmaster-release.jks');
fs.writeFileSync(keystorePath, Buffer.from(process.env.ANDROID_KEYSTORE_BASE64, 'base64'), { mode: 0o600 });
if (fs.statSync(keystorePath).size < 1024) throw new Error('Decoded keystore is empty or invalid.');
let gradle = fs.readFileSync(gradleFile, 'utf8');
// Set versionCode above the supplied debug APK's versionCode (1) and requested versionName.
gradle = gradle.replace(/versionCode\s+\d+/, 'versionCode 2');
gradle = gradle.replace(/versionName\s+['"][^'"]+['"]/, "versionName '1.0.1'");
if (!gradle.includes("apply from: 'shopmaster-signing.gradle'")) {
  gradle += "\n\napply from: 'shopmaster-signing.gradle'\n";
}
fs.writeFileSync(gradleFile, gradle);
const signing = `def releaseStoreFile = file('shopmaster-release.jks')
android {
    signingConfigs {
        release {
            storeFile releaseStoreFile
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
`;
fs.writeFileSync(path.join(appDir, 'shopmaster-signing.gradle'), signing);
console.log('Android release signing configured. Package ID remains com.shopmaster.pro; version 1.0.1 (versionCode 2).');
