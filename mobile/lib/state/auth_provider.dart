import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/api_client.dart';
import '../core/socket_service.dart';
import '../models/app_user.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  static const _userKey = 'auth_user';

  final AuthService _authService = AuthService();
  final SocketService _socket = SocketService.instance;

  AppUser? _user;
  bool _loading = true;

  AppUser? get user => _user;
  bool get isLoading => _loading;
  bool get isAuthenticated => _user != null;

  Future<void> restoreSession() async {
    _loading = true;
    notifyListeners();

    final token = await ApiClient.getToken();
    if (token == null || token.isEmpty) {
      _loading = false;
      notifyListeners();
      return;
    }

    final me = await _authService.fetchMe();
    if (me != null) {
      _user = me;
      await _saveUser(me);
      _connectSocket();
    } else {
      await ApiClient.clearToken();
    }

    _loading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final result = await _authService.login(email: email, password: password);
    await ApiClient.saveToken(result.token);
    _user = result.user;
    await _saveUser(result.user);
    _connectSocket();
    notifyListeners();
  }

  Future<void> logout() async {
    _socket.disconnect();
    _user = null;
    await ApiClient.clearToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
    notifyListeners();
  }

  void _connectSocket() {
    _socket.connect(role: _user?.role);
  }

  Future<void> _saveUser(AppUser user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, user.toJson().toString());
  }
}
