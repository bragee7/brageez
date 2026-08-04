import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../core/widgets.dart';
import '../state/auth_provider.dart';
import 'otp_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _showPassword = false;
  bool _loading = false;
  String _error = '';

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = '';
    });

    try {
      await context.read<AuthProvider>().login(
            _emailController.text.trim(),
            _passwordController.text,
          );
      if (!mounted) return;
      final role = context.read<AuthProvider>().user?.role;
      Navigator.of(context).pushReplacementNamed(role == 'police' ? '/police' : '/dashboard');
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map && data['requiresVerification'] == true) {
        if (!mounted) return;
        Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => OtpScreen(
            personalEmail: (data['personalEmail'] ?? '').toString(),
            title: 'Verify your email',
          ),
        ));
        return;
      }
      final message = data is Map ? data['error'] : null;
      setState(() => _error = message?.toString() ?? 'Login failed. Please try again.');
    } catch (e) {
      setState(() => _error = 'Login failed. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppGradients.login),
        alignment: Alignment.center,
        padding: const EdgeInsets.all(16),
        child: SingleChildScrollView(
          child: Container(
            width: 420,
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [
                BoxShadow(color: Colors.black26, blurRadius: 24, offset: Offset(0, 8)),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Column(
                  children: [
                    Container(
                      width: 72,
                      height: 72,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [AppColors.emergencyRed, AppColors.pink500],
                        ),
                      ),
                      child: const Icon(Icons.shield, color: Colors.white, size: 36),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'Women Safety Guardian',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppColors.gray800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Sign in to your account',
                      style: TextStyle(color: AppColors.gray500),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                if (_error.isNotEmpty) ...[
                  AppBanner(message: _error, isError: true, onDismiss: () => setState(() => _error = '')),
                  const SizedBox(height: 8),
                ],
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextFormField(
                        controller: _emailController,
                        decoration: const InputDecoration(
                          labelText: 'Guardian ID',
                          hintText: 'e.g. johndoe@guardian.com',
                          prefixIcon: Icon(Icons.person_outline, color: AppColors.gray400),
                        ),
                        validator: (v) =>
                            (v == null || v.trim().isEmpty) ? 'Guardian ID is required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: !_showPassword,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outline, color: AppColors.gray400),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _showPassword ? Icons.visibility_off : Icons.visibility,
                              color: AppColors.gray400,
                            ),
                            onPressed: () => setState(() => _showPassword = !_showPassword),
                          ),
                        ),
                        validator: (v) =>
                            (v == null || v.isEmpty) ? 'Password is required' : null,
                        onFieldSubmitted: (_) => _handleSubmit(),
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: _loading ? null : _handleSubmit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.pink600,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: _loading
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                              )
                            : const Text('Sign In', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text("Don't have an account?", style: TextStyle(color: AppColors.gray600)),
                    TextButton(
                      onPressed: () =>
                          Navigator.of(context).push(MaterialPageRoute(builder: (_) => const RegisterScreen())),
                      child: const Text(
                        'Register here',
                        style: TextStyle(color: AppColors.pink600, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(color: AppColors.gray200),
                const SizedBox(height: 8),
                const Text(
                  'Demo Accounts (pre-verified):',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.gray500, fontSize: 12),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.blue50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Column(
                          children: [
                            Text('Police', style: TextStyle(color: AppColors.policeBlue, fontWeight: FontWeight.w600)),
                            Text('police@guardian.com', style: TextStyle(color: AppColors.gray600, fontSize: 11)),
                            Text('police123', style: TextStyle(color: AppColors.gray600, fontSize: 11)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.pink50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Column(
                          children: [
                            Text('User', style: TextStyle(color: AppColors.pink600, fontWeight: FontWeight.w600)),
                            Text('user@guardian.com', style: TextStyle(color: AppColors.gray600, fontSize: 11)),
                            Text('user123', style: TextStyle(color: AppColors.gray600, fontSize: 11)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
