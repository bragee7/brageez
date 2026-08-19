class EmergencyContact {
  final String id;
  final String userId;
  final String name;
  final String phone;
  final String email;
  final String relation;
  final int priority;

  const EmergencyContact({
    required this.id,
    required this.userId,
    required this.name,
    required this.phone,
    this.email = '',
    this.relation = '',
    this.priority = 1,
  });

  factory EmergencyContact.fromJson(Map<String, dynamic> json) {
    return EmergencyContact(
      id: json['id']?.toString() ?? '',
      userId: (json['user_id'] ?? json['userId'])?.toString() ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'] ?? '',
      relation: json['relation'] ?? '',
      priority: (json['priority'] as num?)?.toInt() ?? 1,
    );
  }
}
