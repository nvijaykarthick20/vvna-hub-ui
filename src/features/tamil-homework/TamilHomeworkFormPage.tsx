import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  ClipboardEvent as ReactClipboardEvent,
  DragEvent as ReactDragEvent,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useWorksheetsDirectory } from './useWorksheetsDirectory';
import { normalizeTextRuns, plainTextFromRuns, trimTextRuns } from './richText';
import { saveWorksheet, updateWorksheet } from './worksheetStorage';
import { isTamilTextSize, isTamilWorksheet, type TamilTextRun, type TamilTextSize } from './types';
import { convertTrailingWord, convertWordBeforeCursor } from './tanglishInput';

const fieldClassName =
  'w-full rounded-xl border border-paper-line bg-white/70 px-4 py-3 text-ink placeholder:text-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turmeric-deep';

const textSizeClasses: Record<TamilTextSize, string> = {
  normal: 'text-lg leading-8',
  large: 'text-xl leading-9',
  'extra-large': 'text-2xl leading-10',
};

function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

function writeTextRuns(editor: HTMLDivElement, runs: TamilTextRun[]) {
  const fragment = document.createDocumentFragment();
  for (const run of runs) {
    const textNode = document.createTextNode(run.text);
    if (run.bold) {
      const strong = document.createElement('strong');
      strong.append(textNode);
      fragment.append(strong);
    } else {
      fragment.append(textNode);
    }
  }
  editor.replaceChildren(fragment);
}

function readTextRuns(editor: HTMLDivElement): TamilTextRun[] {
  const runs: TamilTextRun[] = [];

  function append(text: string, bold: boolean) {
    if (text === '') return;
    const previous = runs.at(-1);
    if (previous?.bold === bold) previous.text += text;
    else runs.push({ text, bold });
  }

  function visit(node: Node, inheritedBold: boolean) {
    if (node.nodeType === Node.TEXT_NODE) {
      append(node.textContent ?? '', inheritedBold);
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === 'BR') {
      append('\n', inheritedBold);
      return;
    }

    const numericWeight = Number.parseInt(node.style.fontWeight, 10);
    const bold =
      inheritedBold ||
      node.tagName === 'B' ||
      node.tagName === 'STRONG' ||
      node.style.fontWeight === 'bold' ||
      numericWeight >= 600;
    node.childNodes.forEach((child) => visit(child, bold));
  }

  editor.childNodes.forEach((child) => visit(child, false));
  return normalizeTextRuns(runs);
}

function selectionRangeInside(editor: HTMLDivElement): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  return editor.contains(range.commonAncestorContainer) ? range : null;
}

function selectionOffsets(editor: HTMLDivElement): { start: number; end: number } | null {
  const range = selectionRangeInside(editor);
  if (!range) return null;

  const beforeStart = range.cloneRange();
  beforeStart.selectNodeContents(editor);
  beforeStart.setEnd(range.startContainer, range.startOffset);
  const beforeEnd = range.cloneRange();
  beforeEnd.selectNodeContents(editor);
  beforeEnd.setEnd(range.endContainer, range.endOffset);
  return { start: beforeStart.toString().length, end: beforeEnd.toString().length };
}

function pointAtTextOffset(editor: HTMLDivElement, offset: number): { node: Node; offset: number } {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, offset);
  let lastTextNode: Text | null = null;
  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text;
    lastTextNode = textNode;
    if (remaining <= textNode.length) return { node: textNode, offset: remaining };
    remaining -= textNode.length;
  }
  return lastTextNode
    ? { node: lastTextNode, offset: lastTextNode.length }
    : { node: editor, offset: 0 };
}

