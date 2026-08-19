import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vosk_flutter_service/vosk_flutter_service.dart';

import 'model_extractor.dart';

class VoiceGuardService {
  static const _detectionEvent = 'keyword_detected';
  static const _statusEvent = 'service_status';
  static const _errorEvent = 'service_error';

  static const notificationChannelId = 'zelda_voice_protection';
  static const notificationChannelName = 'ZELDA Voice Protection';
  static const notificationChannelDescription =
      '24/7 background listening for the emergency phrase';
  static const fgsNotificationId = 256;
  static const alarmNotificationId = 257;

  /// The phrases that trigger an SOS. Configurable at runtime.
  static List<String> keywords = ['help me'];

  /// Replace the trigger phrases with a new list (empty lists are rejected).
  static void setKeywords(List<String> list) {
    final cleaned = list
        .map((k) => k.trim())
        .where((k) => k.isNotEmpty)
        .toList();
    if (cleaned.isEmpty) return;
    keywords = cleaned;
  }

  static final FlutterBackgroundService _service = FlutterBackgroundService();
  static final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  static final _detectionController = StreamController<String>.broadcast();
  static final _statusController = StreamController<bool>.broadcast();
  static final _errorController = StreamController<String>.broadcast();

  static bool _notificationsReady = false;

  /// Ensure the local notifications plugin is initialized in the CURRENT
  /// isolate (statics are per-isolate, so the background isolate needs its own
  /// init before it can post notifications).
  static Future<void> _ensureNotificationsInitialized() async {
    if (_notificationsReady) return;
    await _notifications.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      ),
    );
    await _notifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(
          const AndroidNotificationChannel(
            notificationChannelId,
            notificationChannelName,
            description: notificationChannelDescription,
            importance: Importance.high,
          ),
        );
    _notificationsReady = true;
  }

  static DateTime _lastTriggeredAt = DateTime.fromMillisecondsSinceEpoch(0);
  static String? _lastTriggeredKeyword;

  /// Dedupe window: stops the SAME utterance from firing twice (partial result
  /// then final result of one "help me"). A new utterance after this window, or
  /// after a cancel/reset, triggers again with no limit.
  static const _dedupeWindow = Duration(seconds: 2);

  static const _enabledPrefKey = 'zelda_voice_guard_enabled';
  static const _resetCooldownEvent = 'reset_cooldown';
  static const _setForegroundEvent = 'set_foreground';
  static const _serviceReadyEvent = 'service_ready';
  static const _pendingTriggerKey = 'zelda_pending_sos_trigger';

  static bool _appInForeground = true;

  /// Reset the trigger dedupe in the background isolate so a NEW utterance of
  /// the keyword can trigger SOS again immediately (after cancel/finish).
  /// Best-effort: even if this cross-isolate event is ever lost, the short
  /// [_dedupeWindow] self-heals within a few seconds.
  static void resetDetectionCooldown() {
    _service.invoke(_resetCooldownEvent);
  }

  /// Record that an emergency phrase was detected by the background isolate so
  /// that if the app is woken from the full-screen notification the SOS can be
  /// triggered even if the detection event itself was lost while the main
  /// isolate was dead/paused.
  static Future<void> _markPendingTrigger() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_pendingTriggerKey, DateTime.now().millisecondsSinceEpoch);
  }

  static Future<void> _clearPendingTrigger() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pendingTriggerKey);
  }

  /// Consume a pending SOS trigger (set by the background isolate) if it is
  /// still fresh. Returns true when a trigger was fired. Called after the UI
  /// has subscribed to [detections] so the event is not lost on cold start.
  static Future<bool> consumePendingTrigger() async {
    final prefs = await SharedPreferences.getInstance();
    final ts = prefs.getInt(_pendingTriggerKey);
    if (ts == null) return false;
    await _clearPendingTrigger();
    final age = DateTime.now().millisecondsSinceEpoch - ts;
    if (age < 0 || age > 60000) return false; // stale
    developer.log(
      'Firing pending SOS trigger from background',
      name: 'VoiceGuard',
    );
    _detectionController.add(VoiceGuardService.keywords.first);
    return true;
  }

  static Future<void> _firePendingTriggerIfRecent() async {
    await consumePendingTrigger();
  }

  static Future<bool> wasEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_enabledPrefKey) ?? false;
  }

  static Future<void> setEnabledPref(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_enabledPrefKey, enabled);
  }

  static Stream<String> get detections => _detectionController.stream;
  static Stream<bool> get statusStream => _statusController.stream;
  static Stream<String> get errors => _errorController.stream;

  static bool _configured = false;

  static Future<void> initialize() async {
    await _ensureNotificationsInitialized();

    WidgetsBinding.instance.addObserver(_LifecycleObserver());

    if (_configured) return;
    _configured = true;

    await _service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: _onStart,
        autoStart: false,
        autoStartOnBoot: true,
        isForegroundMode: true,
        notificationChannelId: notificationChannelId,
        initialNotificationTitle: 'ZELDA Voice Protection',
        initialNotificationContent: 'Listening for emergency phrases...',
        foregroundServiceNotificationId: fgsNotificationId,
        foregroundServiceTypes: [AndroidForegroundType.microphone],
      ),
      iosConfiguration: IosConfiguration(autoStart: false),
    );

    _service.on(_detectionEvent).listen((event) {
      if (event != null && event['keyword'] != null) {
        developer.log(
          'Keyword detected: ${event['keyword']}',
          name: 'VoiceGuard',
        );
        _detectionController.add(event['keyword'] as String);
      }
    });
    _service.on(_statusEvent).listen((event) {
      if (event != null && event['running'] != null) {
        developer.log(
          'Service status: running=${event['running']}',
          name: 'VoiceGuard',
        );
        _statusController.add(event['running'] as bool);
      }
    });
    _service.on(_errorEvent).listen((event) {
      if (event != null && event['error'] != null) {
        developer.log(
          'Service error: ${event['error']}',
          name: 'VoiceGuard',
          level: 1000,
        );
        _errorController.add(event['error'] as String);
      }
    });
    _service.on(_serviceReadyEvent).listen((_) {
      // Background isolate is up; tell it whether the app is in the foreground
      // so it knows whether to wake the UI on a keyword detection.
      _service.invoke(
        _setForegroundEvent,
        {'foreground': _appInForeground},
      );
    });
  }

  static Future<void> start() async {
    await Permission.microphone.request();
    await Permission.notification.request();
    await Permission.ignoreBatteryOptimizations.request();
    await _service.startService();
  }

  static Future<void> stop() async {
    await setEnabledPref(false);
    _service.invoke('stop');
  }

  static Future<bool> isRunning() => _service.isRunning();

  /// Restart the background service if the user previously enabled voice
  /// protection (used when the OS kills the process/isolate while backgrounded).
  static Future<void> restartIfNeeded() async {
    if (!await wasEnabled()) return;
    if (await _service.isRunning()) return;
    await start();
  }

  /// Post a high-priority notification with full-screen intent so the app is
  /// brought to the foreground when an emergency phrase is detected while the
  /// app is in the background.
  static Future<void> showEmergencyNotification({required String keyword}) async {
    await _ensureNotificationsInitialized();
    await _notifications.show(
      id: alarmNotificationId,
      title: '🚨 ZELDA SOS TRIGGERED',
      body: 'Heard "$keyword". Opening app to send SOS...',
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          notificationChannelId,
          notificationChannelName,
          channelDescription: notificationChannelDescription,
          importance: Importance.max,
          priority: Priority.max,
          category: AndroidNotificationCategory.alarm,
          fullScreenIntent: true,
        ),
      ),
    );
  }

  /// Show the emergency notification FROM the background isolate. The plugin
  /// instance and initialization are per-isolate, so this ensures the
  /// notification channel is ready in the current isolate before posting.
  static Future<void> showEmergencyNotificationFromBackground({
    required String keyword,
  }) async {
    await _ensureNotificationsInitialized();
    await _notifications.show(
      id: alarmNotificationId,
      title: '🚨 ZELDA SOS TRIGGERED',
      body: 'Heard "$keyword". Opening app to send SOS...',
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          notificationChannelId,
          notificationChannelName,
          channelDescription: notificationChannelDescription,
          importance: Importance.max,
          priority: Priority.max,
          category: AndroidNotificationCategory.alarm,
          fullScreenIntent: true,
        ),
      ),
    );
  }
}

