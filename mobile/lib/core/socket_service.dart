import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;

import 'config.dart';

class SocketService {
  static final SocketService instance = SocketService._();

  io.Socket? _socket;
  final _newCaseController = StreamController<Map<String, dynamic>>.broadcast();
  final _caseUpdatedController =
      StreamController<Map<String, dynamic>>.broadcast();
  bool _connected = false;

  SocketService._();

  Stream<Map<String, dynamic>> get onNewCase => _newCaseController.stream;
  Stream<Map<String, dynamic>> get onCaseUpdated =>
      _caseUpdatedController.stream;
  bool get isConnected => _connected;

  void connect({String? role}) {
    if (_socket != null) return;

    final uri = AppConfig.apiBaseUrl;

    _socket = io.io(
      uri,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setQuery({'role': role ?? ''})
          .build(),
    );

    _socket!.onConnect((_) {
      _connected = true;
      if (role == 'police') {
        _socket!.emit('join', {'role': 'police'});
      }
    });

    _socket!.on('new_case', (data) {
      if (data is Map) {
        _newCaseController.add(Map<String, dynamic>.from(data));
      }
    });

    _socket!.on('case_updated', (data) {
      if (data is Map) {
        _caseUpdatedController.add(Map<String, dynamic>.from(data));
      }
    });

    _socket!.onDisconnect((_) => _connected = false);
    _socket!.onError((_) => _connected = false);

    _socket!.connect();
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
    _connected = false;
  }
}
