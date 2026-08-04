import 'dart:async';
import 'dart:developer' as developer;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:vosk_flutter_service/vosk_flutter_service.dart';

import 'model_extractor.dart';

class VoiceGuardService {
  static const _detectionEvent = 'keyword_detected';
  static const _statusEvent = 'service_status';
  static const _errorEvent = 'service_error';

  static const notificationChannelId = 'zelda_voice_protection';
  static const notificationChannelName = 'ZELDA Voice Protection';
  static const notificationChannelDescription =
      '24/7 background listening for emergency phrases';
  static const fgsNotificationId = 256;
  static const alarmNotificationId = 257;

  static const keywords = ['help me', 'emergency', 'save me'];

  static final FlutterBackgroundService _service = FlutterBackgroundService();
  static final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  static final _detectionController = StreamController<String>.broadcast();
  static final _statusController = StreamController<bool>.broadcast();
  static final _errorController = StreamController<String>.broadcast();

  static Stream<String> get detections => _detectionController.stream;
  static Stream<bool> get statusStream => _statusController.stream;
  static Stream<String> get errors => _errorController.stream;

  static bool _configured = false;

  static Future<void> initialize() async {
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

    if (_configured) return;
    _configured = true;

    await _service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: _onStart,
        autoStart: false,
        autoStartOnBoot: false,
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
  }

  static Future<void> start() async {
    await _service.startService();
  }

  static Future<void> stop() async {
    _service.invoke('stop');
  }

  static Future<bool> isRunning() => _service.isRunning();

  /// Post a high-priority notification with full-screen intent so the app is
  /// brought to the foreground when an emergency phrase is detected while the
  /// app is in the background.
  static Future<void> showEmergencyNotification({required String keyword}) async {
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
  developer.log('BG isolate started', name: 'VoiceGuard');

  String? modelPath;
  VoskFlutterPlugin? vosk;
  SpeechService? speechService;

  try {
    modelPath = await ModelExtractor.ensureModel();
    developer.log('Model path: $modelPath', name: 'VoiceGuard');
    vosk = VoskFlutterPlugin.instance();
    final model = await vosk.createModel(modelPath);
    developer.log('Vosk model created', name: 'VoiceGuard');
    final recognizer = await vosk.createRecognizer(
      model: model,
      sampleRate: 16000,
      grammar: VoiceGuardService.keywords,
    );
    developer.log('Recognizer created', name: 'VoiceGuard');
    speechService = await vosk.initSpeechService(recognizer);
    developer.log('Speech service initialized', name: 'VoiceGuard');

    void checkTranscript(String transcript) {
      final text = transcript.toLowerCase().trim();
      for (final keyword in VoiceGuardService.keywords) {
        if (text.contains(keyword)) {
          developer.log(
            'Transcript matched: $keyword',
            name: 'VoiceGuard',
          );
          service.invoke(VoiceGuardService._detectionEvent, {'keyword': keyword});
          break;
        }
      }
    }

    speechService.onPartial().listen(checkTranscript);
    speechService.onResult().listen(checkTranscript);

    service.on('stop').listen((_) async {
      await speechService?.stop();
      service.stopSelf();
    });

    await speechService.start();
    developer.log('Speech service started, listening', name: 'VoiceGuard');
    service.invoke(VoiceGuardService._statusEvent, {'running': true});
  } catch (e, s) {
    developer.log(
      'BG service failed: $e\n$s',
      name: 'VoiceGuard',
      level: 1000,
    );
    service.invoke(VoiceGuardService._errorEvent, {'error': '$e'});
    service.invoke(VoiceGuardService._statusEvent, {'running': false});
    return;
  }

  Timer.periodic(const Duration(seconds: 10), (_) {
    service.invoke('heartbeat');
  });
}
