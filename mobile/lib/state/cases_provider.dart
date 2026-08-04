import 'package:flutter/foundation.dart';

import '../core/socket_service.dart';
import '../models/sos_case.dart';
import '../services/sos_service.dart';

class CasesProvider extends ChangeNotifier {
  final SosService _sosService = SosService();
  final SocketService _socket = SocketService.instance;

  List<SosCase> _cases = [];
  bool _loading = false;
  String _error = '';

  // Alert signal for new cases
  bool _hasNewAlert = false;
  int _lastCount = 0;

  List<SosCase> get cases => _cases;
  bool get isLoading => _loading;
  String get error => _error;
  bool get hasNewAlert => _hasNewAlert;

  int get pendingCount => _cases.where((c) => c.isPending).length;
  int get resolvedCount => _cases.where((c) => !c.isPending).length;

  CasesProvider() {
    _socket.onNewCase.listen(_onNewCase);
    _socket.onCaseUpdated.listen(_onCaseUpdated);
  }

  Future<void> fetchCases() async {
    _loading = true;
    _error = '';
    notifyListeners();
    try {
      final fetched = await _sosService.getCases();
      if (_lastCount > 0 && fetched.length > _lastCount) {
        _hasNewAlert = true;
      }
      _lastCount = fetched.length;
      _cases = fetched;
    } catch (e) {
      _error = 'Failed to fetch cases';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void clearNewAlert() {
    _hasNewAlert = false;
    notifyListeners();
  }

  void _onNewCase(Map<String, dynamic> data) {
    final c = SosCase.fromJson(data);
    _cases = [c, ..._cases];
    _lastCount = _cases.length;
    _hasNewAlert = true;
    notifyListeners();
  }

  void _onCaseUpdated(Map<String, dynamic> data) {
    final updated = SosCase.fromJson(data);
    final index = _cases.indexWhere((c) => c.id == updated.id);
    if (index >= 0) {
      _cases = [..._cases]..[index] = updated;
    }
    notifyListeners();
  }
}
