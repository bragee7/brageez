# ZELDA - Women Safety Guardian (Mobile)

Flutter Android app for the Women Safety Guardian system. Feature-parity mobile
port of the React web app, including the 24/7 background voice listener.

## Features

### User Dashboard
- SOS alert with 5s cancel window, 3-2-1 countdown, and automatic 30s video + audio recording
- Fresh GPS location captured and sent with each alert
- Live location tracking (30s updates) after an alert is sent
- Emergency contacts CRUD
- Media preview after recording

### Voice Protection (24/7)
- Offline keyword detection using Vosk (`vosk-model-small-en-us-0.15`)
- Runs in a foreground service (`flutter_background_service`) with a persistent
  notification, using the `microphone` foreground type
- Keywords: "help me", "emergency", "save me"
- On keyword detection while the app is backgrounded, a full-screen intent
  notification brings the app to the foreground to trigger the SOS flow
- Model zip is bundled in `assets/vosk/model.zip` (~41 MB) and extracted once on
  first use to the app documents directory (`app_flutter/vosk/`)
- The dashboard switch reflects the real foreground-service status and surfaces
  startup errors (e.g. missing `RECORD_AUDIO` permission)

### Police Dashboard
- Real-time case list via Socket.IO
- Case details with video/audio playback, location link, and Google Maps open
- Add/update case notes
- Mark cases Pending/Resolved and reopen resolved cases
- Export case report as PDF (Android print dialog)

## Requirements
- Flutter SDK 3.x (Dart 3.x)
- Android emulator or device (API 26+ recommended)
- Backend running on the host at port 5000 (see repo root README)

## Run

```bash
cd mobile
flutter pub get
flutter run
```

To point the app at a different backend, edit the base URL in
`lib/services/api_client.dart` (uses `10.0.2.2` for the Android emulator by default).

### Voice service prerequisites on emulator
- `RECORD_AUDIO` and `POST_NOTIFICATIONS` runtime permissions. Grant manually if
  the system dialog was skipped:
  ```
  adb shell pm grant com.zelda.zelda_guardian android.permission.RECORD_AUDIO
  adb shell pm grant com.zelda.zelda_guardian android.permission.POST_NOTIFICATIONS
  ```
- First toggle of "24/7 Voice Protection" extracts the bundled model (takes ~1-2s).

## Demo accounts
- Police: `police@guardian.com` / `police123`
- User: `user@guardian.com` / `user123`

## Project layout
```
lib/
  main.dart                       App entry; initializes VoiceGuardService
  core/                           Theme + shared widgets
  models/                         Data models (EmergencyContact, sos)
  screens/
    login_screen.dart             Email/password + OTP registration
    user_dashboard_screen.dart    SOS + voice toggle + contacts
    police_dashboard_screen.dart  Real-time case list
    case_details_screen.dart      Media, notes, status, PDF export
  services/
    api_client.dart               HTTP client (dio)
    sos_service.dart              SOS case API calls
    location_service.dart         GPS location + maps link
    model_extractor.dart          Vosk model zip extraction (archive)
    voice_guard_service.dart      Foreground service + Vosk recognizer
  state/
    auth_provider.dart            JWT auth state
    sos_controller.dart           SOS flow state machine
    contacts_provider.dart        Emergency contacts state
assets/vosk/model.zip             Vosk small English model
```

## Known limitations
- Keyword detection cannot be exercised on the Android emulator (no real mic
  input); verified at the integration level: model loads, grammar is applied
  (`help me`, `emergency`, `save me`), recognizer starts, and mic is active.
- The pulsing SOS button glow animation continuously redraws; on an emulator this
  keeps CPU elevated. Acceptable on device.
