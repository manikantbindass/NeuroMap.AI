# Release and native build guide

Version 0.1.0 is a research foundation prerelease. Read VERIFICATION.md for actual artifacts and unverified targets. Never label generated source as a successful APK/IPA build.

## Web

`cd frontend; npm ci; npm run build` produces dist. Deploy behind the configured API proxy, or set VITE_API_URL at build time and exact API CORS origins. Test the production preview using `npm run preview` on 4173 with API running. No PWA service worker is included: avoiding accidental caching of research responses is preferred for this initial private workspace. Mobile web works without installation.

## Windows

`cd desktop; npm ci; npm run dist` creates an Electron x64 NSIS installer under out. The client opens NEUROMAP_DESKTOP_URL, default http://127.0.0.1:4173. Start API and frontend preview first. It bundles Electron, not Python, data or models, and needs a functioning server. HTTPS is required for remote hosts. Renderer has no Node integration; context isolation/sandbox are enabled; external windows, unrelated navigation and permission requests are denied.

The local installer is unsigned unless a real code-signing configuration is supplied. Windows may show a publisher warning. Do not claim Authenticode signing or tested installation on all Windows versions. For trusted distribution use a publisher certificate/secure signing service through electron-builder's supported configuration. Secrets remain outside Git. Build success alone does not prove installed-launch behavior; see verification evidence.

## Android

Genuine native project lives under mobile/android. Configure VITE_API_URL with a trusted HTTPS API, rebuild frontend, then `cd mobile; npm ci; npx cap sync android`. Include https://localhost in the API origins. Android SDK and compatible JDK are required; inspect generated Gradle/Capacitor version requirements. Release candidate: `cd android; ./gradlew assembleRelease test` (Windows: gradlew.bat). Without signing this emits an **unsigned** release APK, not an installable distribution artifact. Do not rename a debug or unsigned output as a signed release.

For signed distribution create a private keystore outside the repository. Supply a signingConfig through protected Gradle properties/environment or a secret-backed CI init script; run assembleRelease, then verify `apksigner verify --verbose` and SHA-256 before publication. Never commit keystores/passwords. CI mobile workflow compiles unsigned candidate/source tests only; signed release automation remains dependent on owner provisioning. No universal signed APK is promised by this workflow.

## iOS

Genuine native Xcode project lives under mobile/ios. Configure HTTPS API and capacitor://localhost CORS, rebuild and `npx cap sync ios`. On macOS/Xcode: `xcodebuild -project mobile/ios/App/App.xcodeproj -scheme App -sdk iphonesimulator -configuration Release CODE_SIGNING_ALLOWED=NO build`. CI attempts simulator compilation; this produces no IPA.

For a real IPA, enroll in Apple Developer, configure your bundle/team/provisioning, install certificate in a temporary CI keychain, and archive for a device destination:

```bash
xcodebuild -project mobile/ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' -archivePath build/NeuroMap.xcarchive DEVELOPMENT_TEAM="$APPLE_TEAM_ID" archive
xcodebuild -exportArchive -archivePath build/NeuroMap.xcarchive -exportOptionsPlist /secure/ExportOptions.plist -exportPath build/export
```

ExportOptions must match the real distribution method/provisioning. Verify signatures/profiles and device/distribution eligibility. Windows cannot execute these steps. Certificate/provisioning setup and signed IPA workflow are not implemented or tested without credentials. An IPA is not a universal installation mechanism or App Store approval.

## GitHub release flow

Tag/version must agree; test before tagging. CI workflow runs backend/ML, lint/type/build, browser checks and Docker smoke on suitable runners. Security workflow audits locks and scans history. Release workflow reruns CI, builds web/source/Windows, produces manifest/checksums and publishes a prerelease only after required jobs succeed. Mobile workflow is separately dispatched and explicitly unsigned/simulator only.

Local manifest: put only verified actual deliverables under ignored releases/artifacts, then `python scripts/package_release.py`. Validate `SHA256SUMS.txt` using `sha256sum -c` (POSIX) or Get-FileHash (PowerShell). Push an annotated `v0.1.0` tag only for the verified source revision. Source archives never include ignored private datasets/.env. Publish real assets with gh release; do not claim future CI outputs exist. To rebuild, check out the exact tag and use lockfiles. For rollback mark a bad release clearly and publish a corrected patch; do not overwrite history or force-push.
