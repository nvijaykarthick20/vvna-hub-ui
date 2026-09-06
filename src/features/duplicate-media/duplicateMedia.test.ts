import { describe, expect, it, vi } from 'vitest';
import {
  areVideoFingerprintsSimilar,
  areVisualFingerprintsSimilar,
  chooseSuggestedKeeper,
  chunkedFileFingerprint,
  deleteSelectedMedia,
  filesAreByteEqual,
  groupExactHashEntries,
  groupVisualFingerprints,
  groupVisualVideoFingerprints,
  hammingDistance,
  isSupportedImageName,
  isSupportedMediaName,
  isSupportedVideoName,
  suggestedDuplicateIds,
  type FrameFingerprint,
  type ImageFingerprint,
  type VideoFingerprint,
} from './duplicateMedia';
import type { DuplicateGroup, MediaKind, ScannedMedia } from './types';

function fileFrom(bytes: number[], name: string, lastModified = 100): File {
  return new File([new Uint8Array(bytes)], name, { lastModified });
}

function media(
  id: string,
  kind: MediaKind = 'image',
  overrides: Partial<ScannedMedia> = {},
): ScannedMedia {
  const name = id.split('/').pop() ?? id;
  const file = overrides.file ?? fileFrom([1, 2, 3], name, overrides.lastModified ?? 100);
  return {
    id,
    name,
    relativePath: id,
    size: file.size,
    lastModified: file.lastModified,
    type: kind === 'image' ? 'image/jpeg' : 'video/mp4',
    kind,
    file,
    fileHandle: {} as FileSystemFileHandle,
    parentHandle: {} as FileSystemDirectoryHandle,
    ...overrides,
  };
}

function frame(overrides: Partial<FrameFingerprint> = {}): FrameFingerprint {
  return {
    width: 1_000,
    height: 800,
    differenceHash: '0'.repeat(64),
    samples: new Uint8Array(24 * 24 * 3).fill(120),
    ...overrides,
  };
}

function imageFingerprint(
  item: ScannedMedia,
  overrides: Partial<ImageFingerprint> = {},
): ImageFingerprint {
  return { media: item, ...frame(), ...overrides };
}

function videoFingerprint(
  item: ScannedMedia,
  overrides: Partial<VideoFingerprint> = {},
): VideoFingerprint {
  return {
    media: item,
    width: 1_920,
    height: 1_080,
    duration: 60,
    frames: [frame(), frame(), frame(), frame()],
    ...overrides,
  };
}

