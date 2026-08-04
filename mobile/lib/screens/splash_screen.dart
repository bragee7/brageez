import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../state/auth_provider.dart';
import 'login_screen.dart';
import 'police_dashboard_screen.dart';
import 'user_dashboard_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    final auth = context.read<AuthProvider>();
    await auth.restoreSession();
    if (!mounted) return;

    if (auth.isAuthenticated) {
      final role = auth.user?.role;
      final target = role == 'police'
          ? const PoliceDashboardScreen()
          : const UserDashboardScreen();
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => target),
      );
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AppColors.gray900,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.shield, color: AppColors.emergencyRed, size: 72),
            SizedBox(height: 16),
            Text(
              'ZELDA',
              style: TextStyle(
                color: AppColors.emergencyRed,
                fontSize: 32,
                fontWeight: FontWeight.w800,
                letterSpacing: 6,
              ),
            ),
            Text(
              'Women Safety Guardian',
              style: TextStyle(color: AppColors.gray400, fontSize: 13),
            ),
            SizedBox(height: 32),
            CircularProgressIndicator(
              color: AppColors.emergencyRed,
              strokeWidth: 3,
            ),
          ],
        ),
      ),
    );
  }
}
