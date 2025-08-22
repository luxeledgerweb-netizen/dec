export type NodeID = string;

export type InventoryNode =
  | InventoryFolder
  | InventoryItem;

export interface InventoryFolder {
  id: NodeID;
  type: 'folder';
  name: string;
  parentId: NodeID | null;       // null only for the root
  childrenOrder: NodeID[];       // visual order of children
  createdAt: number;
  updatedAt: number;
}

export interface InventoryItem {
  id: NodeID;
  type: 'item';
  name: string;
  parentId: NodeID;              // must belong to a folder
  tags?: string[];
  notes?: string;
  // Phase 2+: thumbs + originals
  thumbs?: { w: number; h: number; dataUrl: string }[];
  images?: {
    id: string;
    hash: string;                // e.g., sha256:abcd...
    mime: string;
    size: number;
    width?: number;
    height?: number;
  }[];
  createdAt: number;
  updatedAt: number;
}

export interface InventoryStateV2 {
  version: 2;
  nodes: Record<NodeID, InventoryNode>; // dictionary for O(1) lookup
  rootId: NodeID;                        // the single root folder id
}