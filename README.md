<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d32e7f11-a8ad-4ab4-9f51-18802df50064

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Create a Local Admin Account

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the environment for your local development session, then run:

```powershell
$env:ADMIN_EMAIL = "admin@campus.edu"
$env:ADMIN_PASSWORD = "Use-A-Strong-Password"
npm run create-admin
```

The script creates an active administrator using the configured `DATABASE_URL`. It hashes the password with the server's bcrypt helper and makes no changes if the email already belongs to an administrator. It will not promote an existing student or resolver account. Open `/admin/login` in the local app to sign in.
