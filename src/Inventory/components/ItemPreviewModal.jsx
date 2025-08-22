// src/inventory/components/ItemPreviewModal.jsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { invDb } from '../db';

export default function ItemPreviewModal({ isOpen, item, onClose }) {
  const [entries, setEntries] = useState([]);   // [{id, url, name, mime}]
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!isOpen || !item) { setEntries([]); return; }
      setLoading(true);
      try {
        const files = await invDb.listFiles(item.id); // [{id, name, mime, ...}]
        const out = [];
        for (const f of files) {
          try {
            const url = await invDb.getFileURL(f.id);
            if (url) out.push({ id: f.id, url, name: f.name, mime: f.mime || '' });
          } catch {}
        }

        // Fallback: if no real files, show embedded thumbnails (images only)
        if (out.length === 0 && Array.isArray(item.images)) {
          for (const t of item.images) {
            if (t?.thumbDataUrl) {
              out.push({
                id: `thumb-${Math.random()}`,
                url: t.thumbDataUrl,
                name: t.name || 'thumbnail',
                mime: 'image/jpeg'
              });
            }
          }
        }

        if (alive) setEntries(out);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-2 sm:p-4">
      <Card className="w-full max-w-[min(900px,calc(100vw-2rem))] max-h-[90vh] flex flex-col" style={{ backgroundColor: 'var(--tile-color)' }}>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Preview — {item.title || 'Item'}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && entries.length === 0 && (
            <div className="text-sm text-muted-foreground">No attachments.</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {entries.map((f) => (
              <div key={f.id} className="border rounded-md overflow-hidden">
                {f.mime.startsWith('image/') ? (
                  <img src={f.url} alt={f.name} className="w-full h-auto object-contain bg-black/10" />
                ) : f.mime.startsWith('video/') ? (
                  <video src={f.url} controls className="w-full h-auto bg-black/10" />
                ) : f.mime === 'application/pdf' ? (
                  <iframe
                    title={f.name}
                    src={f.url}
                    className="w-full h-[70vh] bg-white"
                  />
                ) : (
                  <div className="p-4 text-sm">
                    <div className="mb-2">Unsupported preview type (<code>{f.mime || 'unknown'}</code>).</div>
                    <a href={f.url} download={f.name} className="underline text-primary">Download {f.name}</a>
                  </div>
                )}
                <div className="px-2 py-1 text-xs text-muted-foreground truncate">{f.name}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            Tip: On iOS the full-res files live in the app sandbox; this preview reads them via <code>invDb.getFileURL()</code>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}