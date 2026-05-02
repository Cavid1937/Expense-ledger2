# ─── .gitignore additions ──────────────────────────────────────────────────
# Add these lines to your project's .gitignore:

.env
.env.local
.env.*.local

# Firebase / Google credentials (contain private keys)
google-services.json
google-play-service-account.json
ios/GoogleService-Info.plist

# EAS build artifacts
.eas/
dist/

# ─── Production deployment checklist ───────────────────────────────────────
#
# Run these commands in order to go from local to App Store / Play Store:
#
# ── 1. EAS project setup (one-time) ─────────────────────────────────────────
#
#   npm install -g eas-cli
#   eas login
#   eas build:configure
#   # This creates the projectId — paste it into app.json > extra.eas.projectId
#
# ── 2. Add secrets to EAS (run once per environment) ────────────────────────
#
#   eas secret:create --scope project \
#     --name EXPO_PUBLIC_API_URL_PRODUCTION \
#     --value "https://api.yourapp.com/api/v1"
#
#   eas secret:create --scope project \
#     --name EXPO_PUBLIC_API_URL_PREVIEW \
#     --value "https://staging.yourapp.com/api/v1"
#
#   # Verify secrets were saved (values are write-only — names only shown):
#   eas secret:list
#
# ── 3. Development build (install on your physical device) ──────────────────
#
#   eas build --profile development --platform ios     # iOS dev client
#   eas build --profile development --platform android # Android APK
#
#   # Then start the dev server:
#   npx expo start --dev-client
#
# ── 4. Preview build (share with testers internally) ────────────────────────
#
#   eas build --profile preview --platform all
#
#   # Share the install link that EAS generates with testers.
#   # iOS: requires TestFlight OR device UDID registration (no App Store needed).
#   # Android: APK can be installed directly.
#
# ── 5. Production build ──────────────────────────────────────────────────────
#
#   eas build --profile production --platform all
#
# ── 6. Submit to stores ──────────────────────────────────────────────────────
#
#   eas submit --profile production --platform ios
#   eas submit --profile production --platform android
#
# ── 7. OTA Updates (post-launch bug fixes without a full store review) ───────
#
#   # For JS-only changes (no native code changes), publish an OTA update:
#   eas update --branch production --message "Fix budget progress bar rounding"
#
#   # Add to eas.json under the production build profile to enable:
#   # "channel": "production"
#
# ─── Asset requirements ──────────────────────────────────────────────────────
#
# Before building, ensure these files exist:
#
#   assets/icon.png            1024x1024px  — App Store / Play Store icon
#   assets/splash.png          1284x2778px  — Splash screen image
#                              (content centred, backgroundColor #F7F4EE fills edges)
#   assets/adaptive-icon.png   1024x1024px  — Android adaptive icon foreground
#   assets/favicon.png         196x196px    — Web favicon
#   assets/notification-icon.png 96x96px   — Android notification icon (white on transparent)
#   assets/notification.wav               — Custom notification sound (optional)
#
# The splash screen backgroundColor (#F7F4EE — our cream paper white) fills
# the area around the splash image on any screen size. Because our app
# background is the same color, the transition from splash → app is seamless.
