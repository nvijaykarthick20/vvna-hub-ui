import type {
  DeletionResult,
  DuplicateGroup,
  DuplicateGroupKind,
  DuplicateMatchMode,
  DuplicateScanResult,
  MediaKind,
  ScannedMedia,
  ScanProgress,
} from './types';

const SUPPORTED_IMAGE_EXTENSIONS = new Set(['avif', 'bmp', 'gif', 'jpeg', 'jpg', 'png', 'webp']);
const SUPPORTED_VIDEO_EXTENSIONS = new Set([
  '3gp',
  'avi',
  'm4v',
  'mkv',
  'mov',
  'mp4',
  'mpeg',
  'mpg',
  'ogv',
  'webm',
  'wmv',
]);

const BYTE_CHUNK_SIZE = 4 * 1024 * 1024;
const HASH_WIDTH = 9;
const HASH_HEIGHT = 8;
const SAMPLE_SIZE = 24;
const MAX_HASH_DISTANCE = 5;
const MAX_MEAN_CHANNEL_DIFFERENCE = 12;
const MAX_CHANGED_PIXEL_RATIO = 0.03;
const MAX_ASPECT_RATIO_DIFFERENCE = 0.02;
const MAX_VIDEO_DURATION_DIFFERENCE_RATIO = 0.02;
const MAX_VIDEO_DURATION_DIFFERENCE_SECONDS = 0.5;
const VIDEO_SAMPLE_POINTS = [0.1, 0.37, 0.63, 0.9] as const;
const MIN_MATCHING_VIDEO_FRAMES = 3;
const VIDEO_LOAD_TIMEOUT_MS = 15_000;
const VIDEO_SEEK_TIMEOUT_MS = 10_000;

interface ScanOptions {
  signal: AbortSignal;
  onProgress: (progress: ScanProgress) => void;
}

export interface ExactHashEntry {
  media: ScannedMedia;
  hash: string;
}

export interface FrameFingerprint {
  width: number;
  height: number;
  differenceHash: string;
  samples: Uint8Array;
}

export interface ImageFingerprint extends FrameFingerprint {
  media: ScannedMedia;
}

export interface VideoFingerprint {
  media: ScannedMedia;
  width: number;
  height: number;
  duration: number;
  frames: FrameFingerprint[];
}

interface CollectedMedia {
  media: ScannedMedia[];
  skipped: number;
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('The scan was cancelled.', 'AbortError');
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}

function extensionForName(name: string): string | undefined {
  return name.split('.').pop()?.toLowerCase();
}

export function isSupportedImageName(name: string): boolean {
  const extension = extensionForName(name);
  return extension !== undefined && SUPPORTED_IMAGE_EXTENSIONS.has(extension);
}

export function isSupportedVideoName(name: string): boolean {
  const extension = extensionForName(name);
  return extension !== undefined && SUPPORTED_VIDEO_EXTENSIONS.has(extension);
}

export function mediaKindForName(name: string): MediaKind | null {
  if (isSupportedImageName(name)) return 'image';
  if (isSupportedVideoName(name)) return 'video';
  return null;
}

export function isSupportedMediaName(name: string): boolean {
  return mediaKindForName(name) !== null;
}

