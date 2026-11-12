# Cosmo Incremental Ver.2.1 - iOS source project

This package is source code, NOT an IPA. It preserves the uploaded Ver.2.1 web game in `www/`.

## Build with Mac/Xcode (official Apple workflow)
1. Install Node.js, Xcode and CocoaPods if required.
2. In this directory: `npm install`
3. `npx cap add ios`
4. `npx cap sync ios`
5. `npx cap open ios`
6. In Xcode choose your personal Team and a unique Bundle Identifier, connect your iPhone, then Run.

Free Apple Personal Team provisioning normally expires after 7 days. For distribution outside Xcode, additional Apple signing/provisioning is required.

## iPhone-only workflow
Upload this source ZIP to a **private** GitHub repository via Safari, then use a cloud macOS build provider. A cloud build does not bypass Apple code-signing or guarantee an installable IPA. Without a Mac and an eligible signing/provisioning method, a reliable free personal IPA installation cannot be promised.

## Save migration
The PWA and the native WKWebView have separate localStorage origins. In the PWA, open 記録 and export/copy your save string. In the native app, open 記録, paste and import. Do not uninstall the PWA before verifying migration.

## Changes from uploaded files
Only the inline service worker registration condition is changed to avoid trying to register the web service worker in a Capacitor native app. All gameplay JS, CSS, privacy page, icons, manifest and assets are preserved.
