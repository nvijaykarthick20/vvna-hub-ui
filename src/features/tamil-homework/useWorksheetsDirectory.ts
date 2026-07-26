import { useEffect, useState } from 'react';
import { loadDirectoryHandle } from './directoryHandleStore';
import { chooseWorksheetsDirectory, getPermissionState, requestPermission } from './worksheetStorage';

export type DirectoryStatus =
  | 'checking'
  | 'unsupported'
  | 'no-directory'
  | 'needs-permission'
  | 'ready'
  | 'error';

interface UseWorksheetsDirectoryResult {
  status: DirectoryStatus;
  handle: FileSystemDirectoryHandle | null;
  errorMessage: string | null;
  chooseDirectory: () => Promise<void>;
  grantPermission: () => Promise<void>;
}

function messageFor(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong accessing the folder.';
}

/** Resolves where Tamil worksheets are stored: the persisted directory
 * handle (see directoryHandleStore.ts) plus its live permission state.
 * Every page that needs the folder mounts this independently rather than
 * sharing it through a context/store - see ARCHITECTURE.md's "no global
 * state library" rule. */
export function useWorksheetsDirectory(): UseWorksheetsDirectoryResult {
  const [status, setStatus] = useState<DirectoryStatus>('checking');
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!('showDirectoryPicker' in window)) {
        if (!cancelled) setStatus('unsupported');
        return;
      }

      const stored = await loadDirectoryHandle();
      if (cancelled) return;
      if (!stored) {
        setStatus('no-directory');
        return;
      }

      const permission = await getPermissionState(stored);
      if (cancelled) return;
      setHandle(stored);
      setStatus(permission === 'granted' ? 'ready' : 'needs-permission');
    }

    init().catch((err: unknown) => {
      if (cancelled) return;
      setErrorMessage(messageFor(err));
      setStatus('error');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function chooseDirectory() {
    try {
      const picked = await chooseWorksheetsDirectory();
      setHandle(picked);
      setErrorMessage(null);
      setStatus('ready');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setErrorMessage(messageFor(err));
      setStatus('error');
    }
  }

  async function grantPermission() {
    if (!handle) return;
    try {
      const result = await requestPermission(handle);
      if (result === 'granted') {
        setErrorMessage(null);
        setStatus('ready');
      } else {
        setErrorMessage('Access was not granted. Choose the folder again to continue.');
      }
    } catch (err) {
      setErrorMessage(messageFor(err));
      setStatus('error');
    }
  }

  return { status, handle, errorMessage, chooseDirectory, grantPermission };
}
