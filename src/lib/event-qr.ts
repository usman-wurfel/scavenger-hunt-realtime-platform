import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

import QRCode from "qrcode";

export async function deleteEventQrCodeFile(qrCodeUrl: string | null): Promise<void> {
  if (!qrCodeUrl?.startsWith("/uploads/qrCode/")) {
    return;
  }

  const filePath = path.join(process.cwd(), "public", qrCodeUrl);

  try {
    await unlink(filePath);
  } catch {
    // File may already be missing.
  }
}

export async function generateEventQrCode(eventCode: string): Promise<string> {
  const normalizedCode = eventCode.trim().toUpperCase();
  const buffer = await QRCode.toBuffer(normalizedCode, {
    type: "png",
    width: 512,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  const safeName = `event-${eventCode}-${Date.now()}.png`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "qrCode");

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, safeName), buffer);

  return `/uploads/qrCode/${safeName}`;
}
