# Rules for `src/features/duplicate-media/`

This feature reads and deletes real files selected by the user. Read this
before changing the scanner or deletion flow.

## Responsibilities

- `types.ts` owns scan/result types, including the live browser file and
  directory handles needed to preview and delete a result.
- `duplicateMedia.ts` owns recursive discovery, bounded-memory exact
  fingerprinting, byte verification, photo/video visual fingerprints,
  duplicate grouping, keeper suggestions, and deletion. Keep these rules out
  of React so they remain unit-testable.
- `DuplicateMediaPage.tsx` owns permissions, progress, selection, previews,
  confirmation, and rendering.

## Safety invariants

- The app must never offer to delete every member of a duplicate group. The
  UI protects the final unselected file, and bulk selection always uses
  `suggestedDuplicateIds`, which retains one suggested keeper per group.
- Deletion requires a separate confirmation that includes file count and
  size. Browser deletion may bypass the operating system recycle bin, so
  never describe it as recoverable.
- Before deletion, re-read each file and compare its size, modified time, and
  complete contents byte-for-byte with the immutable `File` snapshot captured
  during the scan. If it changed, leave it untouched and report the issue.
- Delete sequentially and report partial failures. Do not hide a file from
  the results unless `removeEntry` succeeded.

## Matching rules

- Exact mode ignores names and paths. It first groups by size, builds a
  chunked SHA-256 fingerprint with bounded memory, then verifies every match
  byte-for-byte. A hash collision must never create an exact group.
- Photo visual mode combines aspect ratio, a difference hash, and normalized
  color samples. Video visual mode compares duration, aspect ratio, and four
  frames sampled across the timeline; at least three frames must match.
- Visual matching is intentionally strict. It targets resized/recompressed
  photos and re-encoded videos, not media that merely has a similar subject.
- Visual clustering requires a new photo or video to match every existing
  member of a cluster. Do not weaken this to transitive-only matching, which
  can join two dissimilar endpoints through a chain of loose matches.
- The highest-resolution visual file is the suggested keeper, followed by
  file size, oldest modified date, shortest path, and lexical path. Users
  can change the keeper manually before deletion.
- Photo formats are JPEG, PNG, WebP, GIF, BMP, and AVIF. Recognized video
  extensions are MP4, M4V, MOV, WebM, OGV, AVI, MKV, WMV, MPEG/MPG, and 3GP.
  Exact matching works from bytes; visual matching can analyze only codecs the
  current Chromium browser can decode and must report undecodable files as
  skipped.

## Browser behavior

- `showDirectoryPicker` requires Chrome/Edge, a secure context, and a user
  gesture. Keep a visible unsupported-browser state.
- The scan is local-only. Do not upload filenames, media, fingerprints, or
  hashes.
- The selected folder is not persisted. Requiring an intentional folder
  choice per visit is appropriate for a destructive cleanup feature.
