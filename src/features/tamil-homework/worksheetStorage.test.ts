import { describe, expect, it, vi } from 'vitest';
import type { TamilWorksheet, TamilWorksheetInput } from './types';
import { saveWorksheet, updateWorksheet } from './worksheetStorage';

const formattedInput: TamilWorksheetInput = {
  worksheetFor: 'Anjali',
  title: 'Reading',
  text: 'வணக்கம்',
  textRuns: [
    { text: 'வண', bold: true },
    { text: 'க்கம்', bold: false },
  ],
  textSize: 'large',
};

function directoryWithWritable() {
  const write = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn().mockResolvedValue(undefined);
  const getFileHandle = vi.fn().mockResolvedValue({
    createWritable: vi.fn().mockResolvedValue({ write, close }),
  });
  return {
    handle: { getFileHandle } as unknown as FileSystemDirectoryHandle,
    write,
    close,
    getFileHandle,
  };
}

describe('Tamil worksheet formatting storage', () => {
  it('saves selected-bold runs and text-size preferences in a new worksheet file', async () => {
    const storage = directoryWithWritable();
    const worksheet = await saveWorksheet(storage.handle, formattedInput);

    expect(worksheet.textRuns).toEqual(formattedInput.textRuns);
    expect(worksheet.textSize).toBe('large');
    const savedJson = JSON.parse(storage.write.mock.calls[0][0] as string) as TamilWorksheet;
    expect(savedJson.textRuns).toEqual(formattedInput.textRuns);
    expect(savedJson.textSize).toBe('large');
    expect(storage.close).toHaveBeenCalledOnce();
  });

  it('adds formatting preferences when updating a legacy worksheet', async () => {
    const storage = directoryWithWritable();
    const legacyWorksheet: TamilWorksheet = {
      id: 'worksheet-1',
      worksheetFor: 'Anjali',
      title: 'Reading',
      text: 'வணக்கம்',
      createdAt: '2026-09-05T00:00:00.000Z',
      updatedAt: '2026-09-05T00:00:00.000Z',
    };

    const worksheet = await updateWorksheet(storage.handle, legacyWorksheet, {
      ...formattedInput,
      textRuns: [{ text: 'வணக்கம்', bold: false }],
      textSize: 'extra-large',
    });

    expect(worksheet.createdAt).toBe(legacyWorksheet.createdAt);
    expect(worksheet.textRuns).toEqual([{ text: 'வணக்கம்', bold: false }]);
    expect(worksheet.textSize).toBe('extra-large');
    expect(storage.getFileHandle).toHaveBeenCalledWith('worksheet-1.json', { create: true });
  });
});
