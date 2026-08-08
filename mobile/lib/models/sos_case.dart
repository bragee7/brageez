class SosCase {
  final String id;
  final String userId;
  final String? userEmail;
  final String? locationLink;
  final String? latitude;
  final String? longitude;
  final String status;
  final String notes;
  final String? videoUrl;
  final String? audioUrl;
  final String? triggerType;
  final DateTime? timestamp;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const SosCase({
    required this.id,
    required this.userId,
    this.userEmail,
    this.locationLink,
    this.latitude,
    this.longitude,
    required this.status,
    this.notes = '',
    this.videoUrl,
    this.audioUrl,
    this.triggerType,
    this.timestamp,
    this.createdAt,
    this.updatedAt,
  });

  factory SosCase.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic v) {
      if (v == null) return null;
      return DateTime.tryParse(v.toString());
    }

    return SosCase(
      id: json['id']?.toString() ?? '',
      userId: (json['userId'] ?? json['user_id'])?.toString() ?? '',
      userEmail: json['userEmail'] ?? json['user_email'],
      locationLink: json['locationLink'] ?? json['location_link'],
      latitude: json['latitude']?.toString(),
      longitude: json['longitude']?.toString(),
      status: json['status'] ?? 'Pending',
      notes: json['notes'] ?? '',
      videoUrl: json['videoUrl'] ?? json['video_url'],
      audioUrl: json['audioUrl'] ?? json['audio_url'],
      triggerType: json['triggerType'] ?? json['trigger_type'],
      timestamp: parseDate(json['timestamp'] ?? json['createdAt'] ?? json['created_at']),
      createdAt: parseDate(json['createdAt'] ?? json['created_at']),
      updatedAt: parseDate(json['updatedAt'] ?? json['updated_at']),
    );
  }

  bool get isPending => status == 'Pending';

  bool get hasLiveLocation =>
      isPending && updatedAt != null && createdAt != null && updatedAt!.isAfter(createdAt!);

  SosCase copyWith({
    String? status,
    String? notes,
    DateTime? updatedAt,
  }) {
    return SosCase(
      id: id,
      userId: userId,
      userEmail: userEmail,
      locationLink: locationLink,
      latitude: latitude,
      longitude: longitude,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      videoUrl: videoUrl,
      audioUrl: audioUrl,
      triggerType: triggerType,
      timestamp: timestamp,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
