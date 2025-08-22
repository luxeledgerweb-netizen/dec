import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Image as ImageIcon, Trash2, RotateCcw } from 'lucide-react';

// Create a thumbnail data URL for an image File
async function fileToThumbDataUrl(file, max = 320) {
  const img = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = r.result;
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const scale = Math.min(max / img.width, max / img.height, 1);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.82);
}

// -------- Inline image compression (canvas-based) --------
async function compressImage(
  file,
  {
    maxDim = 4096,            // cap the long edge
    quality = 0.82,           // JPEG/WebP quality
    preferType = 'image/jpeg' // 'image/webp' smaller, but older iOS can be picky
  } = {}
) {
  const srcUrl = URL.createObjectURL(file);
  let bmp; // <-- declare OUTSIDE try so it's visible in finally
  try {
    let iw, ih;

    if ('createImageBitmap' in window) {
      bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      iw = bmp.width;
      ih = bmp.height;
    } else {
      const img = await new Promise((res, rej) => {
        const el = new Image();
        el.onload = () => res(el);
        el.onerror = rej;
        el.src = srcUrl;
      });
      bmp = img;
      iw = img.naturalWidth;
      ih = img.naturalHeight;
    }

    const scale = Math.min(maxDim / Math.max(iw, ih), 1);
    const tw = Math.max(1, Math.round(iw * scale));
    const th = Math.max(1, Math.round(ih * scale));

    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0, tw, th);

    const outType = preferType; // swap to 'image/png' if you must keep alpha for PNGs
    const outBlob = await new Promise((res) => canvas.toBlob(res, outType, quality));

    return outBlob || file;
  } finally {
    URL.revokeObjectURL(srcUrl);
    try { (bmp && 'close' in bmp) && bmp.close(); } catch {}
  }
}

