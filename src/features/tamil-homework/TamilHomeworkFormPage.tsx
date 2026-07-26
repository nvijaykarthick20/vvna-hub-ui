import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useWorksheetsDirectory } from './useWorksheetsDirectory';
import { saveWorksheet, updateWorksheet } from './worksheetStorage';
import { isTamilWorksheet } from './types';
import { convertTrailingWord, convertWordBeforeCursor } from './tanglishInput';

const fieldClassName =
  'w-full rounded-xl border border-paper-line bg-white/70 px-4 py-3 text-ink placeholder:text-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turmeric-deep';

function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

/**
 * Form for saving a Tamil worksheet - handles both add (`/tamil-homework/new`,
 * no router state) and edit (`/tamil-homework/edit`, existing `TamilWorksheet`
 * passed via router `state` from a `WorksheetCard` click on the list page).
 * Requires a writable directory handle to exist already - redirects to the
 * list page (which owns the folder-picking/permission UI) rather than
 * guessing when it doesn't, same "redirect instead of guessing" convention
 * as ArithmeticQuestionsPage.
 *
 * "Print" here prints the current field values directly (a `hidden
 * print:block` view alongside the `no-print` form), not by navigating to
 * TamilHomeworkPrintPage - navigating away would unmount this page and lose
 * any unsaved edits when the learner comes back.
 *
 * The "Text" field also does live Tanglish -> Tamil transliteration (see
 * `tanglishInput.ts`) - only that field, not "Worksheet for"/"Title".
 */
export function TamilHomeworkFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const existing = isTamilWorksheet(location.state) ? location.state : null;
  const { status, handle } = useWorksheetsDirectory();
  const [worksheetFor, setWorksheetFor] = useState(existing?.worksheetFor ?? '');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [text, setText] = useState(existing?.text ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursorRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== 'checking' && status !== 'ready') {
      navigate('/tamil-homework', { replace: true });
    }
  }, [status, navigate]);

  useLayoutEffect(() => {
    if (pendingCursorRef.current !== null && textareaRef.current) {
      textareaRef.current.setSelectionRange(pendingCursorRef.current, pendingCursorRef.current);
      pendingCursorRef.current = null;
    }
  }, [text]);

  function handleTextChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const converted = convertWordBeforeCursor(e.target.value, e.target.selectionStart);
    if (converted) {
      pendingCursorRef.current = converted.cursor;
      setText(converted.text);
    } else {
      setText(e.target.value);
    }
  }

  function handleTextBlur() {
    setText((prev) => convertTrailingWord(prev));
  }

  const canSave = worksheetFor.trim() !== '' && title.trim() !== '' && text.trim() !== '' && !saving;

  async function handleSave() {
    if (!handle) return;
    setSaving(true);
    setError(null);
    try {
      const input = {
        worksheetFor: worksheetFor.trim(),
        title: title.trim(),
        text: text.trim(),
      };
      if (existing) {
        await updateWorksheet(handle, existing, input);
      } else {
        await saveWorksheet(handle, input);
      }
      navigate('/tamil-homework');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the worksheet.');
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="no-print flex items-start justify-between gap-4">
        <div>
          <Link to="/tamil-homework" className="font-semibold text-chalkboard">
            &larr; Back to Tamil Homework
          </Link>
          <p className="mt-4 font-body text-sm font-semibold uppercase tracking-widest text-turmeric-deep">
            Tamil Homework
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
            {existing ? 'Edit work' : 'Add new work'}
          </h1>
        </div>
        <Button variant="secondary" onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <div className="no-print mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="grid gap-6 rounded-2xl border border-paper-line bg-white/70 p-5 shadow-card sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="worksheet-for" className="font-semibold text-ink">
              Worksheet for
            </label>
            <input
              id="worksheet-for"
              type="text"
              value={worksheetFor}
              onChange={(e) => setWorksheetFor(e.target.value)}
              placeholder="e.g. Anjali"
              className={fieldClassName}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="worksheet-title" className="font-semibold text-ink">
              Title
            </label>
            <input
              id="worksheet-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Week 3 - vocabulary"
              className={fieldClassName}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="worksheet-text" className="font-semibold text-ink">
            Text
          </label>

          {/* A sheet of "paper" on the cream desk background - the textarea
              itself has no border/background of its own so typing feels
              like writing straight onto the page, not filling in a box. */}
          <div className="rounded-sm border border-paper-line bg-white shadow-card">
            <textarea
              ref={textareaRef}
              id="worksheet-text"
              value={text}
              onChange={handleTextChange}
              onBlur={handleTextBlur}
              placeholder="இங்கே பாடத்தை தட்டச்சு செய்யவும்… (தமிழ்நடையில் தட்டச்சு செய்தால் தானாக தமிழில் மாறும்)"
              className="min-h-[28rem] w-full resize-y bg-transparent px-10 py-12 font-body text-lg leading-8 text-ink placeholder:text-ink-soft/70 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-turmeric-deep sm:min-h-[34rem] sm:px-16"
            />
            <p className="border-t border-paper-line px-10 py-2 text-right text-xs text-ink-soft sm:px-16">
              {countWords(text)} words
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-kumkum">{error}</p>}

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Save'}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/tamil-homework')}>
            Cancel
          </Button>
        </div>
      </div>

      {/* Print-only view of the current text (Letter/A4, via the shared
          @page rule in src/index.css) - hidden on screen, shown only under
          print media so the editing controls never end up on paper. Just
          the text, not the title/"worksheet for" - the printed page is
          meant to be worked on, not labeled. */}
      <div className="hidden print:block">
        <p className="whitespace-pre-wrap font-body text-lg leading-8 text-ink">{text}</p>
      </div>
    </div>
  );
}
