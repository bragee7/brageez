import 'package:geolocator/geolocator.dart';

class AppLocation {
  final double latitude;
  final double longitude;

  const AppLocation({required this.latitude, required this.longitude});

  String get googleMapsLink => 'https://www.google.com/maps?q=$latitude,$longitude';
}

class LocationService {
  static Future<bool> hasPermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    return permission == LocationPermission.whileInUse ||
        permission == LocationPermission.always;
  }

  static Future<AppLocation?> getCurrent({bool fresh = true}) async {
    try {
      if (!await hasPermission()) return null;
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: AndroidSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 15),
          forceLocationManager: true,
        ),
      );
      return AppLocation(latitude: pos.latitude, longitude: pos.longitude);
    } catch (_) {
      return null;
    }
  }

  static Stream<AppLocation> watchPosition() async* {
    if (!await hasPermission()) return;
    yield* Geolocator.getPositionStream(
      locationSettings: AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 20,
        forceLocationManager: true,
      ),
    ).map(
      (pos) => AppLocation(latitude: pos.latitude, longitude: pos.longitude),
    );
  }
}