// Create a poster-frame thumbnail for a <video> File
async function videoToThumbDataUrl(file, seekTo = 0.1 /* seconds */) {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload= 'metadata'; 

    await new Promise((res, rej) => {
      video.onloadedmetadata = () => {
        // clamp seek time
        video.currentTime = Math.min(seekTo, Math.max(0, (video.duration || 1) - 0.1));
      };
      video.onseeked = res;
      video.onerror = rej;
    });

    const canvas = document.createElement('canvas');
    const w = video.videoWidth || 320;
    const h = video.videoHeight || 180;
    const max = 320;
    const scale = Math.min(max / Math.max(w, h), 1);
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Super-simple PDF "thumb": placeholder (upgrade to PDF.js later if you want)
function pdfThumbDataUrl() {
  // Tiny inline SVG badge so it renders everywhere
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <rect x="30" y="20" width="260" height="160" fill="#fff" stroke="#d1d5db"/>
      <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
            font-family="system-ui, -apple-system, Segoe UI, Roboto" font-size="36" fill="#ef4444">PDF</text>
    </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Rename extension to match the new MIME (helps on export)
function renameWithType(originalName, mime) {
  const lower = (originalName || '').toLowerCase();
  let ext = '';
  if (mime === 'image/webp') ext = '.webp';
  else if (mime === 'image/jpeg') ext = '.jpg';
  else if (mime === 'image/png') ext = '.png';

  const dot = lower.lastIndexOf('.');
  const base = dot > 0 ? originalName.slice(0, dot) : originalName;
  return ext ? `${base}${ext}` : originalName;
}

export default function AddInventoryItemModal({
  isOpen,
  onClose,
  onSave,
  mode = 'add',               // 'add' | 'edit'
  initialItem = null,         // item with .images = [{thumbDataUrl, name?}]
  existingFiles = [],         // [{id,name,size,mime}]
  onDelete,                   // optional: allow delete from edit mode
}) {
  const [title, setTitle] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [notes, setNotes] = useState('');

  const [thumbs, setThumbs] = useState([]);          // [{thumbDataUrl, name?}]
  const [newUploads, setNewUploads] = useState([]);  // [{file, thumbDataUrl}]
  const [removedFileIds, setRemovedFileIds] = useState([]); // [id]
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && initialItem) {
      setTitle(initialItem.title || '');
      setTagsText((initialItem.tags || []).join(', '));
      setNotes(initialItem.notes || '');
      setThumbs(Array.isArray(initialItem.images) ? initialItem.images : []);
      setNewUploads([]);
      setRemovedFileIds([]);
      setError('');
    } else {
      setTitle('');
      setTagsText('');
      setNotes('');
      setThumbs([]);
      setNewUploads([]);
      setRemovedFileIds([]);
      setError('');
    }
  }, [isOpen, mode, initialItem]);

  const processFiles = useCallback(async (files) => {
  const picked = Array.from(files || []);
  if (picked.length === 0) return;

  setIsBusy(true);
  const results = [];

  for (const f of picked) {
    try {
      let thumb;
      let outFile = f;

      if (f.type?.startsWith('image/')) {
        const thumbUrl = await fileToThumbDataUrl(f);
        const compressed = await compressImage(f, {
          maxDim: 4096,
          quality: 0.82,
          preferType: 'image/jpeg',
        });
        outFile = new File(
          [compressed],
          renameWithType(f.name, compressed.type || 'image/jpeg'),
          { type: compressed.type || 'image/jpeg', lastModified: Date.now() }
        );
        thumb = thumbUrl;
      } else if (f.type?.startsWith('video/')) {
        thumb = await videoToThumbDataUrl(f);
        // no compression for videos here; store as-is
      } else if (f.type === 'application/pdf') {
        thumb = pdfThumbDataUrl();
        // store file as-is
      } else {
        // Unsupported type (skip or create a generic icon)
        continue;
      }

      results.push({ file: outFile, thumbDataUrl: thumb, name: outFile.name });
    } catch {
      // skip unreadable
    }
  }

  setNewUploads(prev => [...prev, ...results]);
  setIsBusy(false);
}, []);

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await processFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const combinedThumbs = useMemo(() => {
    return [
      ...thumbs,
      ...newUploads.map(x => ({ thumbDataUrl: x.thumbDataUrl, name: x.file.name })),
    ];
  }, [thumbs, newUploads]);

  const handleRemoveNewUpload = (idx) => {
    setNewUploads(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveExistingFile = (fileId) => {
    setRemovedFileIds(prev => (prev.includes(fileId) ? prev : [...prev, fileId]));
  };

  const handleUndoRemoveExistingFile = (fileId) => {
    setRemovedFileIds(prev => prev.filter(id => id !== fileId));
  };

  const doSave = async () => {
  setError('');

  const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);

  // light validation
  if (
    title.trim().length === 0 &&
    tags.length === 0 &&
    notes.trim().length === 0 &&
    combinedThumbs.length === 0
  ) {
    setError('Add at least a title, tag, note, or image.');
    return;
  }

  // Map removed file IDs -> names, so we can filter thumbs by name
  const removedNames = new Set(
    (existingFiles || [])
      .filter(f => removedFileIds.includes(f.id))
      .map(f => f.name)
  );

  // Filter thumbnails so ones for removed files disappear
  const filteredThumbs = combinedThumbs.filter(t => !removedNames.has(t?.name));

  try {
    const res = await onSave({
      title: title.trim(),
      tags,
      notes: notes.trim(),
      images: filteredThumbs,                // ← use filtered thumbs (not combined)
      newFiles: newUploads.map(x => x.file),
      removedFileIds,
    });
    if (res !== false) onClose?.();          // close on success
  } catch (err) {
    console.error(err);
    setError('Save failed. See console.');
  }
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-2 sm:p-4">
      <Card
        className="w-full max-w-[min(700px,calc(100vw-2rem))] max-h-[90vh] flex flex-col"
        style={{ backgroundColor: 'var(--tile-color)' }}
      >
        {/* Header */}
        <CardHeader className="flex items-center justify-between">
          <CardTitle>{mode === 'edit' ? 'Edit Item' : 'Add Inventory Item'}</CardTitle>
        </CardHeader>

        {/* Scrollable body */}
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {/* basics */}
          <div>
            <label className="text-sm mb-1 block">Title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Canon EOS R10" />
          </div>

          <div>
            <label className="text-sm mb-1 block">Tags (comma separated)</label>
            <Input value={tagsText} onChange={e => setTagsText(e.target.value)} placeholder="camera, electronics, insured" />
          </div>

          <div>
            <label className="text-sm mb-1 block">Notes</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5} />
          </div>

          {/* existing attachments */}
          {mode === 'edit' && (existingFiles?.length > 0) && (
            <div>
              <div className="text-sm font-medium mb-2">Existing Attachments</div>
              <div className="flex flex-wrap gap-2">
                {existingFiles.map(f => {
                  const removed = removedFileIds.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      className={`flex items-center gap-2 px-2 py-1 rounded border ${removed ? 'opacity-60' : ''}`}
                      title={removed ? 'Marked for removal' : ''}
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span className={`text-xs ${removed ? 'line-through' : ''}`}>{f.name}</span>
                      {removed ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Undo remove"
                          onClick={() => handleUndoRemoveExistingFile(f.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Remove attachment"
                          onClick={() => handleRemoveExistingFile(f.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              {removedFileIds.length > 0 && (
                <div className="text-xs text-red-500 mt-1">{removedFileIds.length} attachment(s) marked for removal</div>
              )}
            </div>
          )}

          {/* new uploads */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm mb-1 block">Add Files</label>
              <input
                type="file"
                multiple
                accept="image/*,video/*,application/pdf"
                onChange={(e) => processFiles(e.target.files)}
              />
            </div>

            {/* drag & drop zone */}
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              className="mt-2 border border-dashed rounded-md p-4 text-center text-sm text-muted-foreground"
            >
              Drag & drop files here
            </div>

            {newUploads.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {newUploads.map((u, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={u.thumbDataUrl}
                      alt="thumb"
                      className="w-full h-28 object-cover rounded border"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-1 right-1"
                      onClick={() => handleRemoveNewUpload(idx)}
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="text-[10px] mt-1 truncate">{u.file.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* thumbnails to be stored */}
          {combinedThumbs.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Thumbnails (stored in item)</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {combinedThumbs.map((t, i) => (
                  <img key={i} src={t.thumbDataUrl} alt="thumb" className="w-full h-28 object-cover rounded border" />
                ))}
              </div>
            </div>
          )}

          {error && <div className="text-sm text-red-500">{error}</div>}
        </CardContent>

        {/* Footer (outside scroll area, always visible) */}
        <div className="px-6 py-3 border-t bg-[var(--tile-color)]">
          <div className="flex justify-between gap-2">
            {mode === 'edit' && onDelete ? (
              <Button variant="destructive" onClick={onDelete}>Delete Item</Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={doSave} disabled={isBusy}>{isBusy ? 'Processing…' : 'Save'}</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}