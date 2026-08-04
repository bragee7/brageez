import 'package:flutter/material.dart';

class AppColors {
  // Brand
  static const emergencyRed = Color(0xFFDC2626);
  static const emergencyDark = Color(0xFF991B1B);
  static const safeGreen = Color(0xFF059669);
  static const safeLight = Color(0xFF10B981);
  static const policeBlue = Color(0xFF1E40AF);
  static const policeLight = Color(0xFF3B82F6);

  // Tailwind grays
  static const gray50 = Color(0xFFF9FAFB);
  static const gray100 = Color(0xFFF3F4F6);
  static const gray200 = Color(0xFFE5E7EB);
  static const gray300 = Color(0xFFD1D5DB);
  static const gray400 = Color(0xFF9CA3AF);
  static const gray500 = Color(0xFF6B7280);
  static const gray600 = Color(0xFF4B5563);
  static const gray700 = Color(0xFF374151);
  static const gray800 = Color(0xFF1F2937);
  static const gray900 = Color(0xFF111827);

  // Standard tailwind accent palette (badges, stats)
  static const red50 = Color(0xFFFEF2F2);
  static const red100 = Color(0xFFFEE2E2);
  static const red200 = Color(0xFFFECACA);
  static const red300 = Color(0xFFFCA5A5);
  static const red400 = Color(0xFFF87171);
  static const red500 = Color(0xFFEF4444);
  static const red600 = Color(0xFFDC2626);
  static const red700 = Color(0xFFB91C1C);
  static const red800 = Color(0xFF991B1B);
  static const red900 = Color(0xFF7F1D1D);

  static const green50 = Color(0xFFF0FDF4);
  static const green100 = Color(0xFFDCFCE7);
  static const green200 = Color(0xFFBBF7D0);
  static const green300 = Color(0xFF86EFAC);
  static const green400 = Color(0xFF4ADE80);
  static const green500 = Color(0xFF22C55E);
  static const green600 = Color(0xFF16A34A);
  static const green700 = Color(0xFF15803D);
  static const green800 = Color(0xFF166534);
  static const green900 = Color(0xFF14532D);

  static const blue50 = Color(0xFFEFF6FF);
  static const blue100 = Color(0xFFDBEAFE);
  static const blue200 = Color(0xFFBFDBFE);
  static const blue300 = Color(0xFF93C5FD);
  static const blue400 = Color(0xFF60A5FA);
  static const blue500 = Color(0xFF3B82F6);
  static const blue600 = Color(0xFF2563EB);
  static const blue700 = Color(0xFF1D4ED8);
  static const blue800 = Color(0xFF1E40AF);
  static const blue900 = Color(0xFF1E3A8A);

  static const purple600 = Color(0xFF9333EA);
  static const purple700 = Color(0xFF7E22CE);

  static const indigo700 = Color(0xFF4338CA);

  static const orange500 = Color(0xFFF97316);
  static const orange600 = Color(0xFFEA580C);

  static const pink500 = Color(0xFFEC4899);
  static const pink600 = Color(0xFFDB2777);
  static const pink700 = Color(0xFFBE185D);
  static const pink50 = Color(0xFFFDF2F8);
  static const pink100 = Color(0xFFFCE7F3);
}

class AppTheme {
  static const fontFamily = 'Inter';

  static ThemeData light() {
    return ThemeData(
      useMaterial3: false,
      fontFamily: fontFamily,
      scaffoldBackgroundColor: AppColors.gray900,
      colorScheme: const ColorScheme.light(
        primary: AppColors.emergencyRed,
        secondary: AppColors.policeBlue,
        surface: AppColors.gray800,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.gray900,
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.white),
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          fontFamily: fontFamily,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.emergencyRed,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.gray800,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.gray700),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.gray700),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.policeLight, width: 2),
        ),
        hintStyle: const TextStyle(color: AppColors.gray400),
      ),
    );
  }
}

// Gradient backgrounds matching the web app
class AppGradients {
  static const userDashboard = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.gray900, AppColors.red900, AppColors.gray900],
  );

  static const login = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.pink500, AppColors.red500, AppColors.orange500],
  );

  static const register = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.purple600, AppColors.blue600, AppColors.indigo700],
  );

  static const sosButton = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.red600, AppColors.red500, AppColors.pink600],
  );

  static const statRed = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.red900, AppColors.red800],
  );

  static const statGreen = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.green900, AppColors.green800],
  );

  static const statBlue = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.blue900, AppColors.blue800],
  );

  static const avatar = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.blue500, AppColors.purple600],
  );

  static const headerRed = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [AppColors.red900, AppColors.red800],
  );
}
