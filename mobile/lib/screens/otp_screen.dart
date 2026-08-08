import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/theme.dart';
import '../core/widgets.dart';
import '../services/auth_service.dart';

class OtpScreen extends StatefulWidget {
  final String personalEmail;
  final String? guardianEmail;
  final String? title;

  const OtpScreen({
    super.key,
    required this.personalEmail,
    this.guardianEmail,
    this.title,
  });

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _otpController = TextEditingController();
  final _focusNode = FocusNode();

  bool _loading = false;
  bool _resending = false;
  bool _verified = false;
  String _error = '';
  String _success = '';

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() => setState(() {}));
    _focusNode.requestFocus();
  }

  @override
  void dispose() {
    _otpController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _handleVerify() async {
    final otp = _otpController.text.trim();
    if (otp.length != 6) {
      setState(() => _error = 'Please enter the 6-digit code from your email');
      return;
    }

    setState(() {
      _loading = true;
      _error = '';
    });

    try {
      await AuthService().verifyOtp(personalEmail: widget.personalEmail, otp: otp);
      if (!mounted) return;
      setState(() {
        _verified = true;
        _loading = false;
        _success = 'Email verified! Redirecting to sign in...';
      });
      Future.delayed(const Duration(seconds: 2), () {
        if (!mounted) return;
        Navigator.of(context).popUntil((route) => route.isFirst);
      });
    } on DioException catch (e) {
      final data = e.response?.data;
      setState(() {
        _error = data is Map
            ? data['error']?.toString() ?? 'Verification failed'
            : 'Verification failed. Please try again.';
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Verification failed. Please try again.';
        _loading = false;
      });
    }
  }

  Future<void> _handleResend() async {
    setState(() {
      _resending = true;
      _error = '';
    });

    try {
      await AuthService().resendOtp(personalEmail: widget.personalEmail);
      if (!mounted) return;
      setState(() {
        _resending = false;
        _success = 'A new code has been sent to your email';
      });
    } on DioException catch (e) {
      final data = e.response?.data;
      setState(() {
        _resending = false;
        _error = data is Map
            ? data['error']?.toString() ?? 'Could not resend code'
            : 'Could not resend code. Please try again.';
      });
    } catch (e) {
      setState(() {
        _resending = false;
        _error = 'Could not resend code. Please try again.';
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
                      child: _verified
                          ? const Icon(Icons.check, color: Colors.white, size: 36)
                          : const Icon(Icons.mark_email_read_outlined, color: Colors.white, size: 36),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'Verify your email',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: AppColors.gray800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'We sent a 6-digit code to\n${widget.personalEmail}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.gray500),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                if (widget.guardianEmail != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: AppColors.blue50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.blue200),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.badge_outlined, size: 18, color: AppColors.policeBlue),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Your Guardian ID: ${widget.guardianEmail}',
                            style: const TextStyle(fontSize: 13, color: AppColors.blue900),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                if (_error.isNotEmpty) ...[
                  AppBanner(message: _error, isError: true, onDismiss: () => setState(() => _error = '')),
                  const SizedBox(height: 8),
                ],
                if (_success.isNotEmpty) ...[
                  AppBanner(message: _success, onDismiss: () => setState(() => _success = '')),
                  const SizedBox(height: 8),
                ],
                const Text(
                  'Enter the 6-digit verification code',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w400,
                    color: AppColors.gray600,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 12),
                _OtpDigitBoxes(
                  text: _otpController.text,
                  focusedIndex: _focusNode.hasFocus ? _otpController.text.length : -1,
                  enabled: !_verified,
                  onTap: _focusNode.requestFocus,
                ),
                TextField(
                  controller: _otpController,
                  focusNode: _focusNode,
                  enabled: !_verified,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(6),
                  ],
                  style: const TextStyle(fontSize: 0, color: Colors.transparent),
                  decoration: const InputDecoration(
                    counterText: '',
                    border: InputBorder.none,
                    filled: false,
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                  ),
                  onChanged: (value) {
                    setState(() {});
                    if (value.length == 6) {
                      _handleVerify();
                    }
                  },
                  onSubmitted: (_) => _handleVerify(),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: (_loading || _verified) ? null : _handleVerify,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.purple600,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: _loading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                        )
                      : const Text('Verify Email', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text("Didn't get a code?", style: TextStyle(color: AppColors.gray600)),
                    TextButton(
                      onPressed: _resending ? null : _handleResend,
                      child: _resending
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.purple600),
                            )
                          : const Text(
                              'Resend OTP',
                              style: TextStyle(color: AppColors.purple600, fontWeight: FontWeight.w600),
                            ),
                    ),
                  ],
                ),
                const Divider(color: AppColors.gray200),
                const SizedBox(height: 4),
                TextButton(
                  onPressed: _loading ? null : () => Navigator.of(context).pop(),
                  child: const Text(
                    'Change personal email',
                    style: TextStyle(color: AppColors.gray500),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _OtpDigitBoxes extends StatelessWidget {
  final String text;
  final int focusedIndex;
  final bool enabled;
  final VoidCallback onTap;

  const _OtpDigitBoxes({
    required this.text,
    required this.focusedIndex,
    required this.enabled,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(6, (index) {
          final digit = index < text.length ? text[index] : '';
          final isFilled = digit.isNotEmpty;
          final isFocused = index == focusedIndex && enabled;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 160),
                curve: Curves.easeOut,
                height: 56,
                decoration: BoxDecoration(
                  color: isFocused
                      ? AppColors.blue50
                      : (isFilled ? AppColors.gray50 : Colors.white),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isFocused
                        ? AppColors.purple600
                        : (isFilled ? AppColors.blue300 : AppColors.gray300),
                    width: isFocused ? 2 : 1.5,
                  ),
                  boxShadow: isFocused
                      ? [
                          BoxShadow(
                            color: AppColors.purple600.withValues(alpha: 0.18),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                alignment: Alignment.center,
                child: digit.isEmpty
                    ? Container(
                        width: 2,
                        height: 26,
                        decoration: BoxDecoration(
                          color: isFocused ? AppColors.purple600 : AppColors.gray200,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      )
                    : Text(
                        digit,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: AppColors.gray800,
                        ),
                      ),
              ),
            ),
          );
        }),
      ),
    );
  }
}
