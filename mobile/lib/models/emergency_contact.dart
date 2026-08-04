class EmergencyContact {
  final int id;
  final int userId;
  final String name;
  final String phone;
  final String email;
  final String relation;

  const EmergencyContact({
    required this.id,
    required this.userId,
    required this.name,
    required this.phone,
    this.email = '',
    this.relation = '',
  });

  factory EmergencyContact.fromJson(Map<String, dynamic> json) {
    return EmergencyContact(
      id: json['id'] is int ? json['id'] : int.tryParse('${json['id']}') ?? 0,
      userId: json['user_id'] is int
          ? json['user_id']
          : int.tryParse('${json['user_id']}') ?? 0,
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'] ?? '',
      relation: json['relation'] ?? '',
    );
  }
}
