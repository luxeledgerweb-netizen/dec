// src/inventory/components/ImportExportPanel.jsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Download } from 'lucide-react';
import JSZip from 'jszip';
import { invDb } from '../db';
import { makeInventoryItem, makeInventoryFolder } from '../types';
import { blobStore } from '../storage/blobStore';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export default function ImportExportPanel({
  isOpen,
  onClose,
  currentFolderId, // not required; kept for future scoping
  onAfterImport,   // optional callback to refresh parent list
}) {
  const [itemsCount, setItemsCount] = useState(0);
  const [foldersCount, setFoldersCount] = useState(0);
  const [preserveIds, setPreserveIds] = useState(true);
  // progress UI for big jobs
  const [isWorking, setIsWorking] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);

  // let UI breathe between batches (prevents iOS “freeze” feel)
  const uiYield = () =>
    new Promise((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    });

  // array chunk helper
  const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const [items, folders] = await Promise.all([
        invDb.listItems(),
        invDb.listFolders()
      ]);
      setItemsCount(items.length);
      setFoldersCount(folders.length);
    })();
  }, [isOpen]);

// ---- Native helpers (for iOS IPA) ----
const isNative = !!(Capacitor?.isNativePlatform?.() && Capacitor.isNativePlatform());

const writeUtf8AndGetUri = async (fileName, text) => {
  const res = await Filesystem.writeFile({
    path: fileName,
    data: text,
    directory: Directory.Cache,   // <— Cache, not Documents
    encoding: Encoding.UTF8,
    recursive: true,
  });
  return res.uri; // capacitor://... URI
};

const writeBase64AndGetUri = async (fileName, base64) => {
  const res = await Filesystem.writeFile({
    path: fileName,
    data: base64,                 // raw base64, no data: prefix
    directory: Directory.Cache,   // <— Cache, not Documents
    recursive: true,
  });
  return res.uri;
};

// Prefer `files: [uri]` on iOS. Fall back to `url` if needed.
// Optionally delete temp file after trying to share.
const shareUri = async (uri, title = 'Export', tempPathForCleanup = null) => {
  try {
    // Try the reliable iOS path
    await Share.share({ title, files: [uri] });
  } catch (e1) {
    try {
      // Fallback some environments accept
      await Share.share({ title, url: uri });
    } catch (e2) {
      console.warn('Share failed:', e2);
      alert(`Saved temporary file at: ${uri}`);
    }
  } finally {
    // Best-effort cleanup of temp file
    if (tempPathForCleanup) {
      try {
        await Filesystem.deleteFile({ path: tempPathForCleanup, directory: Directory.Cache });
      } catch {}
    }
  }
};

// -------- JSON EXPORT (thumbs only) --------
const exportJSON = async () => {
  const [items, folders] = await Promise.all([
    invDb.listItems(),
    invDb.listFolders()
  ]);
  const payload = {
    version: 2,
    exported_at: new Date().toISOString(),
    folders,
    items,
    note: 'Phase 2 export: thumbnails only; full-res blobs stay in IndexedDB.',
  };
  const fileName = `inventory-export-${Date.now()}.json`;
  const jsonText = JSON.stringify(payload, null, 2);

  if (isNative) {
    // iOS path: write to Files app and open Share sheet
    const uri = await writeUtf8AndGetUri(fileName, jsonText);
    await shareUri(uri, 'Inventory JSON Export', /* tempPathForCleanup */ fileName);
  } else {
    // Web/desktop path: download via anchor
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = fileName;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  }
};

  // -------- JSON IMPORT --------
  const importJSON = async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const importedFolders = Array.isArray(data.folders) ? data.folders : [];
      const importedItems = Array.isArray(data.items) ? data.items : [];

      // 1) folders
      const folderIdMap = new Map(); // old -> new
      for (const f of importedFolders) {
        let record = f;
        if (!preserveIds) {
          record = makeInventoryFolder({ ...f, id: undefined, created_at: f.created_at, updated_at: f.updated_at });
          folderIdMap.set(f.id, record.id);
        } else {
          record = makeInventoryFolder({ ...f, id: f.id });
          folderIdMap.set(f.id, f.id);
        }
        await invDb.saveFolder(record);
      }

      // 2) items
      for (const i of importedItems) {
        const newFolderId = i.folderId ? (folderIdMap.get(i.folderId) ?? null) : null;
        let record = i;
        if (!preserveIds) {
          record = makeInventoryItem({
            ...i,
            id: undefined,
            folderId: newFolderId,
            created_at: i.created_at,
            updated_at: i.updated_at,
          });
        } else {
          record = makeInventoryItem({ ...i, id: i.id, folderId: newFolderId });
        }
        await invDb.saveItem(record);
      }

      if (onAfterImport) await onAfterImport();
      alert(`Imported ${importedItems.length} items and ${importedFolders.length} folders.`);
      onClose?.();
    } catch (e) {
      console.error(e);
      alert('Import failed: invalid or corrupt JSON.');
    }
  };

