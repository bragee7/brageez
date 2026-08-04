import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/theme.dart';
import '../core/widgets.dart';
import '../models/app_user.dart';
import '../models/sos_case.dart';
import '../state/auth_provider.dart';
import '../state/cases_provider.dart';
import 'case_details_screen.dart';

class PoliceDashboardScreen extends StatefulWidget {
  const PoliceDashboardScreen({super.key});

  @override
  State<PoliceDashboardScreen> createState() => _PoliceDashboardScreenState();
}

class _PoliceDashboardScreenState extends State<PoliceDashboardScreen> {
  final _dateFormat = DateFormat('MMM d, yyyy h:mm a');
  bool _alertVisible = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final cases = context.read<CasesProvider>();
      cases.fetchCases();
      _listenForAlerts(cases);
    });
  }

  void _listenForAlerts(CasesProvider cases) {
    Future.delayed(const Duration(milliseconds: 100), () {
      cases.addListener(_onCasesChanged);
    });
  }

  void _onCasesChanged() {
    final cases = context.read<CasesProvider>();
    if (cases.hasNewAlert && !_alertVisible) {
      _alertVisible = true;
      _playAlertSound();
      setState(() {});
      Future.delayed(const Duration(seconds: 5), () {
        if (mounted) {
          setState(() => _alertVisible = false);
          cases.clearNewAlert();
        }
      });
    }
  }

  void _playAlertSound() {
    try {
      SystemSound.play(SystemSoundType.alert);
    } catch (_) {}
  }

  Future<void> _openMaps(String link) async {
    final uri = Uri.parse(link);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  void dispose() {
    context.read<CasesProvider>().removeListener(_onCasesChanged);
    super.dispose();
  }

  Future<void> _handleLogout(BuildContext context) async {
    await context.read<AuthProvider>().logout();
    if (context.mounted) {
      Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final cases = context.watch<CasesProvider>();
    final user = auth.user;

    return Scaffold(
      body: Column(
        children: [
          _buildNavbar(context, user?.name ?? '', user?.role ?? ''),
          Expanded(
            child: Container(
              color: AppColors.gray900,
              child: cases.isLoading && cases.cases.isEmpty
                  ? const LoadingSpinner(color: AppColors.policeLight, size: 56)
                  : RefreshIndicator(
                      onRefresh: cases.fetchCases,
                      color: AppColors.policeBlue,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        child: Center(
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 760),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _buildHeader(cases),
                                if (_alertVisible) _buildNewAlertBanner(),
                                if (cases.error.isNotEmpty)
                                  _buildErrorBanner(cases),
                                _buildStatsRow(cases),
                                const SizedBox(height: 20),
                                _buildCasesList(cases),
                                const SizedBox(height: 24),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavbar(BuildContext context, String name, String role) {
    return Material(
      color: Colors.white,
      elevation: 4,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [AppColors.emergencyRed, AppColors.pink500],
                  ),
                ),
                alignment: Alignment.center,
                child: const Icon(Icons.shield, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 10),
              const Text(
                'Guardian',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppColors.gray800,
                ),
              ),
              const Spacer(),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.gray800,
                    ),
                  ),
                  Text(
                    role.isEmpty ? role : role[0].toUpperCase() + role.substring(1),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.gray500,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 10),
              TextButton(
                onPressed: () => _handleLogout(context),
                style: TextButton.styleFrom(
                  backgroundColor: AppColors.gray100,
                  foregroundColor: AppColors.gray700,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                child: const Text('Logout', style: TextStyle(fontSize: 13)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(CasesProvider cases) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: _alertVisible ? AppGradients.statRed : AppGradients.headerRed,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Police Control Center',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Welcome, Officer ${authUser?.name ?? ''}',
                  style: const TextStyle(color: AppColors.gray300),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${cases.pendingCount}',
                style: const TextStyle(
                  fontSize: 40,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
              const Text(
                'Active Alerts',
                style: TextStyle(color: AppColors.gray300),
              ),
            ],
          ),
        ],
      ),
    );
  }

  AppUser? get authUser => context.read<AuthProvider>().user;

  Widget _buildNewAlertBanner() {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.red600,
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Text(
        '🚨 NEW EMERGENCY ALERT RECEIVED! 🚨',
        textAlign: TextAlign.center,
        style: TextStyle(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildErrorBanner(CasesProvider cases) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.red900,
        border: Border.all(color: AppColors.red700),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Expanded(
            child: Text(
              'Failed to fetch cases',
              style: TextStyle(color: AppColors.red200),
            ),
          ),
          GestureDetector(
            onTap: cases.fetchCases,
            child: const Text(
              'Retry',
              style: TextStyle(
                color: AppColors.red200,
                decoration: TextDecoration.underline,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsRow(CasesProvider cases) {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Row(
        children: [
          Expanded(child: _statCard(AppGradients.statRed, AppColors.red600, Icons.warning_amber_rounded, cases.pendingCount, 'Pending Cases')),
          const SizedBox(width: 12),
          Expanded(child: _statCard(AppGradients.statGreen, AppColors.green600, Icons.check_circle_outline, cases.resolvedCount, 'Resolved Cases')),
          const SizedBox(width: 12),
          Expanded(child: _statCard(AppGradients.statBlue, AppColors.blue600, Icons.description_outlined, cases.cases.length, 'Total Cases')),
        ],
      ),
    );
  }

  Widget _statCard(
    Gradient gradient,
    Color iconColor,
    IconData icon,
    int count,
    String label,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(color: iconColor, shape: BoxShape.circle),
            alignment: Alignment.center,
            child: Icon(icon, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$count',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                Text(
                  label,
                  style: const TextStyle(color: AppColors.gray300, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCasesList(CasesProvider cases) {
    return Container(
      clipBehavior: Clip.hardEdge,
      decoration: BoxDecoration(
        color: AppColors.gray800,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Emergency Cases',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
          const Divider(color: AppColors.gray700, height: 1),
          if (cases.cases.isEmpty)
            Padding(
              padding: const EdgeInsets.all(40),
              child: Column(
                children: [
                  const Icon(Icons.check_circle_outline, color: AppColors.gray600, size: 56),
                  const SizedBox(height: 8),
                  Text(
                    'No emergency cases reported',
                    style: const TextStyle(color: AppColors.gray400, fontSize: 16),
                  ),
                ],
              ),
            )
          else
            ...cases.cases.map((c) => _buildCaseTile(c)),
        ],
      ),
    );
  }

  Widget _buildCaseTile(SosCase caseItem) {
    final pending = caseItem.isPending;
    return InkWell(
      onTap: () {
        Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => CaseDetailsScreen(caseId: caseItem.id),
        ));
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.transparent,
          border: Border(bottom: BorderSide(color: AppColors.gray700.withValues(alpha: 0.4))),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: pending ? AppColors.red500 : AppColors.green500,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Emergency Alert',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        'From: ${caseItem.userEmail ?? 'Unknown User'}',
                        style: const TextStyle(color: AppColors.gray400, fontSize: 13),
                      ),
                      Text(
                        _formatDate(caseItem.timestamp),
                        style: const TextStyle(color: AppColors.gray500, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                _statusPill(pending),
                const SizedBox(width: 8),
                const Icon(Icons.chevron_right, color: AppColors.gray400),
              ],
            ),
            if (caseItem.locationLink != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.location_on_outlined, color: AppColors.blue400, size: 16),
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: () => _openMaps(caseItem.locationLink!),
                    child: const Text(
                      'View Location on Google Maps',
                      style: TextStyle(
                        color: AppColors.blue400,
                        fontSize: 13,
                        decoration: TextDecoration.underline,
                      ),
                    ),
                  ),
                  if (caseItem.hasLiveLocation) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.green900,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.circle, color: AppColors.green500, size: 6),
                          SizedBox(width: 4),
                          Text(
                            'LIVE',
                            style: TextStyle(color: AppColors.green400, fontSize: 10, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _statusPill(bool pending) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: pending ? AppColors.red900 : AppColors.green900,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        pending ? 'Pending' : 'Resolved',
        style: TextStyle(
          color: pending ? AppColors.red200 : AppColors.green200,
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '';
    return _dateFormat.format(date.toLocal());
  }
}
