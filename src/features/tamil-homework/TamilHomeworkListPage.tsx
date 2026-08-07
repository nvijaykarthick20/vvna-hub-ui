import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useWorksheetsDirectory } from './useWorksheetsDirectory';
import { deleteWorksheet, listWorksheets } from './worksheetStorage';
import type { TamilWorksheet } from './types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface WorksheetCardProps {
  worksheet: TamilWorksheet;
  deleting: boolean;
  onDelete: (worksheet: TamilWorksheet) => void;
}

function WorksheetCard({ worksheet, deleting, onDelete }: WorksheetCardProps) {
  const navigate = useNavigate();
  const updated = formatDate(worksheet.updatedAt);
  const created = formatDate(worksheet.createdAt);

  function handleDeleteClick() {
    if (window.confirm(`Delete "${worksheet.title}"? This can't be undone.`)) {
      onDelete(worksheet);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-paper-line bg-white/70 p-5 shadow-card">
      <div className="flex flex-col items-start gap-1">
        <h2 className="font-display text-xl font-semibold text-ink">{worksheet.title}</h2>
        <p className="text-sm text-ink-soft">
          For: {worksheet.worksheetFor} &middot; Updated {updated}
          {created !== updated && ` · Created ${created}`}
        </p>
        <p className="mt-1 line-clamp-1 text-sm text-ink-soft/80">{worksheet.text}</p>
      </div>

      <div className="flex shrink-0 gap-3">
        <Button
          variant="secondary"
          onClick={() => navigate('/tamil-homework/edit', { state: worksheet })}
          disabled={deleting}
        >
          Edit
        </Button>
        <Button
          variant="secondary"
          className="border-kumkum text-kumkum hover:bg-kumkum/5"
          onClick={handleDeleteClick}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </div>
  );
}

/**
 * Lists worksheets saved in the folder chosen via the File System Access
 * API (see useWorksheetsDirectory / worksheetStorage). Renders a different
 * body per DirectoryStatus rather than guessing - see this folder's
 * CLAUDE.md for why a directory handle can't always be used immediately.
 */
export function TamilHomeworkListPage() {
  const navigate = useNavigate();
  const { status, handle, errorMessage, chooseDirectory, grantPermission } =
    useWorksheetsDirectory();
  const [worksheets, setWorksheets] = useState<TamilWorksheet[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'ready' || !handle) return;
    let cancelled = false;

    listWorksheets(handle)
      .then((result) => {
        if (!cancelled) setWorksheets(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setListError(err instanceof Error ? err.message : 'Could not read worksheets.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [status, handle]);

  async function handleDelete(worksheet: TamilWorksheet) {
    if (!handle) return;
    setDeletingId(worksheet.id);
    setListError(null);
    try {
      await deleteWorksheet(handle, worksheet);
      setWorksheets((prev) => prev?.filter((w) => w.id !== worksheet.id) ?? prev);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Could not delete the worksheet.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link to="/" className="font-semibold text-chalkboard">
          &larr; Back to Home
        </Link>
        <p className="mt-4 font-body text-sm font-semibold uppercase tracking-widest text-turmeric-deep">
          Tamil Homework
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
          தமிழ் வீட்டுப்பாடம்
        </h1>
      </div>

      {status === 'checking' && <p className="text-ink-soft">Checking folder access&hellip;</p>}

      {status === 'unsupported' && (
        <div className="rounded-2xl border border-paper-line bg-white/70 p-6 shadow-card">
          <p className="text-ink">
            This browser doesn&apos;t support saving worksheets as files. Try Chrome or Edge.
          </p>
        </div>
      )}

      {(status === 'no-directory' || status === 'error') && (
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-paper-line bg-white/70 p-6 shadow-card">
          <p className="text-ink">Choose a folder on your computer to store Tamil worksheets.</p>
          {errorMessage && <p className="text-sm text-kumkum">{errorMessage}</p>}
          <Button onClick={chooseDirectory}>Choose folder</Button>
        </div>
      )}

      {status === 'needs-permission' && (
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-paper-line bg-white/70 p-6 shadow-card">
          <p className="text-ink">
            Allow this app to access your Tamil worksheets folder again to continue.
          </p>
          {errorMessage && <p className="text-sm text-kumkum">{errorMessage}</p>}
          <div className="flex flex-wrap gap-3">
            <Button onClick={grantPermission}>Allow access</Button>
            <Button variant="secondary" onClick={chooseDirectory}>
              Choose a different folder
            </Button>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div className="flex flex-col gap-6">
          <div>
            <Button onClick={() => navigate('/tamil-homework/new')}>Add new work</Button>
          </div>

          {listError && <p className="text-sm text-kumkum">{listError}</p>}

          {worksheets === null && !listError && (
            <p className="text-ink-soft">Loading worksheets&hellip;</p>
          )}

          {worksheets !== null && worksheets.length === 0 && (
            <p className="text-ink-soft">No worksheets yet - add your first one above.</p>
          )}

          {worksheets !== null && worksheets.length > 0 && (
            <div className="flex flex-col gap-4">
              {worksheets.map((worksheet) => (
                <WorksheetCard
                  key={worksheet.id}
                  worksheet={worksheet}
                  deleting={deletingId === worksheet.id}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