// -------- ZIP EXPORT (JSON + full-res images) --------
const handleExportZip = async () => {
  setIsWorking(true);
  setProgressMsg('Preparing export…');
  setProgressPct(0);

  try {
    const [allFolders, allItems] = await Promise.all([
      invDb.listFolders(),
      invDb.listItems()
    ]);

    const manifest = {
      version: 1,
      exported_at: new Date().toISOString(),
      folders: allFolders,
      items: allItems.map(i => ({ ...i, images: Array.isArray(i.images) ? i.images : [] })),
      files: []
    };

    const zip = new JSZip();
    // write an initial manifest (will overwrite later with final file list)
    zip.file('inventory.json', JSON.stringify(manifest, null, 2));

    // process items in small batches to limit memory/CPU spikes
    const batches = chunk(allItems, 10); // tune 10–25 as you like
    let processed = 0;
    const total = allItems.length;

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];

      await Promise.all(batch.map(async (item) => {
        const files = await invDb.listFiles(item.id);
        for (const f of files) {
          const folderPath = `files/${item.id}`;
          const filePath = `${folderPath}/${f.id}__${f.name}`;

          let blob = f.blob;
          if (!blob && blobStore.isNative && f.uri) {
            blob = await blobStore.read({ uri: f.uri, mime: f.mime });
          }

          manifest.files.push({
            id: f.id,
            itemId: f.itemId,
            name: f.name,
            mime: f.mime,
            size: f.size || (blob?.size ?? 0),
          });

          if (blob) {
            zip.file(filePath, blob, { binary: true });
          }
        }
      }));

      processed += batch.length;
      setProgressMsg(`Collecting files… ${processed}/${total} items`);
      setProgressPct(Math.round((processed / Math.max(1, total)) * 70)); // first ~70%
      await uiYield();
    }

    // overwrite manifest with final file counts
    zip.file('inventory.json', JSON.stringify(manifest, null, 2));

    setProgressMsg('Compressing ZIP…');
    setProgressPct(85);
    await uiYield();

    const fileName = `inventory-export-${new Date().toISOString().slice(0,10)}.zip`;

    if (isNative) {
      // iOS: prefer base64 + low compression to reduce CPU
      const base64 = await zip.generateAsync({
        type: 'base64',
        compression: 'DEFLATE',
        compressionOptions: { level: 1 },
        streamFiles: true,
      });
      setProgressMsg('Writing file…');
      setProgressPct(95);
      const uri = await writeBase64AndGetUri(fileName, base64);
      await shareUri(uri, 'Inventory ZIP Export', fileName);
    } else {
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 1 },
        streamFiles: true,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    setProgressMsg('Done!');
    setProgressPct(100);
  } catch (e) {
    console.error(e);
    alert('Export failed. See console for details.');
  } finally {
    setTimeout(() => {
      setIsWorking(false);
      setProgressMsg('');
      setProgressPct(0);
    }, 400);
  }
};

  // -------- ZIP IMPORT --------
