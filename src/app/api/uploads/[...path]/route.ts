export { dynamic } from "@/lib/api-route";

import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function resolveUploadPath(parts: string[]): string | null {
  if (parts.length === 0) return null;

  const normalized = parts.map((part) => path.basename(part));
  if (normalized.some((part) => !part || part === "." || part === "..")) {
    return null;
  }

  const absolute = path.resolve(UPLOADS_ROOT, ...normalized);
  if (!absolute.startsWith(UPLOADS_ROOT + path.sep) && absolute !== UPLOADS_ROOT) {
    return null;
  }

  return absolute;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await context.params;
  const filePath = resolveUploadPath(parts);

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
  const file = await readFile(filePath);

  return new NextResponse(file, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
