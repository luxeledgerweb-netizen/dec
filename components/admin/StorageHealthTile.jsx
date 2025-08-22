import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { idbLoad } from '@/components/utils/storageShim';
import { localDb } from '@/components/utils/LocalDb';
import { invDb } from '../../inventory/db';

function barColor(pct) {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-orange-500';
  if (pct >= 50) return 'bg-yellow-500';
  return 'bg-green-500';
}

// Small helper (same logic as LocalDb’s guarded mirror)
function tryMirrorToLocalStorage(json, enable = true) {
  const KEY = 'luxeLedgerData';
  if (!enable) {
    try { localStorage.removeItem(KEY); } catch {}
    return { ok: true, mb: 0, mirrored: false, reason: 'disabled' };
  }
  try {
    const bytes = new Blob([json]).size;
    const LIMIT = 4.8 * 1024 * 1024; // ~4.8MB soft cap
    if (bytes < LIMIT) {
      localStorage.setItem(KEY, json);
      return { ok: true, mb: +(bytes / 1024 / 1024).toFixed(2), mirrored: true };
    } else {
      localStorage.removeItem(KEY);
      console.info('Startup cache skipped (too large); will boot from IndexedDB.');
      return { ok: true, mb: +(bytes / 1024 / 1024).toFixed(2), mirrored: false, reason: 'too_large' };
    }
  } catch (err) {
    console.info('Startup cache write failed; will boot from IndexedDB.', err?.message || err);
    return { ok: false, mb: 0, mirrored: false, reason: 'exception' };
  }
}

