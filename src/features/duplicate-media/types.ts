export type DuplicateMatchMode = 'exact' | 'visual';
export type MediaKind = 'image' | 'video';
export type DuplicateGroupKind = MediaKind | 'mixed';

export interface ScannedMedia {
  /** Relative path within the folder selected by the user. */
  id: string;
  name: string;
  relativePath: string;
  size: number;
  lastModified: number;
  type: string;
  kind: MediaKind;
  file: File;
  fileHandle: FileSystemFileHandle;
  parentHandle: FileSystemDirectoryHandle;
  width?: number;
  height?: number;
  duration?: number;
}

export interface DuplicateGroup {
  id: string;
  mode: DuplicateMatchMode;
  kind: DuplicateGroupKind;
  files: ScannedMedia[];
}

export type ScanStage = 'discovering' | 'hashing' | 'extracting' | 'comparing';

export interface ScanProgress {
  stage: ScanStage;
  processed: number;
  total: number | null;
  currentPath: string | null;
}

export interface DuplicateScanResult {
  groups: DuplicateGroup[];
  scannedFileCount: number;
  scannedImageCount: number;
  scannedVideoCount: number;
  skippedFileCount: number;
}

export interface DeletionIssue {
  file: ScannedMedia;
  reason: string;
}

export interface DeletionResult {
  deletedIds: string[];
  deletedBytes: number;
  issues: DeletionIssue[];
}
