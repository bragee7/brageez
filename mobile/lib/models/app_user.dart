class AppUser {
  final int id;
  final String name;
  final String email;
  final String role;

  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] is int ? json['id'] : int.tryParse('${json['id']}') ?? 0,
      name: json['name'] ?? json['Name'] ?? '',
      email: json['email'] ?? json['Email'] ?? '',
      role: json['role'] ?? json['Role'] ?? 'user',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'role': role,
      };

  bool get isPolice => role == 'police';
  bool get isUser => role == 'user';
}
