# LORVEX Reseller V9 — Firebase Hosting

## Goal
The application must be opened through HTTPS on phone, tablet, laptop and PC.

## Firebase project
`lorvex-reseller`

## Hosting URL
`https://lorvex-reseller.web.app`

## Deploy from a computer
1. Install Node.js.
2. Open Terminal / PowerShell.
3. Install Firebase CLI:
   `npm install -g firebase-tools`
4. Login:
   `firebase login`
5. Extract this ZIP and open Terminal in the extracted folder.
6. Run:
   `firebase deploy --only hosting`

## Important
Do not use the phone's file manager to run `public/index.html` for Firebase login.
If it is opened as `content://` or `file://`, V9 automatically redirects to the HTTPS
Firebase Hosting address above.

After deployment, open:
`https://lorvex-reseller.web.app`

The Firebase Authentication email/password configuration must remain enabled in the
Firebase console.
