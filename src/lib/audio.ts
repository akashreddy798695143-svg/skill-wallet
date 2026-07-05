import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

/**
 * Disk-backed audio storage for uploaded/recorded files.
 * Files live in <project>/uploads and are served via /api/audio/[id].
 */

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const ALLOWED_MIME = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
]);

const ALLOWED_EXT = new Set([".wav", ".mp3", ".m4a", ".aac", ".ogg", ".webm"]);

export function isAllowedAudio(mime: string, filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_MIME.has(mime.toLowerCase()) || ALLOWED_EXT.has(ext);
}

export async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function saveAudioFile(
  data: Uint8Array,
  originalName: string,
  mimeType: string
): Promise<{ filename: string; storagePath: string; size: number }> {
  await ensureUploadDir();
  const ext = path.extname(originalName).toLowerCase() || guessExt(mimeType);
  const filename = `${Date.now()}-${randomUUID()}${ext}`;
  const storagePath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(storagePath, data);
  const size = data.byteLength;
  return { filename, storagePath, size };
}

export async function readAudioFile(storagePath: string): Promise<Buffer> {
  return fs.readFile(storagePath);
}

export async function deleteAudioFile(storagePath: string): Promise<void> {
  try {
    await fs.unlink(storagePath);
  } catch {
    // ignore missing file
  }
}

function guessExt(mime: string): string {
  switch (mime.toLowerCase()) {
    case "audio/mpeg":
    case "audio/mp3":
      return ".mp3";
    case "audio/mp4":
    case "audio/m4a":
    case "audio/x-m4a":
      return ".m4a";
    case "audio/ogg":
      return ".ogg";
    case "audio/webm":
      return ".webm";
    default:
      return ".wav";
  }
}

/** Estimate duration (seconds) of a WAV/PCM-ish file from its header. */
export function estimateWavDuration(
  buffer: Buffer,
  mimeType: string
): number {
  try {
    if (
      mimeType.toLowerCase().includes("wav") &&
      buffer.length > 44 &&
      buffer.toString("ascii", 0, 4) === "RIFF"
    ) {
      const sampleRate = buffer.readUInt32LE(24);
      const channels = buffer.readUInt16LE(22);
      const bitsPerSample = buffer.readUInt16LE(34);
      // Scan chunks to find "data" (headers vary — don't assume offset 40).
      let offset = 12;
      let dataSize = 0;
      while (offset + 8 <= buffer.length) {
        const id = buffer.toString("ascii", offset, offset + 4);
        const size = buffer.readUInt32LE(offset + 4);
        if (id === "data") {
          dataSize = size;
          break;
        }
        offset += 8 + size;
      }
      const bytesPerSample = (bitsPerSample || 16) / 8;
      const ch = channels || 1;
      if (dataSize > 0 && sampleRate > 0 && bytesPerSample > 0) {
        return dataSize / (sampleRate * bytesPerSample * ch);
      }
      // Fallback: whole file minus a nominal 44-byte header
      if (sampleRate > 0 && bytesPerSample > 0) {
        return (buffer.length - 44) / (sampleRate * bytesPerSample * ch);
      }
    }
  } catch {
    // fall through
  }
  // Rough fallback: assume 16kbps for compressed formats.
  return Math.max(buffer.length / 16000, 0);
}
