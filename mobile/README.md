# Indigo Mobile Wrappers
Flutter WebView shell that loads the Indigo PWA preview.
Prereqs: Flutter (stable), Xcode (iOS), Android SDK.

## Run
flutter pub get
# iOS Simulator
flutter run -d ios --dart-define=PREVIEW_URL=$(cat ../.preview-url) --dart-define=ALLOWED_APP_DOMAINS=vercel.app,indigo-yield.com
# Android Emulator
flutter run -d android --dart-define=PREVIEW_URL=$(cat ../.preview-url) --dart-define=ALLOWED_APP_DOMAINS=vercel.app,indigo-yield.com
