import 'dart:developer' as developer;
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';

class ModelExtractor {
  static const _assetModelZip = 'assets/vosk/model.zip';
  static const _modelDirName = 'vosk-model-small-en-us-0.15';

  static Future<String> ensureModel() async {
    debugPrint('[ModelExtractor] start');
    final docs = await getApplicationDocumentsDirectory();
    final voskDir = Directory('${docs.path}/vosk');
    final modelDir = Directory('${voskDir.path}/$_modelDirName');
    debugPrint('[ModelExtractor] voskDir=${voskDir.path}');

    if (modelDir.existsSync()) {
      developer.log(
        'Model already present at ${modelDir.path}',
        name: 'ModelExtractor',
      );
      debugPrint('[ModelExtractor] already present at ${modelDir.path}');
      return modelDir.path;
    }

    debugPrint('[ModelExtractor] loading asset $_assetModelZip');
    final data = await rootBundle.load(_assetModelZip);
    final bytes = data.buffer.asUint8List();
    debugPrint('[ModelExtractor] loaded ${bytes.length} bytes');

    debugPrint('[ModelExtractor] decoding archive...');
    final archive = ZipDecoder().decodeBytes(bytes);
    debugPrint('[ModelExtractor] archive entries: ${archive.files.length}');

    if (!voskDir.existsSync()) {
      voskDir.createSync(recursive: true);
    }
    debugPrint('[ModelExtractor] voskDir ensured');

    var files = 0;
    var dirs = 0;
    for (final file in archive.files) {
      var path = file.name.replaceAll('\\', '/');
      if (path.startsWith('__MACOSX')) continue;
      path = path.replaceAll(RegExp(r'^/+'), '').replaceAll(RegExp(r'/+$'), '');
      if (path.isEmpty) continue;
      final full = '${voskDir.path}/$path';
      if (file.isFile) {
        debugPrint('[ModelExtractor] writing file $path (${file.size} bytes)');
        final target = File(full);
        target.parent.createSync(recursive: true);
        await target.writeAsBytes(file.content);
        files++;
      } else {
        Directory(full).createSync(recursive: true);
        dirs++;
      }
    }

    developer.log(
      'Extracted $files files / $dirs dirs to ${voskDir.path}',
      name: 'ModelExtractor',
    );
    debugPrint('[ModelExtractor] done: $files files / $dirs dirs');

    return modelDir.path;
  }
}