const handleImportZip = async (file) => {
  setIsWorking(true);
  setProgressMsg('Reading ZIP…');
  setProgressPct(0);

  try {
    const zip = await JSZip.loadAsync(file);
    const manifestFile = zip.file('inventory.json');
    if (!manifestFile) {
      alert('ZIP is missing inventory.json');
      return;
    }
    const manifest = JSON.parse(await manifestFile.async('string'));

    if (Array.isArray(manifest.folders)) {
      for (const f of manifest.folders) await invDb.saveFolder(f);
    }
    if (Array.isArray(manifest.items)) {
      for (const it of manifest.items) await invDb.saveItem(it);
    }

    const metas = Array.isArray(manifest.files) ? manifest.files : [];
    const batches = chunk(metas, 20);
    const total = metas.length;
    let processed = 0;

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      await Promise.all(batch.map(async (meta) => {
        const path = `files/${meta.itemId}/${meta.id}__${meta.name}`;
        const zf = zip.file(path);
        if (!zf) return;
        const blob = await zf.async('blob');
        await invDb.saveFileRecord({
          id: meta.id,
          itemId: meta.itemId,
          name: meta.name,
          mime: meta.mime || blob.type || 'application/octet-stream',
          size: meta.size || blob.size || 0,
          created_at: new Date().toISOString(),
          blob,
        });
      }));
      processed += batch.length;
      setProgressMsg(`Importing files… ${processed}/${total}`);
      setProgressPct(Math.round((processed / Math.max(1, total)) * 100));
      await uiYield();
    }

    if (typeof onAfterImport === 'function') await onAfterImport();
    alert('Import complete.');
  } catch (e) {
    console.error(e);
    alert('Import failed. See console for details.');
  } finally {
    setIsWorking(false);
    setProgressMsg('');
    setProgressPct(0);
  }
};

  // unified file picker (JSON or ZIP)
  const onFilePicked = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      if (/\.(zip)$/i.test(f.name)) {
        await handleImportZip(f);
      } else {
        await importJSON(f);
      }
    } finally {
      e.target.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-2 sm:p-4">
      <Card className="w-full max-w-[min(860px,calc(100vw-2rem))] max-h-[90vh] flex flex-col" style={{ backgroundColor: 'var(--tile-color)' }}>
        <CardHeader className="sticky top-0 z-10 bg-[var(--tile-color)]/95 backdrop-blur border-b">
          <CardTitle>Import / Export</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-6">
	{isWorking && (
	  <div className="space-y-2">
	    <div className="text-sm">{progressMsg}</div>
	    <div className="w-full h-2 bg-muted rounded overflow-hidden">
	      <div className="h-2 bg-blue-500" style={{ width: `${progressPct}%` }} />
	    </div>
	  </div>
	)}
          <div className="text-sm text-muted-foreground">
            <p>Backups include:</p>
            <ul className="list-disc ml-5 mt-1">
              <li>All folders (nested)</li>
              <li>All items with thumbnails (small previews)</li>
              <li><strong>ZIP export</strong> also includes full-resolution attachments (images, PDFs, videos, etc).</li>
            </ul>
          </div>

          <div className="border rounded p-3 space-y-2">
            <div className="font-medium">Export</div>
            <div className="text-sm text-muted-foreground">
              Ready to export <strong>{itemsCount}</strong> items and <strong>{foldersCount}</strong> folders.
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <Button onClick={exportJSON} disabled={isWorking}>
		  <Download className="h-4 w-4 mr-2" /> Export JSON
		</Button>

		<Button variant="outline" onClick={handleExportZip} disabled={isWorking}>
		  Export ZIP (JSON + images)
		</Button>
            </div>
          </div>

          <div className="border rounded p-3 space-y-3">
            <div className="font-medium">Import</div>
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={preserveIds}
                onChange={(e) => setPreserveIds(e.target.checked)}
              />
              Preserve IDs (keep original IDs; uncheck to remap on import)
            </label>
            <div className="flex items-center gap-2">
              <Input
	  type="file"
	  accept=".json,.zip,application/json,application/zip,application/octet-stream,*/*"
	  onChange={onFilePicked}
	  disabled={isWorking}
	  />
            </div>
            <div className="text-xs text-muted-foreground">
              Tip: If you see “duplicate ID” issues, uncheck “Preserve IDs”.
            </div>
          </div>

          <div className="sticky bottom-0 z-10 bg-[var(--tile-color)]/95 backdrop-blur border-t px-4 py-3">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}