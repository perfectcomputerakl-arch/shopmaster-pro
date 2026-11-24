# GitHub Actions setup

Open repository `perfectcomputerakl-arch/shopmaster-pro` → **Settings** → **Secrets and variables** → **Actions**.

## Repository Secrets

Create these four **Secrets** (not Variables):

| Secret name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Entire one-line contents of `release-signing/ANDROID_KEYSTORE_BASE64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password entered during generation |
| `ANDROID_KEY_ALIAS` | Alias entered during generation (default `shopmasterpro`) |
| `ANDROID_KEY_PASSWORD` | Key password entered during generation |

## Repository Variables

Under **Variables**, create:

| Variable name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://xzueuqucvwslqhfntugo.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable key |

The publishable/anon key is intended for client apps; never put a Supabase service-role key in Vite variables.

After saving all six entries, open **Actions** → **ShopMaster Pro - Signed Android Release APK** → **Run workflow**. The workflow stops with a clear error if a required secret or variable is missing.
