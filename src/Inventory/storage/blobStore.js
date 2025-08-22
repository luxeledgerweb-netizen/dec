// src/inventory/storage/blobStore.js
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Simple platform check
const isNative = !!Capacitor?.isNativePlatform?.() && Capacitor.getPlatform() !== 'web';

// Helpers
async function blobToBase64(blob) {
  const buf = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function base64ToBlob(b64, mime = 'application/octet-stream') {
  const byteChars = atob(b64);
  const byteNums = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNums);
  return new Blob([byteArray], { type: mime });
}

// Public API
export const blobStore = {
  isNative,

  // Write the file body; return { uri } on native, or { blob } on web
  async write({ itemId, fileId, name, mime, blob }) {
    if (!isNative) {
      // web: keep blob in memory path; caller (db.js) will persist in IDB
      return { blob };
    }
    // native: write to app sandbox
    const path = `inventory/${itemId}/${fileId}__${name}`;
    const data = await blobToBase64(blob);
    await Filesystem.writeFile({
      path,
      data,
      directory: Directory.Data, // Application Support
      recursive: true,
    });
    return { uri: path, size: blob.size, mime };
  },

  // Read the file body back as Blob
  async read({ uri, mime }) {
    if (!isNative) throw new Error('blobStore.read only needed on native with uri');
    const res = await Filesystem.readFile({ path: uri, directory: Directory.Data });
    return base64ToBlob(res.data, mime);
  },

  // Remove the file body
  async remove({ uri }) {
    if (!isNative) return; // web is handled by IDB delete
    try {
      await Filesystem.deleteFile({ path: uri, directory: Directory.Data });
    } catch (e) {
      // ignore if missing
    }
  }
};