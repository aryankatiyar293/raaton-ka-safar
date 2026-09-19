import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const STORAGE_ROOT = path.resolve(
  process.env.STORAGE_DIR || path.join(process.cwd(), "data"),
);

function normalizeKey(relKey: string): string {
  const key = relKey
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();

  if (!key || key.split("/").some((part) => part === "..")) {
    throw new Error("Invalid storage path");
  }

  return key;
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");

  if (lastDot === -1) {
    return `${relKey}_${hash}`;
  }

  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function getFullPath(key: string): string {
  const fullPath = path.resolve(STORAGE_ROOT, key);
  const rootWithSep = STORAGE_ROOT.endsWith(path.sep)
    ? STORAGE_ROOT
    : `${STORAGE_ROOT}${path.sep}`;

  if (fullPath !== STORAGE_ROOT && !fullPath.startsWith(rootWithSep)) {
    throw new Error("Invalid storage path");
  }

  return fullPath;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const fullPath = getFullPath(key);

  await fs.mkdir(path.dirname(fullPath), { recursive: true });

  const buffer =
    typeof data === "string" ? Buffer.from(data) : Buffer.from(data);

  await fs.writeFile(fullPath, buffer);

  return {
    key,
    url: `/media/${key}`,
  };
}

export async function storageGet(
  relKey: string,
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  return {
    key,
    url: `/media/${key}`,
  };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  return `/media/${key}`;
}