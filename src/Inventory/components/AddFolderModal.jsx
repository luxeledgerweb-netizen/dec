// src/inventory/components/AddFolderModal.jsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AddFolderModal({
  isOpen,
  onClose,
  onSave,          // (name: string) => void
  initialName = '',  // prefill text when renaming
  title = 'New Folder'
}) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) setName(initialName || '');
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-2 sm:p-4">
      <Card className="w-full max-w-[min(700px,calc(100vw-2rem))] max-h-[90vh] flex flex-col" style={{ backgroundColor: 'var(--tile-color)' }}>
        <CardHeader className="sticky top-0 z-10 bg-[var(--tile-color)]/95 backdrop-blur border-b">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="text-sm mb-1 block">Folder name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Documents" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => {
                const trimmed = name.trim();
                if (!trimmed) return;
                onSave(trimmed); // send plain string
              }}
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}