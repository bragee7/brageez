import 'package:flutter/foundation.dart';

import '../models/emergency_contact.dart';
import '../services/contacts_service.dart';

class ContactsProvider extends ChangeNotifier {
  final ContactsService _contactsService = ContactsService();

  List<EmergencyContact> _contacts = [];
  bool _loading = false;

  List<EmergencyContact> get contacts => _contacts;
  bool get isLoading => _loading;

  Future<void> fetchContacts() async {
    _loading = true;
    notifyListeners();
    try {
      _contacts = await _contactsService.getContacts();
    } catch (_) {
      _contacts = [];
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> add({
    required String name,
    required String phone,
    String email = '',
    String relation = '',
  }) async {
    await _contactsService.addContact(
      name: name,
      phone: phone,
      email: email,
      relation: relation,
    );
    await fetchContacts();
  }

  Future<void> update(
    int id, {
    required String name,
    required String phone,
    String email = '',
    String relation = '',
  }) async {
    await _contactsService.updateContact(
      id,
      name: name,
      phone: phone,
      email: email,
      relation: relation,
    );
    await fetchContacts();
  }

  Future<void> remove(int id) async {
    await _contactsService.deleteContact(id);
    await fetchContacts();
  }
}