async function collectMedia(
  rootHandle: FileSystemDirectoryHandle,
  signal: AbortSignal,
  onProgress: ScanOptions['onProgress'],
): Promise<CollectedMedia> {
  const media: ScannedMedia[] = [];
  let skipped = 0;
  let visitedEntries = 0;

  async function visitDirectory(
    directoryHandle: FileSystemDirectoryHandle,
    parentParts: string[],
    isRoot: boolean,
  ): Promise<void> {
    try {
      for await (const [name, entry] of directoryHandle.entries()) {
        assertNotAborted(signal);
        visitedEntries += 1;

        if (entry.kind === 'directory') {
          await visitDirectory(entry as FileSystemDirectoryHandle, [...parentParts, name], false);
        } else {
          const kind = mediaKindForName(name);
          if (kind) {
            const relativePath = [...parentParts, name].join('/');
            try {
              const fileHandle = entry as FileSystemFileHandle;
              const file = await fileHandle.getFile();
              media.push({
                id: relativePath,
                name,
                relativePath,
                size: file.size,
                lastModified: file.lastModified,
                type: file.type,
                kind,
                file,
                fileHandle,
                parentHandle: directoryHandle,
              });
              onProgress({
                stage: 'discovering',
                processed: media.length,
                total: null,
                currentPath: relativePath,
              });
            } catch {
              skipped += 1;
            }
          }
        }

        if (visitedEntries % 50 === 0) await yieldToBrowser();
      }
    } catch (error) {
      if (signal.aborted || isRoot) throw error;
      skipped += 1;
    }
  }

  await visitDirectory(rootHandle, [], true);
  return { media, skipped };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Fingerprints large files without loading them fully into memory. Exact
 * candidates are also checked byte-for-byte, eliminating hash-only matches.
 */
export async function chunkedFileFingerprint(file: Blob, signal?: AbortSignal): Promise<string> {
  const chunkDigests: Uint8Array[] = [];
  for (let offset = 0; offset < file.size; offset += BYTE_CHUNK_SIZE) {
    assertNotAborted(signal);
    const bytes = await file.slice(offset, offset + BYTE_CHUNK_SIZE).arrayBuffer();
    chunkDigests.push(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
    if (chunkDigests.length % 8 === 0) await yieldToBrowser();
  }

  const combined = new Uint8Array(chunkDigests.length * 32);
  chunkDigests.forEach((digest, index) => combined.set(digest, index * 32));
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', combined)));
}

export async function filesAreByteEqual(
  first: Blob,
  second: Blob,
  signal?: AbortSignal,
): Promise<boolean> {
  if (first.size !== second.size) return false;

  for (let offset = 0; offset < first.size; offset += BYTE_CHUNK_SIZE) {
    assertNotAborted(signal);
    const end = Math.min(offset + BYTE_CHUNK_SIZE, first.size);
    const [firstBuffer, secondBuffer] = await Promise.all([
      first.slice(offset, end).arrayBuffer(),
      second.slice(offset, end).arrayBuffer(),
    ]);
    const firstBytes = new Uint8Array(firstBuffer);
    const secondBytes = new Uint8Array(secondBuffer);
    for (let index = 0; index < firstBytes.length; index += 1) {
      if (firstBytes[index] !== secondBytes[index]) return false;
    }
    if (Math.floor(offset / BYTE_CHUNK_SIZE) % 8 === 7) await yieldToBrowser();
  }

  return true;
}

function compareMediaForDisplay(a: ScannedMedia, b: ScannedMedia): number {
  return a.relativePath.localeCompare(b.relativePath, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function kindForFiles(files: ScannedMedia[]): DuplicateGroupKind {
  const firstKind = files[0]?.kind;
  return firstKind && files.every((file) => file.kind === firstKind) ? firstKind : 'mixed';
}

function reclaimableBytes(group: DuplicateGroup): number {
  const keeper = chooseSuggestedKeeper(group.files);
  return group.files.reduce((sum, file) => sum + (file.id === keeper.id ? 0 : file.size), 0);
}

function sortGroups(groups: DuplicateGroup[]): DuplicateGroup[] {
  return groups
    .map((group) => ({ ...group, files: [...group.files].sort(compareMediaForDisplay) }))
    .sort((a, b) => reclaimableBytes(b) - reclaimableBytes(a));
}

export async function groupExactHashEntries(
  entries: ExactHashEntry[],
  signal?: AbortSignal,
): Promise<DuplicateGroup[]> {
  const byFingerprint = new Map<string, ExactHashEntry[]>();
  for (const entry of entries) {
    const key = `${entry.media.size}:${entry.hash}`;
    const current = byFingerprint.get(key) ?? [];
    current.push(entry);
    byFingerprint.set(key, current);
  }

  const verifiedClusters: ScannedMedia[][] = [];
  for (const candidates of byFingerprint.values()) {
    if (candidates.length < 2) continue;
    const clusters: ScannedMedia[][] = [];
    for (const candidate of candidates) {
      assertNotAborted(signal);
      let matchingCluster: ScannedMedia[] | undefined;
      for (const cluster of clusters) {
        if (await filesAreByteEqual(cluster[0].file, candidate.media.file, signal)) {
          matchingCluster = cluster;
          break;
        }
      }
      if (matchingCluster) matchingCluster.push(candidate.media);
      else clusters.push([candidate.media]);
    }
    verifiedClusters.push(...clusters.filter((cluster) => cluster.length > 1));
  }

  return sortGroups(
    verifiedClusters.map((files, index) => ({
      id: `exact-${index + 1}`,
      mode: 'exact' as const,
      kind: kindForFiles(files),
      files,
    })),
  );
}

async function findExactDuplicates(
  media: ScannedMedia[],
  options: ScanOptions,
): Promise<DuplicateGroup[]> {
  const bySize = new Map<number, ScannedMedia[]>();
  for (const item of media) {
    const current = bySize.get(item.size) ?? [];
    current.push(item);
    bySize.set(item.size, current);
  }

  const candidates = Array.from(bySize.values())
    .filter((sameSize) => sameSize.length > 1)
    .flat();
  const hashed: ExactHashEntry[] = [];

  for (let index = 0; index < candidates.length; index += 1) {
    assertNotAborted(options.signal);
    const item = candidates[index];
    options.onProgress({
      stage: 'hashing',
      processed: index,
      total: candidates.length,
      currentPath: item.relativePath,
    });
    hashed.push({ media: item, hash: await chunkedFileFingerprint(item.file, options.signal) });
  }

  options.onProgress({
    stage: 'hashing',
    processed: candidates.length,
    total: candidates.length,
    currentPath: null,
  });
  return groupExactHashEntries(hashed, options.signal);
}

function createCanvas(
  width: number,
  height: number,
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This browser could not create a media analysis canvas.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.fillStyle = 'white';
  context.fillRect(0, 0, width, height);
  return [canvas, context];
}

function luminance(red: number, green: number, blue: number): number {
  return red * 0.299 + green * 0.587 + blue * 0.114;
}

function fingerprintFrame(
  source: CanvasImageSource,
  width: number,
  height: number,
): FrameFingerprint {
  const [hashCanvas, hashContext] = createCanvas(HASH_WIDTH, HASH_HEIGHT);
  hashContext.drawImage(source, 0, 0, hashCanvas.width, hashCanvas.height);
  const hashPixels = hashContext.getImageData(0, 0, HASH_WIDTH, HASH_HEIGHT).data;
  let differenceHash = '';
  for (let y = 0; y < HASH_HEIGHT; y += 1) {
    for (let x = 0; x < HASH_WIDTH - 1; x += 1) {
      const leftIndex = (y * HASH_WIDTH + x) * 4;
      const rightIndex = leftIndex + 4;
      const left = luminance(
        hashPixels[leftIndex],
        hashPixels[leftIndex + 1],
        hashPixels[leftIndex + 2],
      );
      const right = luminance(
        hashPixels[rightIndex],
        hashPixels[rightIndex + 1],
        hashPixels[rightIndex + 2],
      );
      differenceHash += left > right ? '1' : '0';
    }
  }

  const [sampleCanvas, sampleContext] = createCanvas(SAMPLE_SIZE, SAMPLE_SIZE);
  sampleContext.drawImage(source, 0, 0, sampleCanvas.width, sampleCanvas.height);
  const rgba = sampleContext.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  const samples = new Uint8Array(SAMPLE_SIZE * SAMPLE_SIZE * 3);
  for (let sourceIndex = 0, destination = 0; sourceIndex < rgba.length; sourceIndex += 4) {
    samples[destination] = rgba[sourceIndex];
    samples[destination + 1] = rgba[sourceIndex + 1];
    samples[destination + 2] = rgba[sourceIndex + 2];
    destination += 3;
  }

  return { width, height, differenceHash, samples };
}

async function fingerprintImage(media: ScannedMedia): Promise<ImageFingerprint> {
  const bitmap = await createImageBitmap(media.file);
  try {
    return {
      media: { ...media, width: bitmap.width, height: bitmap.height },
      ...fingerprintFrame(bitmap, bitmap.width, bitmap.height),
    };
  } finally {
    bitmap.close();
  }
}

function waitForVideoEvent(
  video: HTMLVideoElement,
  eventName: 'loadedmetadata' | 'seeked',
  timeoutMs: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
    const cleanup = () => {
      if (timeoutId !== null) globalThis.clearTimeout(timeoutId);
      video.removeEventListener(eventName, onReady);
      video.removeEventListener('error', onError);
      signal.removeEventListener('abort', onAbort);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('The browser could not decode this video.'));
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException('The scan was cancelled.', 'AbortError'));
    };

    video.addEventListener(eventName, onReady, { once: true });
    video.addEventListener('error', onError, { once: true });
    signal.addEventListener('abort', onAbort, { once: true });
    timeoutId = globalThis.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out while waiting for video ${eventName}.`));
    }, timeoutMs);
  });
}

async function fingerprintVideo(
  media: ScannedMedia,
  signal: AbortSignal,
): Promise<VideoFingerprint> {
  const source = URL.createObjectURL(media.file);
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'metadata';
  video.playsInline = true;

  try {
    const metadataReady = waitForVideoEvent(video, 'loadedmetadata', VIDEO_LOAD_TIMEOUT_MS, signal);
    video.src = source;
    video.load();
    await metadataReady;
    assertNotAborted(signal);

    const { duration, videoWidth: width, videoHeight: height } = video;
    if (!Number.isFinite(duration) || duration <= 0 || width <= 0 || height <= 0) {
      throw new Error('The video has no decodable duration or dimensions.');
    }

    const frames: FrameFingerprint[] = [];
    for (const point of VIDEO_SAMPLE_POINTS) {
      assertNotAborted(signal);
      const target = Math.min(duration - 0.001, Math.max(0, duration * point));
      if (Math.abs(video.currentTime - target) > 0.001 || video.readyState < 2) {
        const seeked = waitForVideoEvent(video, 'seeked', VIDEO_SEEK_TIMEOUT_MS, signal);
        video.currentTime = target;
        await seeked;
      }
      frames.push(fingerprintFrame(video, width, height));
    }

    return {
      media: { ...media, width, height, duration },
      width,
      height,
      duration,
      frames,
    };
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(source);
  }
}

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) distance += 1;
  }
  return distance;
}

export function areFrameFingerprintsSimilar(a: FrameFingerprint, b: FrameFingerprint): boolean {
  const aspectA = a.width / a.height;
  const aspectB = b.width / b.height;
  const aspectDifference = Math.abs(aspectA - aspectB) / Math.max(aspectA, aspectB);
  if (aspectDifference > MAX_ASPECT_RATIO_DIFFERENCE) return false;
  if (hammingDistance(a.differenceHash, b.differenceHash) > MAX_HASH_DISTANCE) return false;
  if (a.samples.length !== b.samples.length) return false;

  let totalDifference = 0;
  let changedPixels = 0;
  for (let index = 0; index < a.samples.length; index += 3) {
    const redDifference = Math.abs(a.samples[index] - b.samples[index]);
    const greenDifference = Math.abs(a.samples[index + 1] - b.samples[index + 1]);
    const blueDifference = Math.abs(a.samples[index + 2] - b.samples[index + 2]);
    totalDifference += redDifference + greenDifference + blueDifference;
    if (Math.max(redDifference, greenDifference, blueDifference) > 40) changedPixels += 1;
  }

  const pixelCount = a.samples.length / 3;
  return (
    totalDifference / a.samples.length <= MAX_MEAN_CHANNEL_DIFFERENCE &&
    changedPixels / pixelCount <= MAX_CHANGED_PIXEL_RATIO
  );
}

export function areVisualFingerprintsSimilar(a: ImageFingerprint, b: ImageFingerprint): boolean {
  return areFrameFingerprintsSimilar(a, b);
}

export function areVideoFingerprintsSimilar(a: VideoFingerprint, b: VideoFingerprint): boolean {
  const maximumDuration = Math.max(a.duration, b.duration);
  const allowedDurationDifference = Math.max(
    MAX_VIDEO_DURATION_DIFFERENCE_SECONDS,
    maximumDuration * MAX_VIDEO_DURATION_DIFFERENCE_RATIO,
  );
  if (Math.abs(a.duration - b.duration) > allowedDurationDifference) return false;

  const aspectA = a.width / a.height;
  const aspectB = b.width / b.height;
  if (Math.abs(aspectA - aspectB) / Math.max(aspectA, aspectB) > MAX_ASPECT_RATIO_DIFFERENCE) {
    return false;
  }
  if (a.frames.length !== b.frames.length || a.frames.length < MIN_MATCHING_VIDEO_FRAMES) {
    return false;
  }

  let matchingFrames = 0;
  for (let index = 0; index < a.frames.length; index += 1) {
    if (areFrameFingerprintsSimilar(a.frames[index], b.frames[index])) matchingFrames += 1;
  }
  return matchingFrames >= MIN_MATCHING_VIDEO_FRAMES;
}

interface HammingTreeNode {
  hash: string;
  fingerprints: ImageFingerprint[];
  children: Map<number, HammingTreeNode>;
}

class HammingTree {
  private root: HammingTreeNode | null = null;

  insert(fingerprint: ImageFingerprint) {
    if (!this.root) {
      this.root = {
        hash: fingerprint.differenceHash,
        fingerprints: [fingerprint],
        children: new Map(),
      };
      return;
    }

    let node = this.root;
    while (true) {
      const distance = hammingDistance(fingerprint.differenceHash, node.hash);
      if (distance === 0) {
        node.fingerprints.push(fingerprint);
        return;
      }
      const child = node.children.get(distance);
      if (!child) {
        node.children.set(distance, {
          hash: fingerprint.differenceHash,
          fingerprints: [fingerprint],
          children: new Map(),
        });
        return;
      }
      node = child;
    }
  }

  search(hash: string, maximumDistance: number): ImageFingerprint[] {
    if (!this.root) return [];
    const results: ImageFingerprint[] = [];
    const pending = [this.root];
    while (pending.length > 0) {
      const node = pending.pop();
      if (!node) continue;
      const distance = hammingDistance(hash, node.hash);
      if (distance <= maximumDistance) results.push(...node.fingerprints);
      for (const [edgeDistance, child] of node.children) {
        if (
          edgeDistance >= distance - maximumDistance &&
          edgeDistance <= distance + maximumDistance
        ) {
          pending.push(child);
        }
      }
    }
    return results;
  }
}

export function groupVisualFingerprints(fingerprints: ImageFingerprint[]): DuplicateGroup[] {
  const ordered = [...fingerprints].sort((a, b) => {
    const areaDifference = b.width * b.height - a.width * a.height;
    return (
      areaDifference || b.media.size - a.media.size || compareMediaForDisplay(a.media, b.media)
    );
  });
  const tree = new HammingTree();
  const clusters: ImageFingerprint[][] = [];
  const clusterByMediaId = new Map<string, number>();

  for (const fingerprint of ordered) {
    const nearby = tree.search(fingerprint.differenceHash, MAX_HASH_DISTANCE);
    const candidateClusterIndexes = new Set<number>();
    for (const neighbor of nearby) {
      const clusterIndex = clusterByMediaId.get(neighbor.media.id);
      if (clusterIndex !== undefined) candidateClusterIndexes.add(clusterIndex);
    }

    let matchingCluster: number | null = null;
    for (const clusterIndex of candidateClusterIndexes) {
      if (
        clusters[clusterIndex].every((member) => areVisualFingerprintsSimilar(member, fingerprint))
      ) {
        matchingCluster = clusterIndex;
        break;
      }
    }

    if (matchingCluster === null) {
      matchingCluster = clusters.length;
      clusters.push([fingerprint]);
    } else {
      clusters[matchingCluster].push(fingerprint);
    }
    clusterByMediaId.set(fingerprint.media.id, matchingCluster);
    tree.insert(fingerprint);
  }

  return sortGroups(
    clusters
      .filter((cluster) => cluster.length > 1)
      .map((cluster, index) => ({
        id: `visual-image-${index + 1}`,
        mode: 'visual' as const,
        kind: 'image' as const,
        files: cluster.map((entry) => entry.media),
      })),
  );
}

export function groupVisualVideoFingerprints(fingerprints: VideoFingerprint[]): DuplicateGroup[] {
  const ordered = [...fingerprints].sort((a, b) => {
    const areaDifference = b.width * b.height - a.width * a.height;
    return (
      areaDifference || b.media.size - a.media.size || compareMediaForDisplay(a.media, b.media)
    );
  });
  const clusters: VideoFingerprint[][] = [];

  for (const fingerprint of ordered) {
    const matchingCluster = clusters.find((cluster) =>
      cluster.every((member) => areVideoFingerprintsSimilar(member, fingerprint)),
    );
    if (matchingCluster) matchingCluster.push(fingerprint);
    else clusters.push([fingerprint]);
  }

  return sortGroups(
    clusters
      .filter((cluster) => cluster.length > 1)
      .map((cluster, index) => ({
        id: `visual-video-${index + 1}`,
        mode: 'visual' as const,
        kind: 'video' as const,
        files: cluster.map((entry) => entry.media),
      })),
  );
}

async function findVisualDuplicates(
  media: ScannedMedia[],
  options: ScanOptions,
): Promise<{ groups: DuplicateGroup[]; skipped: number }> {
  const imageFingerprints: ImageFingerprint[] = [];
  const videoFingerprints: VideoFingerprint[] = [];
  let skipped = 0;

  for (let index = 0; index < media.length; index += 1) {
    assertNotAborted(options.signal);
    const item = media[index];
    options.onProgress({
      stage: 'extracting',
      processed: index,
      total: media.length,
      currentPath: item.relativePath,
    });
    try {
      if (item.kind === 'image') imageFingerprints.push(await fingerprintImage(item));
      else videoFingerprints.push(await fingerprintVideo(item, options.signal));
    } catch (error) {
      if (options.signal.aborted) throw error;
      skipped += 1;
    }
    await yieldToBrowser();
  }

  assertNotAborted(options.signal);
  const fingerprintCount = imageFingerprints.length + videoFingerprints.length;
  options.onProgress({
    stage: 'comparing',
    processed: 0,
    total: fingerprintCount,
    currentPath: null,
  });
  await yieldToBrowser();
  const groups = sortGroups([
    ...groupVisualFingerprints(imageFingerprints),
    ...groupVisualVideoFingerprints(videoFingerprints),
  ]);
  options.onProgress({
    stage: 'comparing',
    processed: fingerprintCount,
    total: fingerprintCount,
    currentPath: null,
  });
  return { groups, skipped };
}

export async function scanDuplicateMedia(
  handle: FileSystemDirectoryHandle,
  mode: DuplicateMatchMode,
  options: ScanOptions,
): Promise<DuplicateScanResult> {
  options.onProgress({ stage: 'discovering', processed: 0, total: null, currentPath: null });
  const collected = await collectMedia(handle, options.signal, options.onProgress);
  assertNotAborted(options.signal);
  const scannedImageCount = collected.media.filter((item) => item.kind === 'image').length;
  const scannedVideoCount = collected.media.length - scannedImageCount;

  if (mode === 'exact') {
    return {
      groups: await findExactDuplicates(collected.media, options),
      scannedFileCount: collected.media.length,
      scannedImageCount,
      scannedVideoCount,
      skippedFileCount: collected.skipped,
    };
  }

  const visual = await findVisualDuplicates(collected.media, options);
  return {
    groups: visual.groups,
    scannedFileCount: collected.media.length,
    scannedImageCount,
    scannedVideoCount,
    skippedFileCount: collected.skipped + visual.skipped,
  };
}

export function chooseSuggestedKeeper(files: ScannedMedia[]): ScannedMedia {
  if (files.length === 0) throw new Error('Cannot choose a keeper from an empty group.');
  return [...files].sort((a, b) => {
    const areaA = (a.width ?? 0) * (a.height ?? 0);
    const areaB = (b.width ?? 0) * (b.height ?? 0);
    return (
      areaB - areaA ||
      b.size - a.size ||
      a.lastModified - b.lastModified ||
      a.relativePath.length - b.relativePath.length ||
      compareMediaForDisplay(a, b)
    );
  })[0];
}

export function suggestedDuplicateIds(groups: DuplicateGroup[]): Set<string> {
  const selected = new Set<string>();
  for (const group of groups) {
    const keeper = chooseSuggestedKeeper(group.files);
    for (const file of group.files) {
      if (file.id !== keeper.id) selected.add(file.id);
    }
  }
  return selected;
}

function deletionMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Write permission was not available.';
  }
  return error instanceof Error ? error.message : 'The file could not be deleted.';
}

export async function deleteSelectedMedia(media: ScannedMedia[]): Promise<DeletionResult> {
  const result: DeletionResult = { deletedIds: [], deletedBytes: 0, issues: [] };

  for (const item of media) {
    try {
      const currentFile = await item.fileHandle.getFile();
      if (currentFile.size !== item.size || currentFile.lastModified !== item.lastModified) {
        result.issues.push({
          file: item,
          reason: 'The file changed after the scan, so it was left untouched.',
        });
        continue;
      }
      if (!(await filesAreByteEqual(item.file, currentFile))) {
        result.issues.push({
          file: item,
          reason: 'The file contents changed after the scan, so it was left untouched.',
        });
        continue;
      }
      await item.parentHandle.removeEntry(item.name);
      result.deletedIds.push(item.id);
      result.deletedBytes += item.size;
    } catch (error) {
      result.issues.push({ file: item, reason: deletionMessage(error) });
    }
  }

  return result;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}