function setSelectionOffsets(editor: HTMLDivElement, start: number, end = start) {
  const selection = window.getSelection();
  if (!selection) return;
  const startPoint = pointAtTextOffset(editor, start);
  const endPoint = pointAtTextOffset(editor, end);
  const range = document.createRange();
  range.setStart(startPoint.node, startPoint.offset);
  range.setEnd(endPoint.node, endPoint.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}

function replaceTextRange(
  editor: HTMLDivElement,
  start: number,
  end: number,
  replacement: string,
  caret: number,
) {
  const startPoint = pointAtTextOffset(editor, start);
  const endPoint = pointAtTextOffset(editor, end);
  const range = document.createRange();
  range.setStart(startPoint.node, startPoint.offset);
  range.setEnd(endPoint.node, endPoint.offset);
  range.deleteContents();
  range.insertNode(document.createTextNode(replacement));
  setSelectionOffsets(editor, caret);
}

function applyPlainTextChange(
  editor: HTMLDivElement,
  before: string,
  after: string,
  caret: number,
) {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start])
    start += 1;

  let beforeEnd = before.length;
  let afterEnd = after.length;
  while (beforeEnd > start && afterEnd > start && before[beforeEnd - 1] === after[afterEnd - 1]) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }

  replaceTextRange(editor, start, beforeEnd, after.slice(start, afterEnd), caret);
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
  const initialTextRunsRef = useRef<TamilTextRun[]>(
    existing?.textRuns
      ? normalizeTextRuns(existing.textRuns)
      : existing?.text
        ? [{ text: existing.text, bold: false }]
        : [],
  );
  const [worksheetFor, setWorksheetFor] = useState(existing?.worksheetFor ?? '');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [text, setText] = useState(existing?.text ?? '');
  const [textRuns, setTextRuns] = useState<TamilTextRun[]>(initialTextRunsRef.current);
  const [textSize, setTextSize] = useState<TamilTextSize>(existing?.textSize ?? 'normal');
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const [selectionIsBold, setSelectionIsBold] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== 'checking' && status !== 'ready') {
      navigate('/tamil-homework', { replace: true });
    }
  }, [status, navigate]);

  useLayoutEffect(() => {
    if (editorRef.current) writeTextRuns(editorRef.current, initialTextRunsRef.current);
  }, []);

  function updateSelectionState() {
    const editor = editorRef.current;
    const range = editor ? selectionRangeInside(editor) : null;
    const hasSelection = Boolean(range && !range.collapsed && range.toString() !== '');
    setHasTextSelection(hasSelection);
    setSelectionIsBold(hasSelection && document.queryCommandState('bold'));
  }

  function syncEditorState(convertBoundary: boolean) {
    const editor = editorRef.current;
    if (!editor) return;
    let runs = readTextRuns(editor);
    let currentText = plainTextFromRuns(runs);
    const offsets = selectionOffsets(editor);

    if (convertBoundary && offsets && offsets.start === offsets.end) {
      const converted = convertWordBeforeCursor(currentText, offsets.end);
      if (converted) {
        applyPlainTextChange(editor, currentText, converted.text, converted.cursor);
        runs = readTextRuns(editor);
        currentText = converted.text;
      }
    }

    setTextRuns(runs);
    setText(currentText);
    updateSelectionState();
  }

  function insertPlainTextAtSelection(value: string) {
    const editor = editorRef.current;
    if (!editor) return;
    const offsets = selectionOffsets(editor);
    if (!offsets) return;
    replaceTextRange(editor, offsets.start, offsets.end, value, offsets.start + value.length);
    syncEditorState(false);
  }

  function handleEditorInput() {
    syncEditorState(true);
  }

  function handleEditorBlur() {
    const editor = editorRef.current;
    if (!editor) return;
    const before = plainTextFromRuns(readTextRuns(editor));
    const after = convertTrailingWord(before);
    if (after !== before) applyPlainTextChange(editor, before, after, after.length);
    const runs = readTextRuns(editor);
    setTextRuns(runs);
    setText(plainTextFromRuns(runs));
  }

  function handleEditorPaste(event: ReactClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    insertPlainTextAtSelection(event.clipboardData.getData('text/plain'));
  }

  function handleEditorDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    insertPlainTextAtSelection(event.dataTransfer.getData('text/plain'));
  }

  function handleEditorBeforeInput(event: FormEvent<HTMLDivElement>) {
    const inputEvent = event.nativeEvent as InputEvent;
    if (inputEvent.inputType === 'insertParagraph' || inputEvent.inputType === 'insertLineBreak') {
      event.preventDefault();
      insertPlainTextAtSelection('\n');
    }
  }

  function handleEditorKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      insertPlainTextAtSelection('\n');
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      handleBoldSelection();
    }
  }

  function handleBoldSelection() {
    const editor = editorRef.current;
    const range = editor ? selectionRangeInside(editor) : null;
    if (!editor || !range || range.collapsed) return;
    document.execCommand('bold', false);
    syncEditorState(false);
    updateSelectionState();
  }

  function preserveEditorSelection(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  const canSave =
    worksheetFor.trim() !== '' && title.trim() !== '' && text.trim() !== '' && !saving;

  async function handleSave() {
    if (!handle) return;
    setSaving(true);
    setError(null);
    try {
      const currentRuns = editorRef.current ? readTextRuns(editorRef.current) : textRuns;
      const trimmedRuns = trimTextRuns(currentRuns);
      const input = {
        worksheetFor: worksheetFor.trim(),
        title: title.trim(),
        text: plainTextFromRuns(trimmedRuns),
        textRuns: trimmedRuns,
        textSize,
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
          <span id="worksheet-text-label" className="font-semibold text-ink">
            Text
          </span>

          <div
            className="flex flex-wrap items-center gap-3 rounded-xl border border-paper-line bg-white/70 p-3"
            role="group"
            aria-label="Text formatting"
          >
            <Button
              variant={selectionIsBold ? 'primary' : 'secondary'}
              className="px-4 py-2"
              aria-pressed={selectionIsBold}
              aria-controls="worksheet-text"
              disabled={!hasTextSelection || saving}
              onMouseDown={preserveEditorSelection}
              onClick={handleBoldSelection}
            >
              Bold
            </Button>
            <label htmlFor="worksheet-text-size" className="font-semibold text-ink">
              Text size
            </label>
            <select
              id="worksheet-text-size"
              value={textSize}
              onChange={(event) => {
                if (isTamilTextSize(event.target.value)) setTextSize(event.target.value);
              }}
              aria-controls="worksheet-text"
              className="rounded-lg border border-paper-line bg-white px-3 py-2 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turmeric-deep"
            >
              <option value="normal">Normal</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra large</option>
            </select>
            <p className="basis-full text-xs text-ink-soft">
              Select words in the Text box, then choose Bold. Press Ctrl+B or ⌘B as a shortcut.
            </p>
          </div>

          {/* A sheet of "paper" on the cream desk background. The content-editable
              region stores only plain text plus safe bold runs, never arbitrary HTML. */}
          <div className="rounded-sm border border-paper-line bg-white shadow-card">
            <div className="relative">
              {text === '' && (
                <p
                  className={`pointer-events-none absolute left-10 top-12 text-ink-soft/70 sm:left-16 ${textSizeClasses[textSize]}`}
                  aria-hidden="true"
                >
                  இங்கே பாடத்தை தட்டச்சு செய்யவும்… (தமிழ்நடையில் தட்டச்சு செய்தால் தானாக தமிழில்
                  மாறும்)
                </p>
              )}
              <div
                ref={editorRef}
                id="worksheet-text"
                role="textbox"
                aria-labelledby="worksheet-text-label"
                aria-multiline="true"
                aria-placeholder="இங்கே பாடத்தை தட்டச்சு செய்யவும்"
                contentEditable
                suppressContentEditableWarning
                spellCheck
                onInput={handleEditorInput}
                onBlur={handleEditorBlur}
                onPaste={handleEditorPaste}
                onDrop={handleEditorDrop}
                onBeforeInput={handleEditorBeforeInput}
                onKeyDown={handleEditorKeyDown}
                onMouseUp={updateSelectionState}
                onKeyUp={updateSelectionState}
                onSelect={updateSelectionState}
                onFocus={updateSelectionState}
                className={`min-h-[28rem] w-full resize-y overflow-auto whitespace-pre-wrap break-words bg-transparent px-10 py-12 font-body font-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-turmeric-deep sm:min-h-[34rem] sm:px-16 ${textSizeClasses[textSize]}`}
              />
            </div>
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
        <p
          className={`whitespace-pre-wrap font-body font-normal text-ink ${textSizeClasses[textSize]}`}
        >
          {textRuns.map((run, index) => (
            <span key={`${index}-${run.bold}`} className={run.bold ? 'font-bold' : undefined}>
              {run.text}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
