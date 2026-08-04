import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/theme.dart';
import 'screens/login_screen.dart';
import 'screens/police_dashboard_screen.dart';
import 'screens/register_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/user_dashboard_screen.dart';
import 'services/voice_guard_service.dart';
import 'state/auth_provider.dart';
import 'state/cases_provider.dart';
import 'state/contacts_provider.dart';
import 'state/sos_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await VoiceGuardService.initialize();
  runApp(const ZeldApp());
}

class ZeldApp extends StatelessWidget {
  const ZeldApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => CasesProvider()),
        ChangeNotifierProvider(create: (_) => ContactsProvider()),
        ChangeNotifierProvider(create: (_) => SosController()),
      ],
      child: MaterialApp(
        title: 'ZELDA - Women Safety Guardian',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        home: const SplashScreen(),
        routes: {
          '/login': (_) => const LoginScreen(),
          '/register': (_) => const RegisterScreen(),
          '/dashboard': (_) => const UserDashboardScreen(),
          '/police': (_) => const PoliceDashboardScreen(),
        },
      ),
    );
  }
}