describe('duplicate media helpers', () => {
  it('recognizes supported photo and video extensions without depending on casing', () => {
    expect(isSupportedImageName('scan.JPG')).toBe(true);
    expect(isSupportedVideoName('holiday.MP4')).toBe(true);
    expect(isSupportedVideoName('clip.webm')).toBe(true);
    expect(isSupportedMediaName('archive/movie.mkv')).toBe(true);
    expect(isSupportedMediaName('notes.pdf')).toBe(false);
    expect(isSupportedMediaName('no-extension')).toBe(false);
  });

  it('creates stable chunked fingerprints and compares the final bytes', async () => {
    const first = fileFrom([1, 2, 3, 4], 'first.mp4');
    const copy = fileFrom([1, 2, 3, 4], 'renamed.mov');
    const changed = fileFrom([1, 2, 3, 5], 'changed.mp4');

    expect(await chunkedFileFingerprint(first)).toBe(await chunkedFileFingerprint(copy));
    expect(await filesAreByteEqual(first, copy)).toBe(true);
    expect(await filesAreByteEqual(first, changed)).toBe(false);
  });

  it('groups exact bytes while ignoring names and rejects a hash collision', async () => {
    const first = media('original/report.jpg', 'image', {
      file: fileFrom([1, 2, 3], 'report.jpg'),
    });
    const renamedCopy = media('archive/completely-different-name.png', 'image', {
      file: fileFrom([1, 2, 3], 'completely-different-name.png'),
    });
    const collision = media('other.jpg', 'image', { file: fileFrom([3, 2, 1], 'other.jpg') });
    const groups = await groupExactHashEntries([
      { media: first, hash: 'same-fingerprint' },
      { media: renamedCopy, hash: 'same-fingerprint' },
      { media: collision, hash: 'same-fingerprint' },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].files.map((file) => file.id)).toEqual([
      'archive/completely-different-name.png',
      'original/report.jpg',
    ]);
  });

  it('supports byte-identical videos in exact groups', async () => {
    const first = media('camera/clip.mp4', 'video', { file: fileFrom([8, 9], 'clip.mp4') });
    const copy = media('backup/renamed.mov', 'video', { file: fileFrom([8, 9], 'renamed.mov') });
    const groups = await groupExactHashEntries([
      { media: first, hash: 'video-bytes' },
      { media: copy, hash: 'video-bytes' },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe('video');
  });

  it('calculates hash distance and rejects a large photo difference', () => {
    expect(hammingDistance('0000', '0101')).toBe(2);
    const first = imageFingerprint(media('a.jpg'));
    const changed = imageFingerprint(media('b.jpg'), { differenceHash: '1'.repeat(64) });
    expect(areVisualFingerprintsSimilar(first, changed)).toBe(false);
  });

  it('accepts strict photo matches but rejects different colors with the same shape hash', () => {
    const first = imageFingerprint(media('a.jpg'));
    const resaved = imageFingerprint(media('b.jpg'), {
      width: 2_000,
      height: 1_600,
      samples: new Uint8Array(first.samples).fill(124),
    });
    const differentColor = imageFingerprint(media('c.jpg'), {
      samples: new Uint8Array(first.samples.length).fill(220),
    });

    expect(areVisualFingerprintsSimilar(first, resaved)).toBe(true);
    expect(areVisualFingerprintsSimilar(first, differentColor)).toBe(false);
    expect(groupVisualFingerprints([first, resaved, differentColor])).toHaveLength(1);
  });

  it('matches a re-encoded video when at least three sampled frames agree', () => {
    const original = videoFingerprint(media('original.mp4', 'video'));
    const changedFrame = frame({ differenceHash: '1'.repeat(64) });
    const reencoded = videoFingerprint(media('copy.webm', 'video'), {
      width: 1_280,
      height: 720,
      duration: 60.3,
      frames: [frame(), frame(), frame(), changedFrame],
    });

    expect(areVideoFingerprintsSimilar(original, reencoded)).toBe(true);
    expect(groupVisualVideoFingerprints([original, reencoded])).toHaveLength(1);
  });

  it('rejects videos with different durations or too many different sampled frames', () => {
    const original = videoFingerprint(media('original.mp4', 'video'));
    const differentFrame = frame({ samples: new Uint8Array(24 * 24 * 3).fill(230) });
    const longer = videoFingerprint(media('longer.mp4', 'video'), { duration: 75 });
    const differentScenes = videoFingerprint(media('different.mp4', 'video'), {
      frames: [frame(), frame(), differentFrame, differentFrame],
    });

    expect(areVideoFingerprintsSimilar(original, longer)).toBe(false);
    expect(areVideoFingerprintsSimilar(original, differentScenes)).toBe(false);
  });

  it('keeps the highest-resolution visual copy and selects the rest', () => {
    const smaller = media('small.jpg', 'image', { width: 800, height: 600, size: 300_000 });
    const larger = media('large.jpg', 'image', { width: 2_000, height: 1_500, size: 900_000 });
    const group: DuplicateGroup = {
      id: 'visual-image-1',
      mode: 'visual',
      kind: 'image',
      files: [smaller, larger],
    };

    expect(chooseSuggestedKeeper(group.files).id).toBe('large.jpg');
    expect([...suggestedDuplicateIds([group])]).toEqual(['small.jpg']);
  });

  it('does not delete a file whose metadata changed after scanning', async () => {
    const removeEntry = vi.fn();
    const original = fileFrom([1, 2, 3], 'changed.mp4', 100);
    const changed = media('changed.mp4', 'video', {
      file: original,
      fileHandle: {
        getFile: vi.fn().mockResolvedValue(fileFrom([1, 2, 3, 4], 'changed.mp4', 100)),
      } as unknown as FileSystemFileHandle,
      parentHandle: { removeEntry } as unknown as FileSystemDirectoryHandle,
    });

    const result = await deleteSelectedMedia([changed]);
    expect(result.deletedIds).toEqual([]);
    expect(result.issues[0].reason).toContain('changed after the scan');
    expect(removeEntry).not.toHaveBeenCalled();
  });

  it('does not delete same-size content that changed while keeping its timestamp', async () => {
    const removeEntry = vi.fn();
    const original = fileFrom([1, 2, 3], 'same-metadata.mp4', 100);
    const changed = media('same-metadata.mp4', 'video', {
      file: original,
      fileHandle: {
        getFile: vi.fn().mockResolvedValue(fileFrom([3, 2, 1], 'same-metadata.mp4', 100)),
      } as unknown as FileSystemFileHandle,
      parentHandle: { removeEntry } as unknown as FileSystemDirectoryHandle,
    });

    const result = await deleteSelectedMedia([changed]);
    expect(result.deletedIds).toEqual([]);
    expect(result.issues[0].reason).toContain('contents changed');
    expect(removeEntry).not.toHaveBeenCalled();
  });

  it('deletes an unchanged selected video through its parent directory', async () => {
    const removeEntry = vi.fn().mockResolvedValue(undefined);
    const original = fileFrom([4, 5, 6], 'copy.mp4', 100);
    const duplicate = media('folder/copy.mp4', 'video', {
      file: original,
      fileHandle: {
        getFile: vi.fn().mockResolvedValue(fileFrom([4, 5, 6], 'copy.mp4', 100)),
      } as unknown as FileSystemFileHandle,
      parentHandle: { removeEntry } as unknown as FileSystemDirectoryHandle,
    });

    const result = await deleteSelectedMedia([duplicate]);
    expect(result.deletedIds).toEqual(['folder/copy.mp4']);
    expect(result.deletedBytes).toBe(3);
    expect(removeEntry).toHaveBeenCalledWith('copy.mp4');
  });
});
