import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { SelectableCard } from '@/components/ui/SelectableCard';
import {
  chooseSuggestedKeeper,
  deleteSelectedMedia,
  formatFileSize,
  scanDuplicateMedia,
  suggestedDuplicateIds,
} from './duplicateMedia';
import type {
  DeletionIssue,
  DuplicateGroup,
  DuplicateMatchMode,
  DuplicateScanResult,
  ScannedMedia,
  ScanProgress,
} from './types';

type ScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

const MODE_DESCRIPTION: Record<DuplicateMatchMode, string> = {
  exact:
    'Safest: finds photos and videos with identical bytes, even when their names are different.',
  visual:
    'Strict visual check: compares photos and sampled video frames. Review every match before deleting.',
};

function progressLabel(progress: ScanProgress | null): string {
  if (!progress) return 'Preparing scan…';
  switch (progress.stage) {
    case 'discovering':
      return `Finding photos and videos… ${progress.processed} found`;
    case 'hashing':
      return progress.total === 0
        ? 'Checking file contents…'
        : `Checking file contents… ${progress.processed} of ${progress.total}`;
    case 'extracting':
      return `Extracting visual fingerprints… ${progress.processed} of ${progress.total}`;
    case 'comparing':
      return 'Comparing visual fingerprints…';
  }
}

function formatDuration(seconds: number): string {
  const roundedSeconds = Math.round(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  return `${minutes}:${String(roundedSeconds % 60).padStart(2, '0')}`;
}

function MediaPreview({ media }: { media: ScannedMedia }) {
  const [source] = useState(() => URL.createObjectURL(media.file));
  const [failed, setFailed] = useState(false);

  useEffect(() => () => URL.revokeObjectURL(source), [source]);

  return (
    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-paper">
      {!failed ? (
        media.kind === 'video' ? (
          <video
            src={source}
            aria-label={`Preview of ${media.name}`}
            className="h-full w-full object-contain"
            controls
            muted
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
          />
        ) : (
          <img
            src={source}
            alt={`Preview of ${media.name}`}
            className="h-full w-full object-contain"
            onError={() => setFailed(true)}
          />
        )
      ) : (
        <span className="px-3 text-center text-sm text-ink-soft">Preview unavailable</span>
      )}
    </div>
  );
}

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  index: number;
  selectedIds: Set<string>;
  deleting: boolean;
  onToggle: (fileId: string) => void;
  onSelectGroup: (group: DuplicateGroup) => void;
}

