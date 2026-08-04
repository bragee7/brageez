class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000',
  );

  static const String mediaBaseUrl = String.fromEnvironment(
    'MEDIA_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000',
  );

  static String mediaUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http')) return path;
    return '$mediaBaseUrl$path';
  }
}