export default function StorageHealthTile() {
  // Purely UX: pick a “soft cap” so the bar is meaningful
  const SOFT_IDB_CAP_MB = 250;		// existing App Data cap
  const INVENTORY_SOFT_CAP_MB = 10240;   // 10GB for Inventory Files

  const [idbMb, setIdbMb] = useState(null);
  const [idbPct, setIdbPct] = useState(0);
  const [mirrorActive, setMirrorActive] = useState(false);
  const [mirrorMb, setMirrorMb] = useState(0);
  const [enableStartupCache, setEnableStartupCache] = useState(true);
  const [working, setWorking] = useState(false);
  const [invFilesMb, setInvFilesMb] = useState(0);
  const [invFilesCount, setInvFilesCount] = useState(0);

  // Load initial values (IDB size, mirror size, and setting)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) AppSettings toggle
      try {
        const app = localDb.list('AppSettings')[0];
        // default = true unless explicitly false
        const enabled = app?.enableStartupCache !== false;
        if (!cancelled) setEnableStartupCache(enabled);
      } catch {}

      // 2) IndexedDB size (source of truth)
      try {
        const idbData = await idbLoad();
        let idbSizeMb = 0;
        if (idbData && typeof idbData === 'object') {
          const json = JSON.stringify(idbData);
          idbSizeMb = new Blob([json]).size / 1024 / 1024;
        }
        if (!cancelled) {
          setIdbMb(Number(idbSizeMb.toFixed(2)));
          setIdbPct(Math.min(100, (idbSizeMb / SOFT_IDB_CAP_MB) * 100));
        }
      } catch {
        if (!cancelled) {
          setIdbMb(0);
          setIdbPct(0);
        }
      }

// 2b) Inventory 'files' store (full-res blobs) — sum sizes (with raw IDB fallback)
try {
  let all = [];
  if (invDb?.listAllFileMeta) {
    all = await invDb.listAllFileMeta();
  }

  // Fallback if helper missing OR returned empty (e.g., dev builds)
  if (!all || all.length === 0) {
    const open = (name) =>
      new Promise((res, rej) => {
        const r = indexedDB.open(name);
        r.onerror = () => rej(r.error);
        r.onsuccess = () => res(r.result);
      });
    const db = await open('inventory-v1');
    const tx = db.transaction(['files'], 'readonly');
    all = await new Promise((res, rej) => {
      const req = tx.objectStore('files').getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  }

  const bytes = (all || []).reduce(
    (s, f) => s + (f?.size || f?.blob?.size || 0),
    0
  );

  if (!cancelled) {
    setInvFilesMb(Number((bytes / 1024 / 1024).toFixed(2)));
    setInvFilesCount((all || []).length);
  }
} catch {
  if (!cancelled) {
    setInvFilesMb(0);
    setInvFilesCount(0);
  }
}

      // 3) Startup mirror presence/size
      try {
        const raw = localStorage.getItem('luxeLedgerData');
        const active = !!raw;
        let lsMb = 0;
        if (raw) lsMb = new Blob([raw]).size / 1024 / 1024;
        if (!cancelled) {
          setMirrorActive(active);
          setMirrorMb(Number(lsMb.toFixed(2)));
        }
      } catch {
        if (!cancelled) {
          setMirrorActive(false);
          setMirrorMb(0);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const status =
    idbMb == null ? '…' :
    idbMb >= SOFT_IDB_CAP_MB * 0.9 ? 'CRITICAL' :
    idbMb >= SOFT_IDB_CAP_MB * 0.7 ? 'HIGH' :
    idbMb >= SOFT_IDB_CAP_MB * 0.5 ? 'ELEVATED' : 'OK';

  const statusClass = {
    '…': 'text-muted-foreground',
    'OK': 'text-green-600',
    'ELEVATED': 'text-amber-600',
    'HIGH': 'text-orange-600',
    'CRITICAL': 'text-red-600',
  }[status];

  const clearStartupCache = () => {
    try {
      localStorage.removeItem('luxeLedgerData');
      setMirrorActive(false);
      setMirrorMb(0);
    } catch {}
  };

  const rebuildStartupCache = async () => {
    if (!enableStartupCache) return;
    setWorking(true);
    try {
      // Pull current in-memory DB (already synced to IDB via LocalDb)
      const db = localDb.getData();
      const json = JSON.stringify(db);
      const result = tryMirrorToLocalStorage(json, true);
      if (result.mirrored) {
        setMirrorActive(true);
        setMirrorMb(result.mb);
      } else {
        // not mirrored (too big or failed)
        setMirrorActive(false);
        setMirrorMb(0);
      }
    } finally {
      setWorking(false);
    }
  };

  const onToggleStartupCache = async (checked) => {
    setEnableStartupCache(checked);
    // persist to AppSettings so it survives backups/imports
    try {
      localDb.update('AppSettings', 'settings', { enableStartupCache: checked });
    } catch {
      // if your AppSettings id isn't literally "settings", you can fallback to first record
      const app = localDb.list('AppSettings')[0];
      if (app?.id) localDb.update('AppSettings', app.id, { enableStartupCache: checked });
    }

    if (!checked) {
      // turning OFF: clear mirror right away
      clearStartupCache();
    } else {
      // turning ON: attempt to build mirror now
      await rebuildStartupCache();
    }
  };

return (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0 }}
    className="w-full"
  >
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Storage Health</CardTitle>
        <span className={`text-sm font-medium ${statusClass}`}>{status}</span>
      </CardHeader>

      <CardContent>
        <div className="space-y-5">
          {/* IndexedDB bar (real storage) */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">App Data (IndexedDB)</p>
            <p className="text-sm text-primary">
              <strong>{idbMb == null ? '—' : `${idbMb} MB`}</strong>
              {` of ${SOFT_IDB_CAP_MB} MB (soft cap)`}
            </p>
            <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor(idbPct)}`}
                style={{ width: `${idbPct}%` }}
              />
            </div>
          </div>

          {/* Inventory blobs (IndexedDB) */}
          <div className="mt-4">
            <p className="text-sm font-medium text-muted-foreground">Inventory Files (IndexedDB)</p>
            <p className="text-sm text-primary">
              <strong>{invFilesMb.toFixed(2)} MB</strong>
              {` of 10 GB`}
              <span className="text-muted-foreground">
                {` — ${invFilesCount} file${invFilesCount === 1 ? '' : 's'}`}
              </span>
            </p>
            {(() => {
              const pct = Math.min(100, (invFilesMb / INVENTORY_SOFT_CAP_MB) * 100);
              return (
                <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor(pct)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              );
            })()}
            <p className="mt-1 text-xs text-muted-foreground">
              This measures full-resolution images stored for Inventory items in <code>inventory-v1</code> → <code>files</code>.
            </p>
          </div>

          {/* Startup cache controls */}
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Startup Cache</p>
                <p className="text-sm">
                  {mirrorActive ? (
                    <>
                      <span className="text-green-600 font-medium">Active</span>
                      <span className="text-muted-foreground"> — approx {mirrorMb} MB in localStorage</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      Inactive — app boots from IndexedDB (slightly slower on first load)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="startup-cache-toggle" className="text-sm">Enable</Label>
                <Switch
                  id="startup-cache-toggle"
                  checked={enableStartupCache}
                  onCheckedChange={onToggleStartupCache}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={clearStartupCache} disabled={!mirrorActive}>
                Clear Startup Cache
              </Button>
              <Button variant="outline" onClick={rebuildStartupCache} disabled={!enableStartupCache || working}>
                {working ? 'Rebuilding…' : 'Rebuild Now'}
              </Button>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              The startup cache is a tiny localStorage mirror used only to launch faster. Your real data lives in IndexedDB.
              The toggle and its value are stored in <code>AppSettings</code>, so it’s included in backups.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);
}