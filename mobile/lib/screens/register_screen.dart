import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/auth_service.dart';
import 'otp_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();

  bool _showPassword = false;
  bool _showConfirm = false;
  bool _loading = false;
  String _error = '';
  String _success = '';
  String _guardianEmail = '';

  String get _previewGuardianId {
    final name = _nameController.text.trim();
    if (name.isEmpty) return 'Enter your name above';
    return '${name.toLowerCase().replaceAll(RegExp('[^a-z0-9]'), '')}@guardian.com';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_passwordController.text != _confirmController.text) {
      setState(() => _error = 'Passwords do not match');
      return;
    }

    setState(() {
      _loading = true;
      _error = '';
    });

    try {
      final response = await AuthService().register(
        name: _nameController.text.trim(),
        personalEmail: _emailController.text.trim(),
        password: _passwordController.text,
      );
      if (!mounted) return;
      setState(() {
        _guardianEmail = response['guardianEmail']?.toString() ?? _previewGuardianId;
        _loading = false;
      });
      Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => OtpScreen(
          personalEmail: _emailController.text.trim(),
          guardianEmail: _guardianEmail,
        ),
      ));
    } on DioException catch (e) {
      final data = e.response?.data;
      setState(() {
        _error = data is Map ? data['error']?.toString() ?? 'Registration failed' : 'Registration failed. Please try again.';
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Registration failed. Please try again.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppGradients.register),
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
                          colors: [AppColors.purple600, AppColors.blue600],
                        ),
                      ),
                      child: const Icon(Icons.person_add, color: Colors.white, size: 36),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'Create Account',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: AppColors.gray800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Create your ZELDA Guardian account',
                      style: TextStyle(color: AppColors.gray500),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                if (_error.isNotEmpty) ...[
                  AppBanner(message: _error, isError: true, onDismiss: () => setState(() => _error = '')),
                  const SizedBox(height: 8),
                ],
                if (_success.isNotEmpty) ...[
                  AppBanner(message: _success, onDismiss: () => setState(() => _success = '')),
                  const SizedBox(height: 8),
                ],
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextFormField(
                        controller: _nameController,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(labelText: 'Full Name', prefixIcon: Icon(Icons.badge_outlined, color: AppColors.gray400)),
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Full Name is required' : null,
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color: AppColors.gray100,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.gray300),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Your Guardian ID', style: TextStyle(fontSize: 12, color: AppColors.gray600)),
                            const SizedBox(height: 4),
                            Text(
                              _previewGuardianId,
                              style: const TextStyle(fontSize: 14, color: AppColors.gray500),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: 'Personal Email (for OTP)',
                          hintText: 'e.g. you@gmail.com',
                          prefixIcon: Icon(Icons.email_outlined, color: AppColors.gray400),
                        ),
                        validator: (v) =>
                            (v == null || v.trim().isEmpty || !v.contains('@')) ? 'Enter a valid personal email' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: !_showPassword,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outline, color: AppColors.gray400),
                          suffixIcon: IconButton(
                            icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility, color: AppColors.gray400),
                            onPressed: () => setState(() => _showPassword = !_showPassword),
                          ),
                        ),
                        validator: (v) => (v == null || v.length < 6) ? 'Password must be at least 6 characters' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _confirmController,
                        obscureText: !_showConfirm,
                        decoration: InputDecoration(
                          labelText: 'Confirm Password',
                          prefixIcon: const Icon(Icons.lock_outline, color: AppColors.gray400),
                          suffixIcon: IconButton(
                            icon: Icon(_showConfirm ? Icons.visibility_off : Icons.visibility, color: AppColors.gray400),
                            onPressed: () => setState(() => _showConfirm = !_showConfirm),
                          ),
                        ),
                        validator: (v) => (v == null || v.isEmpty) ? 'Please confirm your password' : null,
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: _loading ? null : _handleSubmit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.purple600,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: _loading
                            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                            : const Text('Create Account', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Already have an account?', style: TextStyle(color: AppColors.gray600)),
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Sign in', style: TextStyle(color: AppColors.purple600, fontWeight: FontWeight.w600)),
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