@pragma('vm:entry-point')
Future<void> _onStart(ServiceInstance service) async {
  WidgetsFlutterBinding.ensureInitialized();
  DartPluginRegistrant.ensureInitialized();
  debugPrint('VoiceGuard BG isolate started');

  var appInForeground = false;

  service.on(VoiceGuardService._resetCooldownEvent).listen((_) {
    VoiceGuardService._lastTriggeredAt =
        DateTime.fromMillisecondsSinceEpoch(0);
    VoiceGuardService._lastTriggeredKeyword = null;
    developer.log('Trigger dedupe reset by UI', name: 'VoiceGuard');
  });

  service.on(VoiceGuardService._setForegroundEvent).listen((event) {
    if (event != null && event['foreground'] != null) {
      appInForeground = event['foreground'] as bool;
      developer.log(
        'App foreground=$appInForeground',
        name: 'VoiceGuard',
      );
    }
  });

  // Tell the main isolate we are listening so it can reply with the current
  // foreground state. If the app process was killed (recents) the main isolate
  // is gone and we correctly keep appInForeground = false.
  service.invoke(VoiceGuardService._serviceReadyEvent);

  String? modelPath;
  VoskFlutterPlugin? vosk;
  SpeechService? speechService;

  try {
    modelPath = await ModelExtractor.ensureModel();
    debugPrint('VoiceGuard model path: $modelPath');
    vosk = VoskFlutterPlugin.instance();
    final model = await vosk.createModel(modelPath);
    debugPrint('VoiceGuard Vosk model created');
    final recognizer = await vosk.createRecognizer(
      model: model,
      sampleRate: 16000,
    );
    debugPrint('VoiceGuard recognizer created');
    speechService = await vosk.initSpeechService(recognizer);
    debugPrint('VoiceGuard speech service initialized');

    String? extractText(String raw) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is Map<String, dynamic>) {
          final text = decoded['text'] ?? decoded['partial'];
          if (text is String) return text.toLowerCase().trim();
        }
      } catch (_) {}
      return null;
    }

    String normalize(String text) => text.replaceAll(RegExp(r'\s+'), ' ');

    bool phraseMatches(String text, String keyword, {required bool exact}) {
      final normalized = normalize(text);
      if (exact) return normalized == keyword;
      final escaped = RegExp.escape(keyword);
      return RegExp(r'(^|\W)' + escaped + r'($|\W)').hasMatch(normalized);
    }

    Future<void> checkTranscript(String raw, {required bool exact}) async {
      final text = extractText(raw);
      if (text == null || text.isEmpty) return;
      for (final keyword in VoiceGuardService.keywords) {
        if (!phraseMatches(text, keyword, exact: exact)) continue;
        final now = DateTime.now();
        final isDuplicate =
            now.difference(VoiceGuardService._lastTriggeredAt) <
                VoiceGuardService._dedupeWindow &&
            VoiceGuardService._lastTriggeredKeyword == keyword;
        if (isDuplicate) {
          developer.log(
            'Keyword "$keyword" already triggered recently, ignoring',
            name: 'VoiceGuard',
          );
          continue;
        }
        VoiceGuardService._lastTriggeredAt = now;
        VoiceGuardService._lastTriggeredKeyword = keyword;
        developer.log(
          'Transcript matched: $keyword',
          name: 'VoiceGuard',
        );
        service.invoke(VoiceGuardService._detectionEvent, {'keyword': keyword});
        if (!appInForeground) {
          await VoiceGuardService._markPendingTrigger();
          await VoiceGuardService.showEmergencyNotificationFromBackground(
            keyword: keyword,
          );
        }
        // Reset the recognizer so the SAME utterance (its trailing final
        // result) cannot re-fire, and so the NEXT utterance starts clean.
        try {
          await speechService?.reset();
        } catch (_) {}
        break;
      }
    }

    speechService.onPartial().listen((raw) => checkTranscript(raw, exact: true));
    speechService.onResult().listen((raw) async {
      await checkTranscript(raw, exact: false);
      // vosk emits onResult when a full utterance ends. This is the cleanest
      // "new utterance starts here" signal we get: clear the dedupe so the
      // NEXT utterance of the keyword triggers again with no limit, without
      // depending on the cross-isolate reset event.
      VoiceGuardService._lastTriggeredAt =
          DateTime.fromMillisecondsSinceEpoch(0);
      VoiceGuardService._lastTriggeredKeyword = null;
      // Clear the recognizer so partial text from the finished utterance does
      // not bleed into the next one (e.g. "help me help me").
      try {
        await speechService?.reset();
      } catch (_) {}
    });

    service.on('stop').listen((_) async {
      await speechService?.stop();
      service.stopSelf();
    });

    await speechService.start();
    debugPrint('VoiceGuard speech service started, listening');
    service.invoke(VoiceGuardService._statusEvent, {'running': true});
  } catch (e, s) {
    developer.log(
      'BG service failed: $e\n$s',
      name: 'VoiceGuard',
      level: 1000,
    );
    debugPrint('VoiceGuard BG service failed: $e\n$s');
    service.invoke(VoiceGuardService._errorEvent, {'error': '$e'});
    service.invoke(VoiceGuardService._statusEvent, {'running': false});
    return;
  }

  Timer.periodic(const Duration(seconds: 10), (_) {
    service.invoke('heartbeat');
  });
}

class _LifecycleObserver with WidgetsBindingObserver {
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final wasForeground = VoiceGuardService._appInForeground;
    final foreground = state == AppLifecycleState.resumed;
    VoiceGuardService._appInForeground = foreground;
    VoiceGuardService._service.invoke(
      VoiceGuardService._setForegroundEvent,
      {'foreground': foreground},
    );
    if (foreground && !wasForeground) {
      // App is coming back to the foreground after being backgrounded; fire any
      // SOS trigger that was detected while the main isolate was paused.
      VoiceGuardService._firePendingTriggerIfRecent();
    }
  }
}
