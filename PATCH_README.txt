ShopMaster Pro patch - sirf in files ko repo me replace/add karein (same folder path par):

REPLACE / ADD:
  .github/workflows/build-apk.yml
  admin/admin.html
  docs/FEATURES.md
  docs/IMPLEMENTATION_STATUS.md
  docs/IMPORT_AND_VOICE_STATUS.md
  public/banners.json          (naya)
  services/payment-api/server.js
  src/App.jsx
  src/style.css

DELETE:
  src/AdsManager.jsx

GitHub Variables (Settings > Secrets and variables > Actions > Variables):
  VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
