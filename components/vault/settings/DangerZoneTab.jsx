import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';

export default function DangerZoneTab({ onWipeVault, isWiping }) {
  return (
    <div className="space-y-6">
      <div className="p-4 border border-destructive rounded-lg">
        <h3 className="font-semibold text-destructive">Clear Vault</h3>
        <p className="text-sm text-muted-foreground my-2">
          This action is irreversible. It will permanently delete all passwords, secure notes, and card credentials stored in the vault.
        </p>
        <Button variant="destructive" onClick={onWipeVault} disabled={isWiping}>
          {isWiping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Wipe All Vault Data
        </Button>
      </div>
    </div>
  );
}