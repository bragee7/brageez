import '../core/api_client.dart';
import '../models/emergency_contact.dart';

class ContactsService {
  final _api = ApiClient.instance;

  Future<List<EmergencyContact>> getContacts() async {
    final response = await _api.get('/contacts');
    final data = Map<String, dynamic>.from(response.data as Map);
    final list = (data['contacts'] as List? ?? []);
    return list
        .map((e) => EmergencyContact.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<void> addContact({
    required String name,
    required String phone,
    String email = '',
    String relation = '',
    int priority = 1,
  }) async {
    await _api.post('/contacts', {
      'name': name,
      'phone': phone,
      'email': email,
      'relation': relation,
      'priority': priority,
    });
  }

  Future<void> updateContact(
    String id, {
    required String name,
    required String phone,
    String email = '',
    String relation = '',
    int priority = 1,
  }) async {
    await _api.put('/contacts/$id', {
      'name': name,
      'phone': phone,
      'email': email,
      'relation': relation,
      'priority': priority,
    });
  }

  Future<void> deleteContact(String id) async {
    await _api.delete('/contacts/$id');
  }
}