function DuplicateGroupCard({
  group,
  index,
  selectedIds,
  deleting,
  onToggle,
  onSelectGroup,
}: DuplicateGroupCardProps) {
  const keeper = chooseSuggestedKeeper(group.files);
  const selectedInGroup = group.files.filter((file) => selectedIds.has(file.id)).length;
  const groupKind =
    group.kind === 'mixed' ? 'Mixed media' : group.kind === 'video' ? 'Video' : 'Photo';

  return (
    <section className="rounded-2xl border border-paper-line bg-white/70 p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-3 border-b border-paper-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-semibold text-ink">Group {index + 1}</h2>
            <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {groupKind} · {group.mode === 'exact' ? 'Exact copies' : 'Visual match'}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {group.files.length} files · choose what to delete and keep at least one copy
          </p>
        </div>
        <Button variant="secondary" onClick={() => onSelectGroup(group)} disabled={deleting}>
          Select duplicates
        </Button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.files.map((media) => {
          const selected = selectedIds.has(media.id);
          const isLastKeeper = !selected && selectedInGroup === group.files.length - 1;
          const isSuggestedKeeper = keeper.id === media.id;

          return (
            <div
              key={media.id}
              className={`relative flex min-w-0 flex-col gap-3 rounded-xl border-2 p-3 transition-colors ${
                selected
                  ? 'border-kumkum bg-kumkum/5'
                  : 'border-paper-line bg-white hover:border-chalkboard/40'
              } focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-turmeric-deep`}
            >
              <MediaPreview media={media} />
              <label
                className={`flex min-w-0 items-start gap-3 ${isLastKeeper ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={deleting || isLastKeeper}
                  onChange={() => onToggle(media.id)}
                  className="mt-1 h-4 w-4 shrink-0 accent-chalkboard"
                  aria-label={`Delete ${media.relativePath}`}
                />
                <span className="min-w-0">
                  <span className="block break-words font-semibold text-ink">{media.name}</span>
                  <span className="mt-1 block break-all text-xs text-ink-soft">
                    {media.relativePath}
                  </span>
                  <span className="mt-2 block text-xs text-ink-soft">
                    {formatFileSize(media.size)}
                    {media.width && media.height ? ` · ${media.width} × ${media.height}` : ''}
                    {media.duration ? ` · ${formatDuration(media.duration)}` : ''}
                  </span>
                </span>
              </label>

              <span
                className={`absolute right-5 top-5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  selected ? 'bg-kumkum text-white' : 'bg-chalkboard text-chalk'
                }`}
              >
                {selected ? 'Delete' : isSuggestedKeeper ? 'Suggested keeper' : 'Keep'}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function describeIssues(issues: DeletionIssue[]): string {
  if (issues.length === 0) return '';
  const first = issues[0];
  const remainder = issues.length - 1;
  return `${first.file.relativePath}: ${first.reason}${
    remainder > 0 ? ` (${remainder} more file${remainder === 1 ? '' : 's'} not deleted)` : ''
  }`;
}

export function DuplicateMediaPage() {
  const supported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  const [mode, setMode] = useState<DuplicateMatchMode>('exact');
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [result, setResult] = useState<DuplicateScanResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [scanController, setScanController] = useState<AbortController | null>(null);

  useEffect(() => () => scanController?.abort(), [scanController]);

  async function startScan(handle: FileSystemDirectoryHandle) {
    const controller = new AbortController();
    setScanController(controller);
    setStatus('scanning');
    setProgress(null);
    setResult(null);
    setSelectedIds(new Set());
    setNotice(null);
    setError(null);

    try {
      const scanResult = await scanDuplicateMedia(handle, mode, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      if (controller.signal.aborted) return;
      setResult(scanResult);
      setStatus('complete');
      setProgress(null);
    } catch (scanError) {
      if (scanError instanceof DOMException && scanError.name === 'AbortError') {
        setStatus('idle');
        setNotice('Scan cancelled. No files were changed.');
      } else {
        setStatus('error');
        setError(
          scanError instanceof Error
            ? scanError.message
            : 'The selected folder could not be scanned.',
        );
      }
    } finally {
      setScanController(null);
    }
  }

  async function chooseFolder() {
    if (!supported) return;
    try {
      const handle = await window.showDirectoryPicker({
        id: 'duplicate-media-cleaner',
        mode: 'readwrite',
        startIn: 'pictures',
      });
      setDirectoryHandle(handle);
      await startScan(handle);
    } catch (pickerError) {
      if (pickerError instanceof DOMException && pickerError.name === 'AbortError') return;
      setStatus('error');
      setError(
        pickerError instanceof Error ? pickerError.message : 'The folder could not be opened.',
      );
    }
  }

  function changeMode(nextMode: DuplicateMatchMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setResult(null);
    setSelectedIds(new Set());
    setNotice(directoryHandle ? 'Matching mode changed. Scan the folder again.' : null);
    setError(null);
    setStatus('idle');
  }

  function selectGroupDuplicates(group: DuplicateGroup) {
    const keeper = chooseSuggestedKeeper(group.files);
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const image of group.files) {
        if (image.id === keeper.id) next.delete(image.id);
        else next.add(image.id);
      }
      return next;
    });
  }

  function toggleImage(fileId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }

  async function deleteSelection() {
    if (!result || selectedIds.size === 0) return;
    const leavesKeeperInEveryGroup = result.groups.every((group) =>
      group.files.some((image) => !selectedIds.has(image.id)),
    );
    if (!leavesKeeperInEveryGroup) {
      setError('At least one file must be kept in every duplicate group.');
      return;
    }

    const selectedFiles = result.groups
      .flatMap((group) => group.files)
      .filter((image) => selectedIds.has(image.id));
    const selectedBytes = selectedFiles.reduce((sum, image) => sum + image.size, 0);
    const confirmed = window.confirm(
      `Permanently delete ${selectedFiles.length} selected file${selectedFiles.length === 1 ? '' : 's'} (${formatFileSize(selectedBytes)})?\n\nAt least one copy in each group will be kept. This action may bypass the Recycle Bin and cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    setNotice(null);
    const deletion = await deleteSelectedMedia(selectedFiles);
    const deleted = new Set(deletion.deletedIds);
    const deletedImageCount = selectedFiles.filter(
      (media) => deleted.has(media.id) && media.kind === 'image',
    ).length;
    const deletedVideoCount = deleted.size - deletedImageCount;
    setResult((current) => {
      if (!current) return current;
      const groups = current.groups
        .map((group) => ({
          ...group,
          files: group.files.filter((image) => !deleted.has(image.id)),
        }))
        .filter((group) => group.files.length > 1);
      return {
        ...current,
        groups,
        scannedFileCount: Math.max(0, current.scannedFileCount - deleted.size),
        scannedImageCount: Math.max(0, current.scannedImageCount - deletedImageCount),
        scannedVideoCount: Math.max(0, current.scannedVideoCount - deletedVideoCount),
      };
    });
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of deleted) next.delete(id);
      return next;
    });

    const issueDescription = describeIssues(deletion.issues);
    if (deletion.deletedIds.length > 0) {
      setNotice(
        `Deleted ${deletion.deletedIds.length} file${
          deletion.deletedIds.length === 1 ? '' : 's'
        } and freed ${formatFileSize(deletion.deletedBytes)}.${
          issueDescription ? ` ${issueDescription}` : ''
        }`,
      );
    } else if (issueDescription) {
      setError(`No files were deleted. ${issueDescription}`);
    }
    setDeleting(false);
  }

  const selectedFiles =
    result?.groups.flatMap((group) => group.files).filter((image) => selectedIds.has(image.id)) ??
    [];
  const selectedBytes = selectedFiles.reduce((sum, image) => sum + image.size, 0);
  const duplicateCount =
    result?.groups.reduce((sum, group) => sum + group.files.length - 1, 0) ?? 0;
  const suggestedIds = result ? suggestedDuplicateIds(result.groups) : new Set<string>();
  const recoverableBytes =
    result?.groups
      .flatMap((group) => group.files)
      .filter((image) => suggestedIds.has(image.id))
      .reduce((sum, image) => sum + image.size, 0) ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link to="/" className="font-semibold text-chalkboard">
          &larr; Back to Home
        </Link>
        <p className="mt-4 font-body text-sm font-semibold uppercase tracking-widest text-turmeric-deep">
          Duplicate Media Cleaner
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
          Find duplicate photos and videos
        </h1>
        <p className="mt-3 max-w-3xl text-lg text-ink-soft">
          Choose a folder to scan it and all of its subfolders. Everything stays on this device;
          photos, videos, and fingerprints are never uploaded.
        </p>
      </div>

      {!supported ? (
        <div className="rounded-2xl border border-paper-line bg-white/70 p-6 shadow-card">
          <h2 className="font-display text-xl font-semibold text-ink">Chrome or Edge required</h2>
          <p className="mt-2 text-ink-soft">
            This browser cannot grant the folder access needed to scan and remove local files.
          </p>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-paper-line bg-white/70 p-5 shadow-card sm:p-6">
            <fieldset>
              <legend className="font-display text-xl font-semibold text-ink">Match type</legend>
              <div role="radiogroup" className="mt-3 grid gap-3 sm:grid-cols-2">
                <SelectableCard
                  label="Exact copies"
                  sublabel="Identical file contents · recommended"
                  selected={mode === 'exact'}
                  onSelect={() => changeMode('exact')}
                  disabled={status === 'scanning' || deleting}
                />
                <SelectableCard
                  label="Visual copies"
                  sublabel="Resized photos or re-encoded videos"
                  selected={mode === 'visual'}
                  onSelect={() => changeMode('visual')}
                  disabled={status === 'scanning' || deleting}
                />
              </div>
              <p className="mt-3 text-sm text-ink-soft">{MODE_DESCRIPTION[mode]}</p>
            </fieldset>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-paper-line pt-5">
              <Button onClick={chooseFolder} disabled={status === 'scanning' || deleting}>
                {directoryHandle ? 'Choose another folder' : 'Choose folder and scan'}
              </Button>
              {directoryHandle && status !== 'scanning' && (
                <Button
                  variant="secondary"
                  onClick={() => startScan(directoryHandle)}
                  disabled={deleting}
                >
                  Scan {directoryHandle.name} again
                </Button>
              )}
              {status === 'scanning' && scanController && (
                <Button variant="secondary" onClick={() => scanController.abort()}>
                  Cancel scan
                </Button>
              )}
              {directoryHandle && (
                <span className="text-sm text-ink-soft">Folder: {directoryHandle.name}</span>
              )}
            </div>
          </section>

          {status === 'scanning' && (
            <div
              className="rounded-2xl border border-paper-line bg-white/70 p-6 shadow-card"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-ink">{progressLabel(progress)}</p>
                {progress?.total && progress.total > 0 ? (
                  <span className="text-sm text-ink-soft">
                    {Math.round((progress.processed / progress.total) * 100)}%
                  </span>
                ) : null}
              </div>
              <progress
                className="mt-3 h-2 w-full overflow-hidden rounded-full accent-turmeric-deep"
                max={progress?.total && progress.total > 0 ? progress.total : 1}
                value={progress?.total && progress.total > 0 ? progress.processed : undefined}
              />
              {progress?.currentPath && (
                <p className="mt-2 truncate text-xs text-ink-soft">{progress.currentPath}</p>
              )}
            </div>
          )}

          {notice && (
            <p
              className="rounded-xl border border-paper-line bg-white/70 px-4 py-3 text-chalkboard"
              role="status"
            >
              {notice}
            </p>
          )}
          {error && (
            <p
              className="rounded-xl border border-kumkum/40 bg-kumkum/5 px-4 py-3 text-kumkum"
              role="alert"
            >
              {error}
            </p>
          )}

          {status === 'complete' && result && (
            <>
              <section className="grid gap-4 sm:grid-cols-3" aria-label="Scan summary">
                <div className="rounded-xl border border-paper-line bg-white/70 p-4">
                  <p className="text-sm text-ink-soft">Media scanned</p>
                  <p className="mt-1 font-display text-3xl font-semibold text-ink">
                    {result.scannedFileCount}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {result.scannedImageCount} photos · {result.scannedVideoCount} videos
                  </p>
                </div>
                <div className="rounded-xl border border-paper-line bg-white/70 p-4">
                  <p className="text-sm text-ink-soft">Duplicate copies</p>
                  <p className="mt-1 font-display text-3xl font-semibold text-ink">
                    {duplicateCount}
                  </p>
                </div>
                <div className="rounded-xl border border-paper-line bg-white/70 p-4">
                  <p className="text-sm text-ink-soft">Potential space</p>
                  <p className="mt-1 font-display text-3xl font-semibold text-ink">
                    {formatFileSize(recoverableBytes)}
                  </p>
                </div>
              </section>

              {result.skippedFileCount > 0 && (
                <p className="text-sm text-ink-soft">
                  {result.skippedFileCount} media file
                  {result.skippedFileCount === 1 ? ' was' : 's were'} skipped because it could not
                  be read or decoded by this browser.
                </p>
              )}

              {result.groups.length === 0 ? (
                <div className="rounded-2xl border border-paper-line bg-white/70 p-8 text-center shadow-card">
                  <h2 className="font-display text-2xl font-semibold text-ink">
                    No duplicate media found
                  </h2>
                  <p className="mt-2 text-ink-soft">
                    Nothing was deleted. Try visual matching if exact matching found no copies.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="sticky top-3 z-20 flex flex-col gap-4 rounded-2xl border border-paper-line bg-paper/95 p-4 shadow-card backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:p-5"
                    role="toolbar"
                    aria-label="Duplicate selection actions"
                  >
                    <div>
                      <p className="font-semibold text-ink">
                        {selectedFiles.length} selected · {formatFileSize(selectedBytes)}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        “Select all duplicate copies” keeps the best candidate in every group.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => setSelectedIds(suggestedDuplicateIds(result.groups))}
                        disabled={deleting}
                      >
                        Select all duplicate copies
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setSelectedIds(new Set())}
                        disabled={selectedIds.size === 0 || deleting}
                      >
                        Clear selection
                      </Button>
                      <Button
                        variant="danger"
                        onClick={deleteSelection}
                        disabled={selectedFiles.length === 0 || deleting}
                      >
                        {deleting ? 'Deleting…' : 'Delete selected'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    {result.groups.map((group, index) => (
                      <DuplicateGroupCard
                        key={group.id}
                        group={group}
                        index={index}
                        selectedIds={selectedIds}
                        deleting={deleting}
                        onToggle={toggleImage}
                        onSelectGroup={selectGroupDuplicates}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
