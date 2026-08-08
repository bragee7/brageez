import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'config.dart';

class ApiClient {
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'auth_token';

  static final ApiClient instance = ApiClient._();
  final Dio dio;

  ApiClient._()
      : dio = Dio(BaseOptions(
          baseUrl: AppConfig.apiBaseUrl,
          connectTimeout: const Duration(seconds: 30),
          receiveTimeout: const Duration(seconds: 180),
          sendTimeout: const Duration(seconds: 180),
          headers: {'Content-Type': 'application/json'},
        )) {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: _tokenKey);
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final status = error.response?.statusCode;
        final path = error.requestOptions.path;
        final authHeader = error.requestOptions.headers['Authorization'];
        final hadToken = authHeader is String && authHeader.isNotEmpty;
        if (status == 401 && hadToken && !path.contains('/auth/login')) {
          await clearToken();
        }
        handler.next(error);
      },
    ));
  }

  static Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  static Future<String?> getToken() => _storage.read(key: _tokenKey);

  static Future<void> clearToken() => _storage.delete(key: _tokenKey);

  Future<Response> post(String path, Object? data) =>
      dio.post('/api$path', data: data);

  Future<Response> get(String path) => dio.get('/api$path');

  Future<Response> put(String path, Object? data) =>
      dio.put('/api$path', data: data);

  Future<Response> delete(String path) => dio.delete('/api$path');
}
