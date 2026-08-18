import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

/**
 * Private file storage for attachments and profile pictures.
 *
 * Files used to be written to `public/uploads`, which Next serves as static
 * assets — anyone who knew or guessed a URL could read an invoice without
 * signing in, completely bypassing the permission checks in
 * app/api/attachments/[id]. Storage now lives outside the web root and is only
 * reachable through routes that check the session first.
 *
 * The `fileUrl` column still holds a `/uploads/...` string. That value is now a
 * storage key rather than a URL, which keeps existing rows working untouched;
 * resolveUploadPath() maps it onto the private directory and falls back to the
 * old public location so nothing 404s if the move script has not been run.
 */

const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'private', 'uploads');

const LEGACY_ROOT = path.join(process.cwd(), 'public', 'uploads');

export const PROFILE_SUBDIR = 'profiles';

/** Extension → MIME type. Anything not listed here is rejected on upload. */
const ALLOWED_TYPES: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.csv': ['text/csv', 'application/csv', 'application/vnd.ms-excel']
};

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

/**
 * Content types used when serving a file back.
 *
 * Everything unrecognised is served as application/octet-stream, and no file is
 * ever served as text/html or image/svg+xml — either would let an uploaded file
 * run script in the app's own origin.
 */
export const SERVE_CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv'
};

/** Leading bytes that must be present for formats we can cheaply verify. */
const MAGIC_BYTES: Record<string, number[][]> = {
  '.pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  '.png': [[0x89, 0x50, 0x4e, 0x47]],
  '.jpg': [[0xff, 0xd8, 0xff]],
  '.jpeg': [[0xff, 0xd8, 0xff]],
  '.gif': [[0x47, 0x49, 0x46, 0x38]],
  '.webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF....WEBP
  // The OOXML formats are zip containers.
  '.docx': [[0x50, 0x4b, 0x03, 0x04]],
  '.xlsx': [[0x50, 0x4b, 0x03, 0x04]]
};

export interface SavedUpload {
  /** Value for the fileUrl column, e.g. "/uploads/1755-ab12-invoice.pdf". */
  storageKey: string;
  /** Sanitised original name, for display. */
  displayName: string;
}

/**
 * Strips directory components and anything outside a conservative character
 * set, then caps the length. Returns a safe basename plus its extension.
 */
function sanitiseName(originalName: string) {
  const base = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const extension = path.extname(base).toLowerCase();
  const stem = base.slice(0, base.length - extension.length).slice(0, 80) || 'file';

  return { stem, extension, safeName: `${stem}${extension}` };
}

/**
 * Validates a file's extension, declared MIME type, and leading bytes.
 * Returns an error message, or null when the file is acceptable.
 *
 * The byte check matters because the browser-supplied MIME type is attacker
 * controlled — without it, a file could claim to be a PDF and contain anything.
 */
export function validateUpload(
  extension: string,
  declaredType: string,
  bytes: Uint8Array,
  { imagesOnly = false } = {}
): string | null {
  const allowedMimes = ALLOWED_TYPES[extension];

  if (!allowedMimes) {
    return `Files of type ${extension || '(none)'} are not allowed.`;
  }

  if (imagesOnly && !IMAGE_EXTENSIONS.includes(extension)) {
    return 'The file must be an image.';
  }

  // Some browsers send an empty type for less common formats; the extension and
  // magic-byte checks still apply, so this is safe to allow.
  if (declaredType && !allowedMimes.includes(declaredType)) {
    return `${extension} files must be uploaded as ${allowedMimes[0]}.`;
  }

  const signatures = MAGIC_BYTES[extension];

  if (signatures) {
    const matches = signatures.some((signature) =>
      signature.every((byte, index) => bytes[index] === byte)
    );

    if (!matches) {
      return `${extension} file appears to be corrupt or is not really a ${extension.slice(1).toUpperCase()} file.`;
    }
  }

  return null;
}

/**
 * Writes a file into private storage.
 *
 * The stored name carries a random component as well as a timestamp: timestamps
 * alone collide when two uploads land in the same millisecond, and they make
 * neighbouring filenames guessable.
 */
export async function saveUpload(
  bytes: Uint8Array,
  originalName: string,
  { subdir = '', prefix = '' }: { subdir?: string; prefix?: string } = {}
): Promise<SavedUpload> {
  const { stem, extension, safeName } = sanitiseName(originalName);
  const targetDir = subdir ? path.join(UPLOAD_ROOT, subdir) : UPLOAD_ROOT;

  await fs.mkdir(targetDir, { recursive: true });

  const unique = `${Date.now()}-${randomBytes(6).toString('hex')}`;
  const storedName = `${unique}${prefix ? `-${prefix}` : ''}-${stem}${extension}`;

  await fs.writeFile(path.join(targetDir, storedName), bytes, { mode: 0o600 });

  return {
    storageKey: `/uploads/${subdir ? `${subdir}/` : ''}${storedName}`,
    displayName: safeName
  };
}

/**
 * Maps a stored fileUrl onto a path on disk, rejecting anything that escapes
 * the upload root. Falls back to the legacy public directory for files written
 * before storage moved.
 */
export async function resolveUploadPath(storageKey: string): Promise<string | null> {
  const relative = storageKey.replace(/^\/+/, '').replace(/^uploads\//, '');

  // A stored value containing ".." must never reach outside the upload root.
  const candidate = path.resolve(UPLOAD_ROOT, relative);

  if (candidate !== UPLOAD_ROOT && !candidate.startsWith(UPLOAD_ROOT + path.sep)) {
    return null;
  }

  try {
    await fs.access(candidate);
    return candidate;
  } catch {
    // Not migrated yet — try the old location, with the same containment check.
    const legacy = path.resolve(LEGACY_ROOT, relative);

    if (legacy !== LEGACY_ROOT && !legacy.startsWith(LEGACY_ROOT + path.sep)) {
      return null;
    }

    try {
      await fs.access(legacy);
      return legacy;
    } catch {
      return null;
    }
  }
}

export function getUploadRoot() {
  return UPLOAD_ROOT;
}
