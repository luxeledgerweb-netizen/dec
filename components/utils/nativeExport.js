// src/components/utils/nativeExport.js
import { Capacitor } from '@capacitor/core';

// These imports won't break web — they'll tree-shake away outside iOS
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Save JSON data to a file.
 * - On iOS (Capacitor): write to Documents, then open the Share Sheet.
 * - On Web/Desktop: fall back to Blob download.
 */
export async function exportJson(filename, dataObject) {
  const json = typeof dataObject === 'string'
    ? dataObject
    : JSON.stringify(dataObject, null, 2);

  const isIOSCapacitor =
    Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  if (isIOSCapacitor) {
    try {
      // 1) Write to app's Documents
      const { uri } = await Filesystem.writeFile({
        path: `Exports/${filename}`,
        data: json,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });

      // 2) Share the file (user can “Save to Files”, AirDrop, etc.)
      await Share.share({
        title: filename,
        text: 'Your Luxe Ledger export',
        url: uri, // iOS understands this file:// URL
        dialogTitle: 'Export',
      });

      return true;
    } catch (err) {
      console.error('Capacitor export failed, falling back to web download:', err);
      // fall through to web download
    }
  }

  // Fallback: regular web download
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}