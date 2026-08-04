import 'dart:async';

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../services/location_service.dart';
import '../services/sos_service.dart';
import '../services/voice_guard_service.dart';

enum SosStatus {
  idle,
  listening,
  cancelWindow,
  countdown,
  recording,
  sending,
  sent,
}

class SosController extends ChangeNotifier {
  final SosService _sosService = SosService();

  SosStatus _status = SosStatus.idle;
  int? _cancelTimer;
  int? _countdown;
  int _recordingTime = 30;
  String _error = '';
  String _success = '';

  AppLocation? _location;
  String _locationLink = '';

  bool _isTracking = false;

  String? _recordedVideoPath;
  String? _recordedAudioPath;
  bool _showPreview = false;

  CameraController? _cameraController;
  List<CameraDescription> _cameras = [];
  bool _cameraInitialized = false;

  Timer? _cancelTimerRef;
  Timer? _countdownRef;
  Timer? _recordingTimerRef;
  Timer? _trackingRef;
  StreamSubscription<AppLocation>? _watchSub;
  StreamSubscription<String>? _detectionSub;
  StreamSubscription<bool>? _statusSub;
  StreamSubscription<String>? _errorSub;

  bool _voiceEnabled = false;
  bool _initialized = false;

  SosStatus get status => _status;
  int? get cancelTimer => _cancelTimer;
  int? get countdown => _countdown;
  int get recordingTime => _recordingTime;
  String get error => _error;
  String get success => _success;
  AppLocation? get location => _location;
  String get locationLink => _locationLink;
  bool get isTracking => _isTracking;
  String? get recordedVideoPath => _recordedVideoPath;
  String? get recordedAudioPath => _recordedAudioPath;
  bool get showPreview => _showPreview;
  CameraController? get cameraController => _cameraController;
  bool get cameraInitialized => _cameraInitialized;
  bool get voiceEnabled => _voiceEnabled;

  bool get isBusy =>
      _status != SosStatus.idle && _status != SosStatus.listening;

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    _watchSub = LocationService.watchPosition().listen((loc) {
      _location = loc;
      _locationLink = loc.googleMapsLink;
      notifyListeners();
    });

    _detectionSub = VoiceGuardService.detections.listen((keyword) {
      if (!isBusy) {
        triggerSOS(triggerKeyword: keyword);
      }
    });

    _statusSub = VoiceGuardService.statusStream.listen((running) {
      if (_voiceEnabled != running) {
        _voiceEnabled = running;
        notifyListeners();
      }
    });

    _errorSub = VoiceGuardService.errors.listen((error) {
      _error = error;
      _voiceEnabled = false;
      notifyListeners();
    });

    try {
      _cameras = await availableCameras();
    } catch (_) {
      _cameras = [];
    }

