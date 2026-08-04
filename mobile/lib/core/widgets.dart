import 'package:flutter/material.dart';

import '../core/theme.dart';

class AppBanner extends StatelessWidget {
  final String message;
  final bool isError;
  final VoidCallback? onDismiss;

  const AppBanner({
    super.key,
    required this.message,
    this.isError = false,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    final color = isError ? AppColors.red800 : AppColors.green800;
    final textColor = isError ? AppColors.red200 : AppColors.green200;
    final closeColor = isError ? AppColors.red400 : AppColors.green400;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: color,
        border: Border.all(color: isError ? AppColors.red700 : AppColors.green700),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: textColor, fontSize: 14),
            ),
          ),
          if (onDismiss != null)
            GestureDetector(
              onTap: onDismiss,
              child: Icon(Icons.close, color: closeColor, size: 18),
            ),
        ],
      ),
    );
  }
}

class LoadingSpinner extends StatelessWidget {
  final Color color;
  final double size;

  const LoadingSpinner({
    super.key,
    this.color = AppColors.policeLight,
    this.size = 64,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: CircularProgressIndicator(
        color: color,
        strokeWidth: 4,
      ),
    );
  }
}

class InitialsAvatar extends StatelessWidget {
  final String name;
  final double size;

  const InitialsAvatar({super.key, required this.name, this.size = 40});

  @override
  Widget build(BuildContext context) {
    final initial = name.isEmpty ? '?' : name.characters.first.toUpperCase();
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: AppGradients.avatar,
      ),
      alignment: Alignment.center,
      child: Text(
        initial,
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: size * 0.4,
        ),
      ),
    );
  }
}

class StatusPill extends StatelessWidget {
  final String label;
  final Color background;
  final Color foreground;
  final bool pulsing;

  const StatusPill({
    super.key,
    required this.label,
    required this.background,
    required this.foreground,
    this.pulsing = false,
  });

  @override
  Widget build(BuildContext context) {
    final pill = Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: foreground,
          fontWeight: FontWeight.w600,
          fontSize: 14,
        ),
      ),
    );

    if (!pulsing) return pill;

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 1.0, end: 0.55),
      duration: const Duration(seconds: 1),
      curve: Curves.easeInOut,
      builder: (context, opacity, child) =>
          Opacity(opacity: opacity, child: child),
      child: pill,
    );
  }
}
