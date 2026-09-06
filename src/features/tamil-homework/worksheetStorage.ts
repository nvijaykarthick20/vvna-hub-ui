import { saveDirectoryHandle } from './directoryHandleStore';
import { isTamilWorksheet, type TamilWorksheet, type TamilWorksheetInput } from './types';

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/** Opens the native folder picker and remembers the chosen folder for next
 * time. Throws `DOMException('AbortError')` if the user cancels the picker
 * - callers should swallow that rather than treat it as a failure. */
export async function chooseWorksheetsDirectory(): Promise<FileSystemDirectoryHandle> {
  const handle = await window.showDirectoryPicker({ id: 'tamil-homework', mode: 'readwrite' });
  await saveDirectoryHandle(handle);
  return handle;
}

export function getPermissionState(handle: FileSystemDirectoryHandle): Promise<PermissionState> {
  return handle.queryPermission({ mode: 'readwrite' });
}

export function requestPermission(handle: FileSystemDirectoryHandle): Promise<PermissionState> {
  return handle.requestPermission({ mode: 'readwrite' });
}

/** Reads every worksheet JSON file in the folder. A file that isn't valid
 * JSON or doesn't match the worksheet shape is skipped rather than thrown -
 * one corrupt/foreign file shouldn't break the whole list. Sorted with the
 * most recently updated worksheet first. */
export async function listWorksheets(handle: FileSystemDirectoryHandle): Promise<TamilWorksheet[]> {
  const worksheets: TamilWorksheet[] = [];

  for await (const [name, entry] of handle.entries()) {
    if (entry.kind !== 'file' || !name.endsWith('.json')) continue;
    try {
      const file = await (entry as FileSystemFileHandle).getFile();
      const parsed: unknown = JSON.parse(await file.text());
      if (isTamilWorksheet(parsed)) worksheets.push(parsed);
    } catch {
      continue;
    }
  }

  return worksheets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveWorksheet(
  handle: FileSystemDirectoryHandle,
  input: TamilWorksheetInput,
): Promise<TamilWorksheet> {
  const now = new Date().toISOString();
  const worksheet: TamilWorksheet = {
    id: crypto.randomUUID(),
    worksheetFor: input.worksheetFor,
    title: input.title,
    text: input.text,
    textRuns: input.textRuns,
    textSize: input.textSize,
    createdAt: now,
    updatedAt: now,
  };

  const fileHandle = await handle.getFileHandle(`${worksheet.id}.json`, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(worksheet, null, 2));
  await writable.close();

  return worksheet;
}

/** Updates a worksheet in place, reusing its existing `id`/`createdAt` and
 * `<uuid>.json` filename so the edit overwrites the same file rather than
 * creating a new one. */
export async function updateWorksheet(
  handle: FileSystemDirectoryHandle,
  existing: TamilWorksheet,
  input: TamilWorksheetInput,
): Promise<TamilWorksheet> {
  const worksheet: TamilWorksheet = {
    ...existing,
    worksheetFor: input.worksheetFor,
    title: input.title,
    text: input.text,
    textRuns: input.textRuns,
    textSize: input.textSize,
    updatedAt: new Date().toISOString(),
  };

  const fileHandle = await handle.getFileHandle(`${worksheet.id}.json`, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(worksheet, null, 2));
  await writable.close();

  return worksheet;
}

/** Removes a worksheet's `<uuid>.json` file from the folder. */
export async function deleteWorksheet(
  handle: FileSystemDirectoryHandle,
  worksheet: TamilWorksheet,
): Promise<void> {
  await handle.removeEntry(`${worksheet.id}.json`);
}