    _voiceEnabled = await VoiceGuardService.isRunning();
    notifyListeners();
  }

  Future<void> setVoiceEnabled(bool enabled) async {
    _voiceEnabled = enabled;
    notifyListeners();
    if (enabled) {
      try {
        await VoiceGuardService.start();
      } catch (e) {
        _voiceEnabled = false;
        _error = 'Failed to start voice protection: $e';
        notifyListeners();
      }
    } else {
      await VoiceGuardService.stop();
    }
  }

  void playAlertSound() {
    SystemSound.play(SystemSoundType.alert);
  }

  Future<void> triggerSOS({String? triggerKeyword}) async {
    if (isBusy) return;

    playAlertSound();
    _status = SosStatus.cancelWindow;
    _cancelTimer = 5;
    _error = '';
    _success = '';
    notifyListeners();

    _cancelTimerRef?.cancel();
    _cancelTimerRef = Timer.periodic(const Duration(seconds: 1), (timer) {
      _cancelTimer = (_cancelTimer ?? 5) - 1;
      if (_cancelTimer! <= 0) {
        timer.cancel();
        _cancelTimerRef = null;
        _cancelTimer = null;
        startCountdown();
      }
      notifyListeners();
    });
  }

  void cancelSOS() {
    _cancelTimerRef?.cancel();
    _cancelTimerRef = null;
    _cancelTimer = null;
    _countdownRef?.cancel();
    _countdownRef = null;
    _countdown = null;
    _status = SosStatus.listening;
    _success = 'SOS alert cancelled';
    notifyListeners();
    Future.delayed(const Duration(seconds: 3), () {
      _success = '';
      notifyListeners();
    });
  }

  void startCountdown() {
    _status = SosStatus.countdown;
    _countdown = 3;
    notifyListeners();

    _countdownRef?.cancel();
    _countdownRef = Timer.periodic(const Duration(seconds: 1), (timer) {
      _countdown = (_countdown ?? 3) - 1;
      if (_countdown! <= 0) {
        timer.cancel();
        _countdownRef = null;
        _countdown = null;
        startRecording();
      }
      notifyListeners();
    });
  }

  Future<void> startRecording() async {
    _status = SosStatus.recording;
    _recordingTime = 30;
    notifyListeners();

    try {
      if (_cameras.isEmpty) {
        _cameras = await availableCameras();
      }
      if (_cameras.isEmpty) {
        _error = 'No camera available on this device';
        _status = SosStatus.idle;
        notifyListeners();
        return;
      }

      final camera = _cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => _cameras.first,
      );

      _cameraController?.dispose();
      _cameraController = CameraController(camera, ResolutionPreset.high, enableAudio: true);
      await _cameraController!.initialize();
      _cameraInitialized = true;
      notifyListeners();

      await _cameraController!.startVideoRecording();

      final start = DateTime.now();
      _recordingTimerRef?.cancel();
      _recordingTimerRef = Timer.periodic(const Duration(milliseconds: 250), (timer) {
        final elapsed = DateTime.now().difference(start).inMilliseconds;
        final remaining = ((30000 - elapsed) / 1000).ceil();
        _recordingTime = remaining > 0 ? remaining : 0;
        if (elapsed >= 30000) {
          timer.cancel();
          stopRecordingAndSend();
        }
        notifyListeners();
      });
    } catch (e) {
      _error = 'Unable to access camera/microphone. Please grant permissions.';
      _status = SosStatus.idle;
      notifyListeners();
    }
  }

  Future<void> stopRecordingAndSend() async {
    _recordingTimerRef?.cancel();
    _recordingTimerRef = null;

    XFile? videoFile;
    try {
      if (_cameraController != null &&
          _cameraController!.value.isRecordingVideo) {
        videoFile = await _cameraController!.stopVideoRecording();
      }
    } catch (_) {}

    await _cameraController?.dispose();
    _cameraController = null;
    _cameraInitialized = false;

    _recordedVideoPath = videoFile?.path;
    _recordedAudioPath = videoFile?.path;

    await sendEmergencyData();
  }

  Future<void> sendEmergencyData() async {
    _status = SosStatus.sending;
    _error = '';
    notifyListeners();

    try {
      final freshLocation = await LocationService.getCurrent(fresh: true);
      if (freshLocation != null) {
        _location = freshLocation;
        _locationLink = freshLocation.googleMapsLink;
      }

      final videoPath = _recordedVideoPath ?? '';
      final locationLink = _locationLink;
      final latitude = _location?.latitude.toString() ?? '';
      final longitude = _location?.longitude.toString() ?? '';

      final caseData = await _sosService.createCase(
        videoPath: videoPath,
        audioPath: videoPath,
        locationLink: locationLink,
        latitude: latitude,
        longitude: longitude,
        notes: 'SOS Alert at ${DateTime.now().toLocal()}',
      );

      playAlertSound();
      _status = SosStatus.sent;
      _showPreview = videoPath.isNotEmpty;
      _success = 'Emergency alert sent successfully! Help is on the way. Your live location is being tracked.';
      notifyListeners();

      startLocationTracking(caseData.id);

      Future.delayed(const Duration(seconds: 5), () {
        _status = SosStatus.listening;
        _success = '';
        notifyListeners();
      });
    } catch (e) {
      _error = 'Failed to send emergency alert: $e';
      _status = SosStatus.idle;
      notifyListeners();
    }
  }

  Future<void> startLocationTracking(int caseId) async {
    _isTracking = true;
    notifyListeners();

    Future<void> sendUpdate() async {
      final loc = await LocationService.getCurrent(fresh: true);
      if (loc == null) return;
      _location = loc;
      _locationLink = loc.googleMapsLink;
      notifyListeners();
      try {
        await _sosService.updateLocation(
          caseId,
          latitude: loc.latitude.toString(),
          longitude: loc.longitude.toString(),
          locationLink: loc.googleMapsLink,
        );
      } catch (_) {}
    }

    await sendUpdate();
    _trackingRef?.cancel();
    _trackingRef = Timer.periodic(const Duration(seconds: 30), (_) => sendUpdate());
  }

  void stopLocationTracking() {
    _trackingRef?.cancel();
    _trackingRef = null;
    _isTracking = false;
    notifyListeners();
  }

  void dismissError() {
    _error = '';
    notifyListeners();
  }

  void dismissSuccess() {
    _success = '';
    notifyListeners();
  }

  void dismissPreview() {
    _showPreview = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _cancelTimerRef?.cancel();
    _countdownRef?.cancel();
    _recordingTimerRef?.cancel();
    _trackingRef?.cancel();
    _watchSub?.cancel();
    _detectionSub?.cancel();
    _statusSub?.cancel();
    _errorSub?.cancel();
    _cameraController?.dispose();
    super.dispose();
  }
}
